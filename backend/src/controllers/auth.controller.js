const authService = require('../services/auth.service');

async function register(req, res) {
  const usuario = await authService.register(req.body);
  res.status(201).json(usuario);
}

async function login(req, res) {
  const resultado = await authService.login(req.body);
  res.status(200).json(resultado);
}

// req.usuario foi preenchido pelo middleware de autenticação.
async function me(req, res) {
  const usuario = await authService.buscarUsuario(req.usuario.id);
  res.status(200).json(usuario);
}

module.exports = { register, login, me };
