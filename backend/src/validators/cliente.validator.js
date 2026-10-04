const { z } = require('zod');

const clienteCreateSchema = z.object({
  nome: z.string().trim().min(2, 'O nome deve ter pelo menos 2 caracteres'),
  // Aceita "123.456.789-09" ou "12345678909" e guarda só os dígitos.
  cpf: z
    .string()
    .transform((cpf) => cpf.replace(/\D/g, ''))
    .refine((cpf) => cpf.length === 11, 'O CPF deve ter 11 dígitos'),
  email: z.string().trim().toLowerCase().email('E-mail inválido').optional(),
  telefone: z.string().trim().min(8, 'Telefone inválido').optional(),
});

module.exports = { clienteCreateSchema };
