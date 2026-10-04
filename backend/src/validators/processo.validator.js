const { z } = require('zod');

const processoCreateSchema = z.object({
  numero: z.string().trim().min(1, 'Informe o número do processo'),
  vara: z.string().trim().min(1, 'Informe a vara'),
  comarca: z.string().trim().min(1, 'Informe a comarca'),
  status: z.enum(['ativo', 'arquivado', 'encerrado']).optional(),
  clienteId: z.number().int().positive('clienteId deve ser um id válido'),
});

// Na atualização (PATCH) todos os campos são opcionais,
// mas é preciso mandar pelo menos um.
const processoUpdateSchema = processoCreateSchema
  .partial()
  .refine((dados) => Object.keys(dados).length > 0, 'Informe ao menos um campo para atualizar');

module.exports = { processoCreateSchema, processoUpdateSchema };
