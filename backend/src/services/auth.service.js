const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { prisma } = require('../config/db');
const AppError = require('../utils/AppError');

// Campos do usuário que podem sair da API. O senhaHash nunca sai.
const usuarioPublico = { id: true, nome: true, email: true, criadoEm: true };

async function register({ nome, email, senha }) {
  const existente = await prisma.usuario.findUnique({ where: { email } });
  if (existente) {
    throw new AppError('E-mail já cadastrado', 409);
  }

  const senhaHash = await bcrypt.hash(senha, 10);

  return prisma.usuario.create({
    data: { nome, email, senhaHash },
    select: usuarioPublico,
  });
}

async function login({ email, senha }) {
  const usuario = await prisma.usuario.findUnique({ where: { email } });

  // Mesma mensagem para e-mail inexistente e senha errada:
  // assim ninguém descobre quais e-mails estão cadastrados.
  const senhaConfere = usuario && (await bcrypt.compare(senha, usuario.senhaHash));
  if (!senhaConfere) {
    throw new AppError('E-mail ou senha inválidos', 401);
  }

  const token = jwt.sign({ id: usuario.id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '1d',
  });

  return {
    token,
    usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email },
  };
}

async function buscarUsuario(id) {
  const usuario = await prisma.usuario.findUnique({ where: { id }, select: usuarioPublico });
  if (!usuario) {
    throw new AppError('Usuário não encontrado', 404);
  }
  return usuario;
}

module.exports = { register, login, buscarUsuario };
