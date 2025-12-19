import io from 'socket.io-client';

// 🔴 ATENÇÃO: SUBSTITUA PELO SEU IPV4 ATUAL
const API_URL = 'http://192.168.3.5:3000'; 

export const socket = io(API_URL, {
    transports: ['websocket'], // Importante para Android
    autoConnect: false,
    reconnection: true,        // Tenta reconectar se cair
    reconnectionAttempts: 5,
});