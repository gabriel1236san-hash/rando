// backend/models/User.js
const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  nick: { type: String, required: true, unique: true },
  // NOVO: Adicionar campo para a senha hasheada
  senha: { type: String, required: true },
  // ---------------------------------------------
  nome: String,
  bio: { type: String, default: '' },
  idade: { type: String, default: '18' },
  genero: { type: String, default: 'todos' },
  fotos: { type: [String], default: [] },
  fotoPrincipal: { type: String, default: null },
  bloqueados: { type: [String], default: [] },
  banido: { type: Boolean, default: false },
  verificado: { type: Boolean, default: false },
  premium: { type: Boolean, default: false },
  isAdmin: { type: Boolean, default: false },
  // NOVOS CAMPOS PARA A ROLETA:
  buscando: { type: Boolean, default: false }, // Está na fila?
  preferenciaBusca: { type: String, default: 'todos' }, // O que ele quer encontrar?
  // Controle do Sistema
  socketId: { type: String, default: null },
  online: { type: Boolean, default: false },
  pushToken: { type: String } // NOVO: Para notificações push
});

module.exports = mongoose.model('User', UserSchema);