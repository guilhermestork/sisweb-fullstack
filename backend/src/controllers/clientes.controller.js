const clientesService = require('../services/clientes.service');
const { idParamSchema } = require('../validators/comum.validator');

async function listar(req, res) {
  const clientes = await clientesService.listar();
  res.status(200).json(clientes);
}

async function buscarPorId(req, res) {
  const { id } = idParamSchema.parse(req.params);
  const cliente = await clientesService.buscarPorId(id);
  res.status(200).json(cliente);
}

async function criar(req, res) {
  const cliente = await clientesService.criar(req.body);
  res.status(201).json(cliente);
}

module.exports = { listar, buscarPorId, criar };
