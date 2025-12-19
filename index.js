const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors'); 

const app = express();
app.use(cors()); 

const server = http.createServer(app);
const io = new Server(server, { 
    maxHttpBufferSize: 1e8,
    cors: { origin: "*", methods: ["GET", "POST"] }
}); 

app.use(express.urlencoded({ extended: true }));

let dbUsuarios = {}; 
let socketsMap = {}; 
let filaDeEspera = []; 
let historicoConversas = {}; 
let listaDenuncias = []; 

// 🚨 ADMIN: Senha de Acesso (SEGURANÇA CRÍTICA!)
const ADMIN_PASSWORD = '502700'; // <-- TROQUE ESTA SENHA POR UMA FORTE E REAL!

// Função auxiliar robusta para obter perfil
function getPerfil(nick) {
  const user = dbUsuarios[nick];
  if (!user) return null;
  return {
    nick: nick,
    nome: user.nome,
    bio: user.bio,
    idade: user.idade,
    genero: user.genero,
    fotoPrincipal: (user.fotos && user.fotos.length > 0) ? user.fotos[0] : null,
    fotos: user.fotos || [],
    online: !!user.socketId, 
    banido: user.banido || false,
    verificado: user.verificado || false,
    premium: user.premium || false,
    isAdmin: user.isAdmin || false,
  };
}

io.on('connection', (socket) => {
  console.log('Cliente:', socket.id);

  socket.on('login', ({ nick, password }) => { 
    const nickLimpo = nick.toLowerCase().replace('@', '').trim();
    
    // Login Admin
    if(nickLimpo === 'admin') {
        if (password !== ADMIN_PASSWORD) {
            return socket.emit('erro_login', 'ACESSO NEGADO: Senha incorreta.');
        }
        dbUsuarios['admin'] = { nick: 'admin', nome: 'Administrador', socketId: socket.id, isAdmin: true, bloqueados: [] };
        socketsMap[socket.id] = 'admin';
        socket.emit('login_sucesso', { nick: 'admin', isAdmin: true });
        return;
    }

    if (dbUsuarios[nickLimpo] && dbUsuarios[nickLimpo].banido) {
      return socket.emit('erro_login', 'CONTA SUSPENSA PELA ADMINISTRAÇÃO.');
    }

    if (!dbUsuarios[nickLimpo]) {
      dbUsuarios[nickLimpo] = {
        nick: nickLimpo,
        nome: nickLimpo,
        bio: '',
        genero: 'todos',
        idade: '18',
        fotos: [],
        fotoPrincipal: null,
        banido: false,
        socketId: null,
        isAdmin: false,
        bloqueados: []
      };
    }
    
    if (!dbUsuarios[nickLimpo].bloqueados) {
        dbUsuarios[nickLimpo].bloqueados = [];
    }

    dbUsuarios[nickLimpo].socketId = socket.id;
    socketsMap[socket.id] = nickLimpo;

    socket.emit('login_sucesso', getPerfil(nickLimpo));
    io.emit('atualizar_lista_ativos'); 
  });

  socket.on('atualizar_perfil', (dados) => {
    const meuNick = socketsMap[socket.id];
    if (meuNick && dbUsuarios[meuNick]) {
      const u = dbUsuarios[meuNick];
      u.nome = dados.nome;
      u.bio = dados.bio;
      u.idade = dados.idade;
      u.genero = dados.genero;
      u.fotos = dados.fotos;
      u.fotoPrincipal = dados.fotos.length > 0 ? dados.fotos[0] : null;

      socket.emit('perfil_salvo');
      io.emit('atualizar_lista_ativos'); 
    }
  });

  socket.on('procurar_parceiro', (minhaPreferencia) => {
    const meuNick = socketsMap[socket.id];
    if (!dbUsuarios[meuNick]) return;
    
    const meuUser = dbUsuarios[meuNick];
    
    // Antes de tudo, remove da fila se já estiver
    filaDeEspera = filaDeEspera.filter(s => s.id !== socket.id);

    const meuGenero = meuUser.genero || 'todos';
    let parceiroSocket = null;
    let indexRemover = -1;

    for (let i = 0; i < filaDeEspera.length; i++) {
      const candidatoSock = filaDeEspera[i];
      const nickCandidato = socketsMap[candidatoSock.id];
      const userCandidato = dbUsuarios[nickCandidato];
      
      if (!userCandidato || userCandidato.banido) continue;

      // BLOQUEIO MÚTUO
      const euBloqueei = meuUser.bloqueados.includes(nickCandidato);
      const eleMeBloqueou = userCandidato.bloqueados.includes(meuNick);
      
      if (euBloqueei || eleMeBloqueou) continue;

      const candidatoAtendeMinhaPref = (minhaPreferencia === 'todos') || (userCandidato.genero === minhaPreferencia);
      const prefDoCandidato = candidatoSock.preferenciaBusca || 'todos'; 
      const euAtendoPrefDele = (prefDoCandidato === 'todos') || (prefDoCandidato === meuGenero);

      if (candidatoAtendeMinhaPref && euAtendoPrefDele) {
         parceiroSocket = candidatoSock;
         indexRemover = i;
         break;
      }
    }

    if (parceiroSocket) {
      filaDeEspera.splice(indexRemover, 1);
      iniciarChat(socket, parceiroSocket);
    } else {
      socket.preferenciaBusca = minhaPreferencia; 
      filaDeEspera.push(socket);
      socket.emit('adicionado_fila', 'Buscando...');
    }
  });
  
  // NOVO: Cancelar busca
  socket.on('cancelar_busca', () => {
    filaDeEspera = filaDeEspera.filter(s => s.id !== socket.id);
    socket.emit('busca_cancelada');
  });


  function iniciarChat(sock1, sock2) {
    const idSala = [sock1.id, sock2.id].sort().join("#");
    sock1.join(idSala);
    sock2.join(idSala);
    if (!historicoConversas[idSala]) historicoConversas[idSala] = [];

    const n1 = socketsMap[sock1.id];
    const n2 = socketsMap[sock2.id];
    
    io.to(sock1.id).emit('novo_contato', { ...getPerfil(n2), idSala, idParceiro: sock2.id });
    io.to(sock2.id).emit('novo_contato', { ...getPerfil(n1), idSala, idParceiro: sock1.id });
  }

  socket.on('iniciar_conversa_direta', (nickAlvo) => {
    const alvo = dbUsuarios[nickAlvo];
    const meuNick = socketsMap[socket.id];
    const meuUser = dbUsuarios[meuNick];
    const alvoUser = dbUsuarios[nickAlvo];

    // Verifica bloqueio antes de iniciar conversa direta
    const euBloqueei = meuUser.bloqueados.includes(nickAlvo);
    const eleMeBloqueou = alvoUser.bloqueados.includes(meuNick);

    if (euBloqueei || eleMeBloqueou) {
        return socket.emit('erro_chat', 'Não é possível iniciar conversa: Usuário bloqueado.');
    }

    if(alvo && alvo.socketId) {
        const sockAlvo = io.sockets.sockets.get(alvo.socketId);
        if(sockAlvo) iniciarChat(socket, sockAlvo);
    }
  });

  socket.on('enviar_mensagem', (dados) => {
    if (!historicoConversas[dados.room]) historicoConversas[dados.room] = [];
    historicoConversas[dados.room].push(dados);
    if(historicoConversas[dados.room].length > 50) historicoConversas[dados.room].shift();

    socket.to(dados.room).emit('nova_mensagem', { ...dados, sender: 'eles' });
  });

  socket.on('marcar_lida', ({ room, msgId }) => {
     socket.to(room).emit('mensagem_foi_lida', { msgId, room });
  });

  socket.on('pedir_comunidade', (termo) => {
      let r = [];
      const t = termo ? termo.toLowerCase() : '';
      for(let k in dbUsuarios) {
          const u = dbUsuarios[k];
          if(u.nick !== 'admin' && (!t || u.nick.includes(t))) {
              r.push(getPerfil(k));
          }
      }
      r.sort((a, b) => (b.online - a.online)); 
      socket.emit('resultado_comunidade', r);
      
      const meuNick = socketsMap[socket.id];
      if (meuNick && dbUsuarios[meuNick]) {
          socket.emit('minha_lista_bloqueio', dbUsuarios[meuNick].bloqueados);
      }
  });

  socket.on('reportar_usuario', (dados) => {
      const meuNick = socketsMap[socket.id];
      const logs = historicoConversas[dados.idSala] ? historicoConversas[dados.idSala].slice(-20) : [];
      listaDenuncias.push({
          id: Date.now().toString(),
          denunciante: meuNick,
          denunciado: dados.denunciadoNick,
          motivo: dados.motivo,
          logs: logs,
          data: new Date().toISOString()
      });
  });
  
  socket.on('bloquear_usuario', ({ alvoNick, bloquear }) => {
      const meuNick = socketsMap[socket.id];
      if (!meuNick || !dbUsuarios[meuNick]) return;
      
      const minhaConta = dbUsuarios[meuNick];
      
      if (bloquear) {
          if (!minhaConta.bloqueados.includes(alvoNick)) {
              minhaConta.bloqueados.push(alvoNick);
              
              // Encerra o chat se estiver ativo
              if (dbUsuarios[alvoNick] && dbUsuarios[alvoNick].socketId) {
                  const socketAlvo = dbUsuarios[alvoNick].socketId;
                  const roomID = [socket.id, socketAlvo].sort().join("#");
                  io.to(socket.id).emit('encerrar_chat_sala', roomID);
                  io.to(socketAlvo).emit('encerrar_chat_sala', roomID);
              }
          }
      } else {
          minhaConta.bloqueados = minhaConta.bloqueados.filter(n => n !== alvoNick);
      }
      
      socket.emit('bloqueio_confirmado', { alvoNick, bloqueado: bloquear });
  });


  // Admin Web
  
  socket.on('admin_enviar_aviso_privado', ({ alvoNick, mensagem }) => {
      const meuNick = socketsMap[socket.id];
      if (meuNick !== 'admin') return; 

      const alvo = dbUsuarios[alvoNick];
      if(alvo && alvo.socketId) {
          io.to(alvo.socketId).emit('alerta_privado', { 
              msg: `⚠️ Aviso da Administração: ${mensagem}` 
          });
          socket.emit('admin_confirmacao');
      }
  });
  
  socket.on('admin_obter_dados', () => {
      let users = [];
      for(let k in dbUsuarios) if(k !== 'admin') users.push(getPerfil(k));
      socket.emit('admin_dados_recebidos', { usuarios: users, denuncias: listaDenuncias });
  });

  socket.on('admin_acao', ({ alvoNick, acao, valor }) => {
      const meuNick = socketsMap[socket.id];
      if (meuNick !== 'admin') return; 
      
      const alvo = dbUsuarios[alvoNick];
      if(!alvo) return;
      if(acao === 'banir') {
          alvo.banido = valor;
          if(valor && alvo.socketId) {
              const s = io.sockets.sockets.get(alvo.socketId);
              if(s) { s.emit('foi_expulso', 'Conta suspensa.'); s.disconnect(); }
          }
      }
      if(acao === 'verificado') alvo.verificado = valor;
      if(acao === 'premium') alvo.premium = valor;
      if(acao === 'limpar_foto') { alvo.fotos = []; alvo.fotoPrincipal = null; }

      io.emit('atualizar_lista_ativos'); 
      socket.emit('admin_confirmacao');
  });

  socket.on('admin_resolver_report', (id) => {
      const meuNick = socketsMap[socket.id];
      if (meuNick !== 'admin') return;
      
      listaDenuncias = listaDenuncias.filter(d => d.id !== id);
      socket.emit('admin_confirmacao');
  });

  socket.on('admin_broadcast', (msg) => {
      const meuNick = socketsMap[socket.id];
      if (meuNick !== 'admin') return;
      
      io.emit('alerta_global', msg)
  });
  
  socket.on('disconnect', () => {
    const nickDesconectado = socketsMap[socket.id];
    
    if (nickDesconectado && dbUsuarios[nickDesconectado]) {
        dbUsuarios[nickDesconectado].socketId = null;
    }
    
    delete socketsMap[socket.id];
    filaDeEspera = filaDeEspera.filter(s => s.id !== socket.id);
    
    io.emit('atualizar_lista_ativos'); 
  });
});

server.listen(3000, () => console.log('Server V15 (Block User + Status Fix) on 3000'));