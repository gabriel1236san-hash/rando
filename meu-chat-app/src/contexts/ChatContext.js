import React, { createContext, useState, useEffect, useRef, useContext } from 'react';
import { Alert, AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Audio } from 'expo-av';
import { socket } from '../config';

export const ChatContext = createContext({});

const appendMensagemManual = (listaExistente, novaMsg) => {
    return [novaMsg, ...(listaExistente || [])];
};

export function ChatProvider({ children }) {
    const [faseApp, setFaseApp] = useState('boasvindas');
    const [logado, setLogado] = useState(false);

    // DADOS USUÁRIO
    const [meuNick, setMeuNick] = useState('');
    const [meuNome, setMeuNome] = useState('');
    const [minhaBio, setMinhaBio] = useState('');
    const [minhaIdade, setMinhaIdade] = useState('18');
    const [meuGenero, setMeuGenero] = useState('masculino');
    const [minhasFotos, setMinhasFotos] = useState([null, null, null, null]);
    const [souAdmin, setSouAdmin] = useState(false);
    const [minhaListaBloqueio, setMinhaListaBloqueio] = useState([]);

    // DADOS APP
    const [preferenciaBusca, setPreferenciaBusca] = useState('todos');
    const [buscando, setBuscando] = useState(false);
    const [contatos, setContatos] = useState([]);
    const [todosPerfis, setTodosPerfis] = useState([]); 
    const [mensagensPorSala, setMensagensPorSala] = useState({});
    const [chatAtivo, setChatAtivo] = useState(null);
    
    const appState = useRef(AppState.currentState);
    const somRef = useRef(null);

    async function carregarSom() {
        try {
            await Audio.setAudioModeAsync({
                allowsRecordingIOS: false,
                playsInSilentModeIOS: true,
                shouldDuckAndroid: true,
                staysActiveInBackground: false,
            });
            const { sound } = await Audio.Sound.createAsync(require('../../assets/notification.mp3'));
            somRef.current = sound;
        } catch (e) {}
    }

    async function playSound() {
        if (somRef.current) {
            try { await somRef.current.stopAsync(); await somRef.current.playAsync(); } catch (e) { }
        }
    }

    async function registrarToken() {
        try {
            const { status } = await Notifications.getPermissionsAsync();
            if (status === 'granted') {
                const tokenData = await Notifications.getExpoPushTokenAsync();
                socket.emit('salvar_push_token', tokenData.data);
            }
        } catch (e) {}
    }

    useEffect(() => {
        carregarSom();

        const checkStoredLogin = async () => {
            try {
                const nick = await AsyncStorage.getItem('userNick');
                const password = await AsyncStorage.getItem('userPassword');
                if (nick && password) {
                    if (!socket.connected) socket.connect();
                    socket.emit('login', { nick, password });
                } else {
                    setFaseApp('login');
                }
            } catch { setFaseApp('login'); }
        };

        if (faseApp === 'boasvindas') setTimeout(checkStoredLogin, 1000);

        const subscription = AppState.addEventListener('change', nextAppState => {
            if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
                if (logado) {
                    socket.emit('pedir_comunidade', '');
                    socket.emit('recuperar_chats_antigos');
                }
            }
            appState.current = nextAppState;
        });

        // --- LISTENERS ---

        socket.on('login_sucesso', async (d) => {
            setLogado(true);
            setFaseApp('app');
            setMeuNick(d.nick);
            setSouAdmin(d.isAdmin);
            if (d.nome) {
                setMeuNome(d.nome);
                setMeuGenero(d.genero);
                setMinhaIdade(d.idade);
                setMinhasFotos(d.fotos || []);
            }
            setMinhaListaBloqueio(d.bloqueados || []);
            await AsyncStorage.setItem('userNick', d.nick);
            registrarToken();
            socket.emit('recuperar_chats_antigos');
            socket.emit('pedir_comunidade', '');
        });

        // Listener para confirmação de perfil salvo
        socket.on('perfil_atualizado_sucesso', (user) => {
            Alert.alert("Sucesso", "Perfil atualizado!");
            // Atualiza os estados locais para garantir sincronia
            setMeuNome(user.nome);
            setMinhaBio(user.bio);
            setMinhaIdade(user.idade.toString());
            setMeuGenero(user.genero);
            setMinhasFotos(user.fotos);
        });

        socket.on('erro_login', (m) => {
            Alert.alert('Erro', m);
            logout();
        });

        socket.on('resultado_comunidade', (lista) => {
            setTodosPerfis(lista || []);
        });

        socket.on('historico_conversa', ({ chatId, mensagens }) => {
            const msgsFormatadas = mensagens.map(m => ({
                id: m._id,
                content: m.content,
                type: m.type,
                origin: m.origin,
                timestamp: m.timestamp,
                lido: m.lido, // IMPORTANTE: Pegar o status do banco
                sender: m.senderId.nick === meuNick ? 'eu' : 'eles'
            }));
            
            setMensagensPorSala(prev => ({ 
                ...prev, 
                [chatId]: msgsFormatadas.reverse() 
            }));
        });

        // 🔥 OUVINTE DE LEITURA (CHECK DUPLO)
        socket.on('confirmacao_leitura', ({ msgId, room }) => {
            setMensagensPorSala(prev => {
                const salaMsgs = prev[room] || [];
                // Cria um novo array com a mensagem específica atualizada
                const novasMsgs = salaMsgs.map(m => 
                    m.id === msgId ? { ...m, lido: true } : m
                );
                return { ...prev, [room]: novasMsgs };
            });
        });

        socket.on('adicionar_na_lista_contatos', (c) => {
            setContatos(prev => {
                if (prev.find(i => i.idSala === c.idSala)) return prev;
                return [c, ...prev];
            });
        });

        socket.on('novo_chat_iniciado', (c) => {
            setBuscando(false);
            setContatos(prev => {
                if (prev.find(i => i.idSala === c.idSala)) return prev;
                return [c, ...prev];
            });
            setChatAtivo(c);
        });

        socket.on('nova_mensagem', (msg) => {
            if (msg.remetenteNick && meuNick && msg.remetenteNick.toLowerCase() === meuNick.toLowerCase()) return;

            const novaMsg = {
                id: msg._id || Math.random().toString(),
                content: msg.content,
                type: msg.type,
                origin: msg.origin,
                sender: 'eles',
                lido: false,
                timestamp: msg.timestamp || new Date()
            };

            setMensagensPorSala(prev => ({ 
                ...prev, 
                [msg.room]: appendMensagemManual(prev[msg.room], novaMsg)
            }));
            
            if (appState.current === 'active') playSound();
        });

        socket.on('adicionado_fila', () => setBuscando(true));
        socket.on('busca_cancelada', () => setBuscando(false));

        return () => {
            socket.removeAllListeners();
            subscription.remove();
        };
    }, [logado, faseApp, meuNick]);

    const fazerLogin = (nick, password) => {
        socket.connect();
        socket.emit('login', { nick, password });
        AsyncStorage.setItem('userPassword', password);
    };

    const enviarMsg = (txt, type = 'text', origin = 'app') => {
        if (!chatAtivo) return;
        
        const mLocal = { 
            id: Date.now().toString(), 
            content: txt, 
            type: type, 
            origin: origin,
            sender: 'eu',
            lido: false, // Começa como não lido
            timestamp: new Date().toISOString() 
        };

        setMensagensPorSala(p => ({ 
            ...p, 
            [chatAtivo.idSala]: appendMensagemManual(p[chatAtivo.idSala], mLocal) 
        }));
        
        socket.emit('enviar_mensagem', { content: txt, type, origin, room: chatAtivo.idSala });
    };

    const salvarPerfil = () => {
        // Agora só emite, a confirmação vem no socket.on('perfil_atualizado_sucesso')
        socket.emit('atualizar_perfil', { nome: meuNome, bio: minhaBio, idade: minhaIdade, genero: meuGenero, fotos: minhasFotos.filter(x => x) });
    };

    const bloquear = (nick) => {
        const ja = minhaListaBloqueio.includes(nick);
        setMinhaListaBloqueio(p => ja ? p.filter(n => n !== nick) : [...p, nick]);
        socket.emit('bloquear_usuario', { alvoNick: nick, bloquear: !ja });
    };

    const logout = () => {
        AsyncStorage.clear();
        socket.disconnect();
        setLogado(false);
        setMeuNick('');
        setMeuNome('');
        setContatos([]);
        setMensagensPorSala({});
        setTodosPerfis([]);
        setChatAtivo(null);
        setMinhaListaBloqueio([]);
        setMinhasFotos([null, null, null, null]);
        setFaseApp('login');
    };

    return (
        <ChatContext.Provider value={{
            logado, faseApp, contatos, mensagensPorSala, chatAtivo, todosPerfis,
            meuNick, meuNome, minhaBio, minhaIdade, meuGenero, minhasFotos,
            buscando, preferenciaBusca, minhaListaBloqueio,
            setChatAtivo, setMeuNome, setMinhaBio, setMinhaIdade, setMeuGenero,
            setMinhasFotos, setPreferenciaBusca, setBuscando,
            fazerLogin, enviarMsg, bloquear, salvarPerfil, logout, socket
        }}>
            {children}
        </ChatContext.Provider>
    );
}

export const useChat = () => useContext(ChatContext);