const express = require('express');
const processosController = require('../controllers/processos.controller');
const validate = require('../middlewares/validate');
const auth = require('../middlewares/auth');
const { processoCreateSchema, processoUpdateSchema } = require('../validators/processo.validator');

const router = express.Router();

// Todas as rotas de processos exigem login.
router.use(auth);

router.get('/', processosController.listar);
router.get('/:id', processosController.buscarPorId);
router.post('/', validate(processoCreateSchema), processosController.criar);
router.patch('/:id', validate(processoUpdateSchema), processosController.atualizar);
router.delete('/:id', processosController.remover);

module.exports = router;
