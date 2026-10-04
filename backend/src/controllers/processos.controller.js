const processosService = require('../services/processos.service');
const { idParamSchema } = require('../validators/comum.validator');

async function listar(req, res) {
  const processos = await processosService.listar();
  res.status(200).json(processos);
}

async function buscarPorId(req, res) {
  const { id } = idParamSchema.parse(req.params);
  const processo = await processosService.buscarPorId(id);
  res.status(200).json(processo);
}

async function criar(req, res) {
  const processo = await processosService.criar(req.body, req.usuario.id);
  res.status(201).json(processo);
}

async function atualizar(req, res) {
  const { id } = idParamSchema.parse(req.params);
  const processo = await processosService.atualizar(id, req.body);
  res.status(200).json(processo);
}

async function remover(req, res) {
  const { id } = idParamSchema.parse(req.params);
  await processosService.remover(id);
  res.status(204).send();
}

module.exports = { listar, buscarPorId, criar, atualizar, remover };
