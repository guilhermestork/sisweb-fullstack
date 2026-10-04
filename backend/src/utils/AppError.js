// Erro "esperado" da aplicação: algo que o cliente fez de errado ou pediu
// algo que não existe. Carrega o status HTTP que o errorHandler vai devolver.
class AppError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.name = 'AppError';
    this.status = status;
  }
}

module.exports = AppError;
