// backend/index.js (Atualizado)

require('dotenv').config(); 
const express = require('express');
const mongoose = require('mongoose');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors'); 
const setupSocketLogic = require('./socketLogic'); 

const app = express();
app.use(cors()); 

// --- CONEXÃO COM O MONGODB USANDO VARIÁVEL DE AMBIENTE ---
// A credencial agora vem do arquivo .env
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ Conectado ao MongoDB com sucesso!'))
  .catch((err) => console.error('❌ Erro ao conectar no MongoDB:', err));
// ------------------------------------

const server = http.createServer(app);

// Configuração do Socket.IO (Mantendo igual ao seu original)
const io = new Server(server, { 
    maxHttpBufferSize: 1e8,
    cors: { origin: "*", methods: ["GET", "POST"] }
}); 

app.use(express.urlencoded({ extended: true }));

// Inicia a lógica do chat
setupSocketLogic(io);

// Usa a variável de ambiente para a porta ou 3000 como fallback
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`✅ Servidor Rodando na porta ${PORT}`));