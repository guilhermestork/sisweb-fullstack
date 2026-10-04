# Gestão Jurídica — Desenvolvimento de Sistemas Web

Sistema de gestão para escritório de advocacia, desenvolvido como projeto full-stack da disciplina de Desenvolvimento de Sistemas Web.

**Integrantes:** Guilherme Pereira Teixeira · Arthur Nunes Barbosa

O domínio (usuários, clientes e processos) vem do nosso trabalho anterior de Banco de Dados ([streamlit-postgres-crud](https://github.com/guilhermestork/streamlit-postgres-crud)). Aqui ele foi reconstruído como uma API REST em Node.js.

## Estrutura do repositório

| Pasta | Conteúdo | Etapa |
|---|---|---|
| `backend/` | API REST em Node.js + Express + Prisma (PostgreSQL) | 1 |
| `demo/` | Cliente em Streamlit que consome a API, usado na apresentação | 1 |
| `frontend/` | Aplicação Next.js (App Router) | 2 |
| `docs/` | Documentação de estudo: arquitetura, fluxos e decisões | — |

## Pré-requisitos

- [Docker Desktop](https://www.docker.com/products/docker-desktop/), para o PostgreSQL
- Node.js 20 ou superior

## Subindo o banco de dados

```bash
docker compose up -d
```

As instruções de instalação da API, as variáveis de ambiente e a lista de endpoints entram aqui conforme o back-end for construído.
