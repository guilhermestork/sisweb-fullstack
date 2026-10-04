const { z } = require('zod');

// Os parâmetros de rota chegam como texto ("3"); coerce converte para número.
const idParamSchema = z.object({
  id: z.coerce
    .number({ invalid_type_error: 'O id deve ser um número' })
    .int('O id deve ser um número inteiro')
    .positive('O id deve ser positivo'),
});

module.exports = { idParamSchema };
