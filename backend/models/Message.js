const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
    room: String,      // ID da sala (ex: Gabriel_Lucas)
    chatId: String,    // Campo redundante necessário para sua validação
    content: String,   // O texto ou a URL da imagem
    type: String,      // 'text' ou 'image'
    origin: String,    // 'camera' ou 'gallery' (NOVO)
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    timestamp: { type: Date, default: Date.now },
    lido: { type: Boolean, default: false }
});

module.exports = mongoose.model('Message', MessageSchema);