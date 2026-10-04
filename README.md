# Gestão Jurídica — Desenvolvimento de Sistemas Web

Sistema de gestão para escritório de advocacia, desenvolvido como projeto full-stack da disciplina de Desenvolvimento de Sistemas Web.

**Integrantes:** Guilherme Pereira Teixeira · Arthur Nunes Barbosa

O domínio (usuários, clientes e processos) vem do nosso trabalho anterior de Banco de Dados ([streamlit-postgres-crud](https://github.com/guilhermestork/streamlit-postgres-crud)). Aqui ele foi reconstruído como uma API REST em Node.js.

## Stack

| Parte | Tecnologias |
|---|---|
| API (`backend/`) | Node.js, Express 5, Prisma 5, PostgreSQL 18, Zod, bcryptjs, jsonwebtoken |
| Cliente de demonstração (`demo/`) | Python, Streamlit, requests |
| Front-end (`frontend/`, Etapa 2) | Next.js (App Router) |

## Estrutura do repositório

```
backend/
├── prisma/            schema.prisma e migrations
└── src/
    ├── routes/        URLs e middlewares de cada rota
    ├── controllers/   traduzem HTTP ⇄ chamadas aos services
    ├── services/      regras de negócio e acesso ao banco (Prisma)
    ├── validators/    schemas Zod de validação de entrada
    ├── middlewares/   auth (JWT), validate, notFound, errorHandler
    ├── config/        conexão do Prisma
    └── utils/         AppError
demo/                  cliente Streamlit, coleção de requisições e roteiro em curl
docs/                  documentação de estudo (arquitetura, autenticação, roteiro)
```

## Pré-requisitos

- [Docker Desktop](https://www.docker.com/products/docker-desktop/), para o PostgreSQL
- Node.js 20 ou superior
- Python 3.10 ou superior (só para o cliente de demonstração)

## Instalação e execução

### 1. Banco de dados

Na raiz do repositório:

```bash
docker compose up -d
```

### 2. API

```bash
cd backend
cp .env.example .env        # depois, troque o JWT_SECRET por um valor aleatório
npm install                 # instala as dependências e gera o Prisma Client
npm run prisma:deploy       # cria as tabelas no banco
npm run dev                 # API em http://localhost:3000/api
```

Para testar: `curl http://localhost:3000/api/health` deve responder `{"status":"ok"}`.

### 3. Cliente de demonstração (opcional)

Em outro terminal, na raiz do repositório:

```bash
python3 -m venv demo/.venv
source demo/.venv/bin/activate          # Windows: demo\.venv\Scripts\activate
pip install -r demo/requirements.txt
streamlit run demo/app.py               # abre em http://localhost:8501
```

Também é possível importar `demo/colecao-api.postman_collection.json` no Insomnia, Thunder Client ou Postman, ou rodar `./demo/roteiro-curl.sh`.

## Variáveis de ambiente

Arquivo `backend/.env`, a partir de [`backend/.env.example`](backend/.env.example):

| Variável | Para que serve | Exemplo |
|---|---|---|
| `PORT` | Porta em que a API escuta | `3000` |
| `DATABASE_URL` | String de conexão do PostgreSQL usada pelo Prisma | `postgresql://postgres:postgres@localhost:5432/juridico` |
| `JWT_SECRET` | Segredo que assina os tokens JWT. Use um valor longo e aleatório | `openssl rand -hex 32` |
| `JWT_EXPIRES_IN` | Validade do token | `1d` |

O `.env` não é versionado (`.gitignore`).

## Scripts da API

Rode dentro de `backend/`:

| Comando | O que faz |
|---|---|
| `npm run dev` | Inicia a API e reinicia sozinha a cada alteração (`node --watch`) |
| `npm start` | Inicia a API (produção) |
| `npm run prisma:deploy` | Aplica as migrations pendentes no banco |
| `npm run prisma:migrate` | Cria e aplica uma migration nova após mudar o `schema.prisma` |
| `npm run db:reset` | **Apaga todos os dados** e recria as tabelas |

## Endpoints

Base: `http://localhost:3000/api`. As rotas marcadas com 🔒 exigem o cabeçalho `Authorization: Bearer <token>`, com o token obtido no login.

### Autenticação

| Método | Rota | Corpo | Resposta |
|---|---|---|---|
| `GET` | `/health` | — | `200 { status: "ok" }` |
| `POST` | `/auth/register` | `{ nome, email, senha }` | `201` usuário criado (sem a senha) |
| `POST` | `/auth/login` | `{ email, senha }` | `200 { token, usuario }` |
| `GET` | `/auth/me` 🔒 | — | `200` usuário logado |

### Clientes

| Método | Rota | Corpo | Resposta |
|---|---|---|---|
| `GET` | `/clientes` 🔒 | — | `200` lista, com a quantidade de processos de cada um |
| `GET` | `/clientes/:id` 🔒 | — | `200` cliente com seus processos |
| `POST` | `/clientes` 🔒 | `{ nome, cpf, email?, telefone? }` | `201` cliente criado |

### Processos (CRUD completo)

| Método | Rota | Corpo | Resposta |
|---|---|---|---|
| `GET` | `/processos` 🔒 | — | `200` lista, com cliente e responsável |
| `GET` | `/processos/:id` 🔒 | — | `200` processo |
| `POST` | `/processos` 🔒 | `{ numero, vara, comarca, clienteId, status? }` | `201` processo criado. O responsável é o usuário logado |
| `PATCH` | `/processos/:id` 🔒 | qualquer subconjunto dos campos acima | `200` processo atualizado |
| `DELETE` | `/processos/:id` 🔒 | — | `204` sem corpo |

`status` aceita `ativo` (padrão), `arquivado` ou `encerrado`.

### Formato dos erros

Todas as respostas de erro seguem o mesmo formato:

```json
{ "erro": "Dados inválidos", "detalhes": [{ "campo": "cpf", "mensagem": "O CPF deve ter 11 dígitos" }] }
```

| Status | Quando |
|---|---|
| `400` | Dados inválidos (validação), JSON malformado, id inválido, cliente inexistente |
| `401` | Token ausente, inválido ou expirado; e-mail ou senha incorretos |
| `404` | Recurso ou rota não encontrados |
| `409` | E-mail, CPF ou número de processo já cadastrados |
| `500` | Erro inesperado no servidor |

## Documentação

A pasta [`docs/`](docs/README.md) explica a arquitetura, o fluxo de uma requisição, a autenticação e as decisões de design do projeto.
