const { prisma } = require('../config/db');
const AppError = require('../utils/AppError');

// Junto com cada processo, devolve o nome do cliente e do responsável.
const incluirRelacoes = {
  cliente: { select: { id: true, nome: true } },
  usuarioResponsavel: { select: { id: true, nome: true } },
};

async function garantirClienteExiste(clienteId) {
  const cliente = await prisma.cliente.findUnique({ where: { id: clienteId } });
  if (!cliente) {
    throw new AppError(`Cliente ${clienteId} não existe`, 400);
  }
}

async function garantirNumeroLivre(numero, idAtual) {
  const existente = await prisma.processo.findUnique({ where: { numero } });
  if (existente && existente.id !== idAtual) {
    throw new AppError('Já existe um processo com esse número', 409);
  }
}

async function listar() {
  return prisma.processo.findMany({ orderBy: { id: 'asc' }, include: incluirRelacoes });
}

async function buscarPorId(id) {
  const processo = await prisma.processo.findUnique({ where: { id }, include: incluirRelacoes });
  if (!processo) {
    throw new AppError('Processo não encontrado', 404);
  }
  return processo;
}

// O responsável pelo processo é o usuário logado que o cadastrou.
async function criar(dados, usuarioId) {
  await garantirClienteExiste(dados.clienteId);
  await garantirNumeroLivre(dados.numero);

  return prisma.processo.create({
    data: { ...dados, usuarioId },
    include: incluirRelacoes,
  });
}

async function atualizar(id, dados) {
  await buscarPorId(id);
  if (dados.clienteId) await garantirClienteExiste(dados.clienteId);
  if (dados.numero) await garantirNumeroLivre(dados.numero, id);

  return prisma.processo.update({ where: { id }, data: dados, include: incluirRelacoes });
}

async function remover(id) {
  await buscarPorId(id);
  await prisma.processo.delete({ where: { id } });
}

module.exports = { listar, buscarPorId, criar, atualizar, remover };
