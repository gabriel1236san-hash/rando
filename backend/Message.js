// backend/models/Message.js
const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  idSala: { type: String, required: true, index: true }, // Para buscar o histórico da sala
  remetente: { type: String, required: true, index: true }, // Nick de quem enviou
  conteudo: { type: String, required: true }, // O texto ou a URL da imagem
  tipo: { type: String, default: 'text' }, // 'text' ou 'image'
  origem: { type: String }, // 'camera', 'gallery', etc.
  lido: { type: Boolean, default: false },
}, {
  timestamps: true // Adiciona os campos `createdAt` e `updatedAt`
});

module.exports = mongoose.model('Message', MessageSchema);