const { prisma } = require('../config/db');
const AppError = require('../utils/AppError');

async function listar() {
  return prisma.cliente.findMany({
    orderBy: { nome: 'asc' },
    include: { _count: { select: { processos: true } } },
  });
}

async function buscarPorId(id) {
  const cliente = await prisma.cliente.findUnique({
    where: { id },
    include: {
      processos: { select: { id: true, numero: true, status: true }, orderBy: { id: 'asc' } },
    },
  });
  if (!cliente) {
    throw new AppError('Cliente não encontrado', 404);
  }
  return cliente;
}

async function criar(dados) {
  const existente = await prisma.cliente.findUnique({ where: { cpf: dados.cpf } });
  if (existente) {
    throw new AppError('Já existe um cliente com esse CPF', 409);
  }
  return prisma.cliente.create({ data: dados });
}

module.exports = { listar, buscarPorId, criar };
