const { ZodError } = require('zod');
const AppError = require('../utils/AppError');

// Mensagens que escrevemos nos schemas já estão em português;
// estas são as mensagens padrão do Zod que ainda vêm em inglês.
function traduzirErroZod(e) {
  if (e.code === 'invalid_type' && e.received === 'undefined') return 'Campo obrigatório';
  if (e.code === 'invalid_type' && e.message.startsWith('Expected')) {
    return `Tipo inválido: esperado ${e.expected}`;
  }
  if (e.code === 'invalid_enum_value') return `Valor inválido. Use: ${e.options.join(', ')}`;
  return e.message;
}

function errorHandler(err, req, res, next) {
  if (err instanceof AppError) {
    return res.status(err.status).json({ erro: err.message });
  }

  if (err instanceof ZodError) {
    const detalhes = err.errors.map((e) => ({
      campo: e.path.join('.'),
      mensagem: traduzirErroZod(e),
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
