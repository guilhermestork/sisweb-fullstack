# 00 — Visão geral

## O que estamos construindo

Um sistema para um **escritório de advocacia** organizar os seus **clientes** e os **processos judiciais** de cada um. Só usuários cadastrados e logados conseguem mexer nos dados.

O projeto tem duas etapas, e cada uma tem uma apresentação:

1. **Etapa 1 — Back-end.** Uma API que guarda e entrega os dados. Não tem tela: ela recebe pedidos HTTP e responde com JSON.
2. **Etapa 2 — Front-end.** Um site em Next.js que conversa com essa API.

Para a Etapa 1, usamos um **cliente em Streamlit** (pasta `demo/`) para mostrar a API funcionando de forma visual. Ele não é o front-end oficial, é só uma "janela" para a API.

## A ideia central: cliente e servidor

```
┌──────────────────┐   pedido HTTP (ex.: GET /processos)    ┌──────────────────┐        ┌────────────┐
│  Cliente         │ ─────────────────────────────────────▶ │  API (backend/)  │ ─────▶ │ PostgreSQL │
│  Streamlit,      │                                        │  Node + Express  │        │  (Docker)  │
│  Thunder Client, │ ◀───────────────────────────────────── │                  │ ◀───── │            │
│  curl, Next.js   │   resposta: status + JSON              └──────────────────┘        └────────────┘
└──────────────────┘
```

- O **cliente** nunca fala direto com o banco. Ele só conhece a API.
- A **API** é a única parte que conhece o banco. Ela valida os dados, confere quem está logado e decide o que pode ser feito.
- O **banco** só guarda os dados.

Essa é a principal diferença em relação ao nosso trabalho de Banco de Dados. Lá, o Streamlit executava SQL direto no Postgres. Agora existe uma camada no meio, e é ela que estamos construindo.

## As entidades

| Entidade | O que representa | Relações |
|---|---|---|
| **Usuário** | Advogado ou funcionário do escritório que usa o sistema | É o responsável por vários processos |
| **Cliente** | Pessoa atendida pelo escritório | Tem vários processos |
| **Processo** | Um processo judicial (número, vara, comarca, status) | Pertence a **um** cliente e tem **um** usuário responsável |

O **Processo** é a entidade principal: ele tem o CRUD completo (criar, listar, buscar por id, atualizar e remover).

## O que o professor exige na Etapa 1 e onde isso fica

| Requisito | Onde vai estar |
|---|---|
| Node.js + Express em camadas (rotas → controllers → services) | `backend/src/routes`, `backend/src/controllers`, `backend/src/services` |
| Pelo menos duas entidades persistidas via Prisma | `backend/prisma/schema.prisma` |
| CRUD completo da entidade principal | Processo |
| Validação de entrada na criação e na atualização | Schemas Zod em `backend/src/validators` |
| Cadastro e login com bcrypt + JWT | Rotas `/auth/register` e `/auth/login` |
| Pelo menos uma rota protegida | Middleware que exige o JWT |
| `.env` com a conexão do banco, o segredo do JWT e a porta | `backend/.env` (e `backend/.env.example` no Git) |
| Tratamento de erros centralizado + CORS | Middleware de erro e `cors()` no `app.js` |
| README com instalação, `.env.example` e endpoints | `README.md` na raiz |
| Histórico de commits dos dois integrantes | Commits do Guilherme com `Co-authored-by` do Arthur nas sessões em dupla |

Os documentos seguintes explicam cada item à medida que ele é construído.

## Vocabulário mínimo

- **HTTP**: o "idioma" que cliente e servidor usam para conversar. Cada pedido tem um **método**, um **caminho** e, às vezes, um **corpo**.
- **Métodos**: `GET` (ler), `POST` (criar), `PUT`/`PATCH` (atualizar), `DELETE` (remover).
- **Endpoint**: a combinação de método e caminho, por exemplo `GET /processos/3`.
- **JSON**: o formato de texto dos dados que vão e voltam, como `{"nome": "Maria"}`.
- **Status code**: um número na resposta que diz como foi. `200` deu certo, `201` criado, `400` dados inválidos, `401` não autenticado, `404` não encontrado, `500` erro no servidor.
- **CRUD**: Create, Read, Update, Delete, as quatro operações básicas sobre dados.

## Perguntas prováveis na arguição

<details>
<summary>Por que não deixar o Streamlit (ou o site) acessar o banco direto, como antes?</summary>

Porque aí cada cliente precisaria da senha do banco e poderia fazer qualquer coisa nele. Com a API no meio, as regras (validação, quem pode o quê, autenticação) ficam num único lugar, e qualquer cliente (Streamlit, site, app de celular) usa as mesmas regras.
</details>

<details>
<summary>Qual é a entidade principal e como ela se relaciona com as outras?</summary>

Processo. Cada processo pertence a um cliente (um cliente tem vários processos) e tem um usuário responsável (um usuário é responsável por vários processos). As duas são relações de um-para-muitos.
</details>
