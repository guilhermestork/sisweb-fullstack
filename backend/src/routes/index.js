const express = require('express');
const authRoutes = require('./auth.routes');
const clientesRoutes = require('./clientes.routes');
const processosRoutes = require('./processos.routes');

const router = express.Router();

router.get('/health', (req, res) => res.status(200).json({ status: 'ok' }));
router.use('/auth', authRoutes);
router.use('/clientes', clientesRoutes);
router.use('/processos', processosRoutes);

module.exports = router;
