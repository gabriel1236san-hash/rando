const User = require('./models/User');
const Message = require('./models/Message');

module.exports = (io) => {
    let connectedUsers = {}; // socket.id -> nick
    let filaBusca = []; 

    io.on('connection', (socket) => {
        console.log(`🔌 Socket conectado: ${socket.id}`);

        // --- LOGIN ---
        socket.on('login', async ({ nick, password }) => {
            try {
                let user = await User.findOne({ nick });

                if (user) {
                    if (user.senha !== password) return socket.emit('erro_login', 'Senha incorreta.');
                    user.online = true;
                    user.lastOnline = new Date();
                    user.socketId = socket.id;
                    await user.save();
                } else {
                    user = new User({
                        nick, senha: password, nome: nick,
                        online: true, lastOnline: new Date(), socketId: socket.id,
                        fotos: [null, null, null, null], bio: '', idade: '18', genero: 'masculino', bloqueados: []
                    });
                    await user.save();
                }

                connectedUsers[socket.id] = nick;
                socket.join(nick);

                socket.emit('login_sucesso', {
                    nick: user.nick, nome: user.nome, isAdmin: user.isAdmin,
                    fotos: user.fotos, bio: user.bio, idade: user.idade, genero: user.genero, bloqueados: user.bloqueados || []
                });
                
                io.emit('atualizar_lista_ativos'); 

            } catch (e) {
                console.error("Erro Login:", e);
                socket.emit('erro_login', 'Erro interno.');
            }
        });

        // --- RECUPERAR CHATS ANTIGOS ---
        socket.on('recuperar_chats_antigos', async () => {
            const meuNick = connectedUsers[socket.id];
            if (!meuNick) return;

            try {
                const eu = await User.findOne({ nick: meuNick });
                
                // Busca salas onde sou remetente OU destinatário ou parte do nome da sala
                const salas = await Message.find({
                    $or: [{ senderId: eu._id }, { room: { $regex: meuNick } }]
                }).distinct('room');

                for (const sala of salas) {
                    socket.join(sala); 
                    
                    const partes = sala.split('_');
                    const outroNick = partes.find(n => n !== meuNick);
                    
                    if (outroNick) {
                        const outroUser = await User.findOne({ nick: outroNick });
                        if (outroUser) {
                            socket.emit('adicionar_na_lista_contatos', {
                                idSala: sala,
                                nick: outroUser.nick,
                                nome: outroUser.nome,
                                fotoPrincipal: outroUser.fotoPrincipal,
                                online: outroUser.online
                            });
                        }
                    }
                }
            } catch (e) {
                console.error("Erro recuperar chats:", e);
            }
        });

        // --- INICIAR CONVERSA (CORRIGIDO: AVISA OS DOIS LADOS) ---
        socket.on('iniciar_conversa_direta', async (alvoNick) => {
            const meuNick = connectedUsers[socket.id];
            if (!meuNick) return;

            const idSala = [meuNick, alvoNick].sort().join('_');
            socket.join(idSala); // Entro na sala

            const alvo = await User.findOne({ nick: alvoNick });
            const eu = await User.findOne({ nick: meuNick });

            if (alvo && eu) {
                // 1. AVISA O ALVO (Se estiver online)
                if (alvo.socketId) {
                    const socketAlvo = io.sockets.sockets.get(alvo.socketId);
                    if (socketAlvo) {
                        socketAlvo.join(idSala); // Força ele entrar na sala
                        // Força ele a atualizar a lista de contatos na hora
                        socketAlvo.emit('novo_chat_iniciado', {
                            idSala,
                            nick: eu.nick,
                            nome: eu.nome,
                            fotos: eu.fotos, 
                            fotoPrincipal: eu.fotoPrincipal,
                            online: eu.online
                        });
                    }
                }

                // 2. AVISA EU MESMO (Para abrir a tela)
                socket.emit('novo_chat_iniciado', {
                    idSala,
                    nick: alvo.nick,
                    nome: alvo.nome,
                    fotos: alvo.fotos, 
                    fotoPrincipal: alvo.fotoPrincipal,
                    online: alvo.online
                });
            }
        });

        // --- ENVIAR MENSAGEM (GARANTIA DE LISTA) ---
        socket.on('enviar_mensagem', async (msgData) => {
            const remetenteNick = connectedUsers[socket.id];
            if (!remetenteNick) return;

            try {
                const user = await User.findOne({ nick: remetenteNick });
                
                const novaMsg = new Message({
                    chatId: msgData.room, 
                    room: msgData.room,
                    content: msgData.content,
                    type: msgData.type,
                    origin: msgData.origin, 
                    senderId: user._id,
                    timestamp: new Date(),
                    lido: false
                });
                await novaMsg.save();

                const msgPayload = {
                    _id: novaMsg._id,
                    room: msgData.room,
                    content: novaMsg.content,
                    type: novaMsg.type,
                    origin: novaMsg.origin,
                    timestamp: novaMsg.timestamp,
                    remetenteNick: remetenteNick,
                    lido: false
                };

                // Envia a mensagem para a sala
                io.to(msgData.room).emit('nova_mensagem', msgPayload);

                // --- CORREÇÃO EXTRA: GARANTIR QUE APARECE NA LISTA ---
                // Se a pessoa receber a mensagem mas não tiver o chat na lista,
                // enviamos um evento para forçar a adição.
                const partes = msgData.room.split('_');
                const destinatarioNick = partes.find(n => n !== remetenteNick);
                
                if (destinatarioNick) {
                    const destUser = await User.findOne({ nick: destinatarioNick });
                    // Se o destinatário estiver online
                    if (destUser && destUser.socketId) {
                        const socketDest = io.sockets.sockets.get(destUser.socketId);
                        if (socketDest) {
                            // Envia os dados do REMETENTE para o DESTINATÁRIO adicionar na lista
                            socketDest.emit('adicionar_na_lista_contatos', {
                                idSala: msgData.room,
                                nick: user.nick,
                                nome: user.nome,
                                fotoPrincipal: user.fotoPrincipal,
                                online: true
                            });
                        }
                    }
                }

            } catch (e) {
                console.error("Erro salvar msg:", e);
            }
        });

        // --- BUSCAR PARCEIRO ---
        socket.on('procurar_parceiro', async (preferencia) => {
            const nick = connectedUsers[socket.id];
            if (!nick) return;
            const me = await User.findOne({ nick });

            filaBusca = filaBusca.filter(u => u.nick !== nick);

            const matchIndex = filaBusca.findIndex(outro => {
                const matchMeu = (preferencia === 'todos') || (preferencia === outro.genero);
                const matchDele = (outro.preferencia === 'todos') || (outro.preferencia === me.genero);
                return matchMeu && matchDele;
            });

            if (matchIndex >= 0) {
                const parceiro = filaBusca[matchIndex];
                filaBusca.splice(matchIndex, 1);

                const idSala = [nick, parceiro.nick].sort().join('_');
                socket.join(idSala);
                
                const socketParceiro = io.sockets.sockets.get(parceiro.socketId);
                if (socketParceiro) socketParceiro.join(idSala);

                const dadosParceiro = await User.findOne({ nick: parceiro.nick });

                const payloadEu = { idSala, nick: dadosParceiro.nick, nome: dadosParceiro.nome, fotos: dadosParceiro.fotos, fotoPrincipal: dadosParceiro.fotoPrincipal, online: true };
                const payloadEle = { idSala, nick: me.nick, nome: me.nome, fotos: me.fotos, fotoPrincipal: me.fotoPrincipal, online: true };

                socket.emit('novo_chat_iniciado', payloadEu);
                if (socketParceiro) socketParceiro.emit('novo_chat_iniciado', payloadEle);

            } else {
                filaBusca.push({ socketId: socket.id, nick, genero: me.genero, preferencia });
                socket.emit('adicionado_fila');
            }
        });

        socket.on('cancelar_busca', () => {
            const nick = connectedUsers[socket.id];
            filaBusca = filaBusca.filter(u => u.nick !== nick);
            socket.emit('busca_cancelada');
        });

        // --- COMUNIDADE ---
        socket.on('pedir_comunidade', async () => {
            const tempo = new Date(Date.now() - 30 * 60 * 1000);
            const users = await User.find({ $or: [{online:true}, {lastOnline: {$gte: tempo}}], nick: {$ne: 'admin'} })
                .select('nick nome idade fotos fotoPrincipal online lastOnline verificado premium bio banido')
                .sort({online:-1, lastOnline:-1}).limit(50);
            socket.emit('resultado_comunidade', users);
        });

        socket.on('pedir_historico', async (idSala) => {
            const msgs = await Message.find({ room: idSala }).sort({ timestamp: -1 }).limit(50).populate('senderId', 'nick');
            socket.emit('historico_conversa', { chatId: idSala, mensagens: msgs });
        });

        socket.on('marcar_lida', async ({ room, msgId }) => {
            await Message.findByIdAndUpdate(msgId, { lido: true });
            io.to(room).emit('confirmacao_leitura', { msgId, room });
        });

        socket.on('atualizar_perfil', async (d) => {
            const nick = connectedUsers[socket.id];
            const u = await User.findOneAndUpdate({ nick }, { nome: d.nome, bio: d.bio, idade: d.idade, genero: d.genero, fotos: d.fotos, fotoPrincipal: d.fotos[0] }, { new: true });
            socket.emit('perfil_atualizado_sucesso', u);
            io.emit('atualizar_lista_ativos');
        });

        socket.on('disconnect', async () => {
            const nick = connectedUsers[socket.id];
            filaBusca = filaBusca.filter(u => u.nick !== nick);
            if (nick) {
                await User.findOneAndUpdate({ nick }, { online: false, lastOnline: new Date() });
                delete connectedUsers[socket.id];
                io.emit('atualizar_lista_ativos');
            }
            console.log(`Socket desconectado: ${socket.id}`);
        });
    });
};