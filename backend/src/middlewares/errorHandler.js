const { ZodError } = require('zod');
const AppError = require('../utils/AppError');

function errorHandler(err, req, res, next) {
  if (err instanceof AppError) {
    return res.status(err.status).json({ erro: err.message });
  }

  if (err instanceof ZodError) {
    const detalhes = err.errors.map((e) => ({
      campo: e.path.join('.'),
      mensagem: e.message,
    }));
    return res.status(400).json({ erro: 'Dados inválidos', detalhes });
  }

  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ erro: 'JSON malformado no corpo da requisição' });
  }

  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(401).json({ erro: 'Token inválido ou expirado' });
  }

  if (err.code === 'P2002') {
    return res.status(409).json({ erro: 'Já existe um registro com esse valor único' });
  }

  if (err.code === 'P2025') {
    return res.status(404).json({ erro: 'Registro não encontrado' });
  }

  if (err.code === 'P2003') {
    return res.status(409).json({ erro: 'Operação viola uma relação entre tabelas' });
  }

  console.error(err);
  return res.status(500).json({ erro: 'Erro interno do servidor' });
}

module.exports = errorHandler;
