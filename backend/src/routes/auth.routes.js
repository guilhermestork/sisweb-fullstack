const express = require('express');
const authController = require('../controllers/auth.controller');
const validate = require('../middlewares/validate');
const auth = require('../middlewares/auth');
const { registerSchema, loginSchema } = require('../validators/auth.validator');

const router = express.Router();

router.post('/register', validate(registerSchema), authController.register);
router.post('/login', validate(loginSchema), authController.login);
router.get('/me', auth, authController.me);

module.exports = router;
