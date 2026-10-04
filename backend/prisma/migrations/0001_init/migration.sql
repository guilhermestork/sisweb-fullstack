CREATE TYPE "status_processo" AS ENUM ('ativo', 'arquivado', 'encerrado');

CREATE TABLE "usuarios" (
    "id" SERIAL PRIMARY KEY,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senha_hash" TEXT NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

CREATE TABLE "clientes" (
    "id" SERIAL PRIMARY KEY,
    "nome" TEXT NOT NULL,
    "cpf" TEXT NOT NULL,
    "email" TEXT,
    "telefone" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX "clientes_cpf_key" ON "clientes"("cpf");

CREATE TABLE "processos" (
    "id" SERIAL PRIMARY KEY,
    "numero" TEXT NOT NULL,
    "vara" TEXT NOT NULL,
    "comarca" TEXT NOT NULL,
    "status" "status_processo" NOT NULL DEFAULT 'ativo',
    "cliente_id" INTEGER NOT NULL,
    "usuario_responsavel_id" INTEGER NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL
);

CREATE UNIQUE INDEX "processos_numero_key" ON "processos"("numero");

ALTER TABLE "processos" ADD CONSTRAINT "processos_cliente_id_fkey"
    FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "processos" ADD CONSTRAINT "processos_usuario_responsavel_id_fkey"
    FOREIGN KEY ("usuario_responsavel_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
