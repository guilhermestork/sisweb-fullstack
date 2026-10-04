const jwt = require('jsonwebtoken');
const AppError = require('../utils/AppError');

// Exige o cabeçalho "Authorization: Bearer <token>".
// Se o token for válido, guarda o usuário em req.usuario e deixa passar.
function auth(req, res, next) {
  const [tipo, token] = (req.headers.authorization || '').split(' ');

  if (tipo !== 'Bearer' || !token) {
    throw new AppError('Token não informado', 401);
  }

  // Se o token for inválido ou estiver vencido, jwt.verify lança um erro,
  // e o errorHandler responde 401.
  const payload = jwt.verify(token, process.env.JWT_SECRET);
  req.usuario = { id: payload.id };
  next();
}

module.exports = auth;
