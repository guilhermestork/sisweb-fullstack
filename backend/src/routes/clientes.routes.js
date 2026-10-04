const express = require('express');
const clientesController = require('../controllers/clientes.controller');
const validate = require('../middlewares/validate');
const auth = require('../middlewares/auth');
const { clienteCreateSchema } = require('../validators/cliente.validator');

const router = express.Router();

// Todas as rotas de clientes exigem login.
router.use(auth);

router.get('/', clientesController.listar);
router.get('/:id', clientesController.buscarPorId);
router.post('/', validate(clienteCreateSchema), clientesController.criar);

module.exports = router;
