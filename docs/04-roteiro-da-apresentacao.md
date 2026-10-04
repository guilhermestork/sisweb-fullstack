# 04 — Roteiro da apresentação da Etapa 1

O professor pede 10–15 minutos de demonstração mais 5 de perguntas. A demonstração deve mostrar:

- os principais endpoints e a autenticação funcionando;
- uma explicação breve da arquitetura;
- **uma decisão de design** tomada pelo grupo.

Na arguição, cada um responde sobre uma parte do código que implementou.

## Antes de entrar na sala (checklist)

```bash
# 1. Docker Desktop aberto, e então:
docker compose up -d

# 2. API
cd backend
npm install                 # se for uma máquina nova
npm run db:reset            # ZERA o banco e recria as tabelas (ids voltam a começar em 1)
npm run dev                 # deixe este terminal aberto

# 3. Streamlit (outro terminal, na raiz do repositório)
source demo/.venv/bin/activate      # ou crie: python3 -m venv demo/.venv && pip install -r demo/requirements.txt
streamlit run demo/app.py
```

- [ ] `curl localhost:3000/api/health` responde `{"status":"ok"}`
- [ ] O Streamlit abre em `http://localhost:8501` com "API: 🟢 online" na barra lateral
- [ ] Insomnia ou Thunder Client com a coleção `demo/colecao-api.postman_collection.json` importada
- [ ] Fonte do terminal e do navegador **aumentada** (o professor precisa ler as respostas)
- [ ] VS Code aberto em `backend/src`, para mostrar o código quando for perguntado

## Roteiro sugerido (cerca de 12 minutos)

| Tempo | Quem | O quê | Onde |
|---|---|---|---|
| 0:00 | Guilherme | Tema: gestão de escritório de advocacia. Entidades Usuário, Cliente e Processo e as duas relações (mostrar `schema.prisma`) | VS Code |
| 1:30 | Arthur | Arquitetura: as pastas `routes → controllers → services`, `middlewares`, `validators`. Ordem dos middlewares no `app.js` | VS Code + [doc 02](02-camadas-e-crud.md) |
| 3:30 | Guilherme | **Autenticação ao vivo**: cadastro, login com senha errada (401), login certo (token), rota protegida sem token (401) e com token (200) | Streamlit |
| 6:00 | Arthur | **CRUD de Processos ao vivo**: criar cliente, criar processo, dado inválido (400 com a lista de campos), listar, PATCH do status, excluir (204), buscar o excluído (404) | Streamlit |
| 9:00 | Arthur | Tratamento de erros centralizado: abrir o `errorHandler.js` e mostrar que todos aqueles erros saíram de um único lugar | VS Code |
| 10:00 | Guilherme | **Decisão de design** (ver abaixo) | VS Code |
| 11:30 | Os dois | `.env` / `.env.example`, CORS e README com os endpoints | VS Code / GitHub |

A divisão segue o que cada um fez no histórico de commits. O Arthur escreveu a configuração do Express, o schema do Prisma e o `errorHandler`. Mesmo assim, **os dois devem estudar todos os documentos**: o professor pode perguntar qualquer parte a qualquer um.

### Dica para a demonstração no Streamlit

O painel **"Requisição e resposta"**, à direita, é o que mostra o backend respondendo. Depois de cada clique, apontem para ele: o método e a URL, o cabeçalho `Authorization` com o token, o corpo enviado e o status com o JSON de resposta.

Para mostrar o 401, desmarquem **"Enviar token nas requisições"** na barra lateral e cliquem em `GET /processos`.

## Decisão de design: qual apresentar

Escolham **uma**. Todas estão explicadas nos documentos.

1. **Express 5 + erros centralizados** ([doc 01](01-inicializacao-e-banco.md#decisão-de-design-express-5)). Os controllers não têm `try/catch`. Qualquer erro, até de função `async`, cai no `errorHandler`, que traduz cada tipo (AppError, Zod, JWT, Prisma) para o status HTTP certo. É a sugestão principal, porque conecta arquitetura, erros e uma escolha de versão concreta.
2. **O responsável pelo processo vem do token, não do corpo** ([doc 02](02-camadas-e-crud.md)). É uma decisão de segurança: o usuário não consegue cadastrar um processo em nome de outro, porque o Zod descarta `usuarioId` e o controller usa `req.usuario.id`.
3. **Validação em duas camadas** ([doc 02](02-camadas-e-crud.md#por-que-conferir-no-service-se-o-prisma-já-daria-erro)). O formato é conferido no Zod, e as regras que dependem do banco no service, com as restrições do banco como última defesa.

## Planos B

| Problema | O que fazer |
|---|---|
| Streamlit não abre | Usar o Insomnia/Thunder Client com a coleção, na ordem das pastas 1 → 2 → 3. O "Login" guarda o token sozinho |
| Insomnia/Thunder Client também falha | `./demo/roteiro-curl.sh`: faz o roteiro inteiro no terminal, pausando a cada passo (Enter para seguir) |
| "API: 🔴 offline" / `ECONNREFUSED` | O terminal do `npm run dev` foi fechado? Se o erro for de conexão com o banco, o Docker está aberto? Rode `docker compose up -d` |
| 409 "E-mail já cadastrado" / "CPF já existe" | O banco tem dados de um ensaio anterior. Rode `npm run db:reset` em `backend/` e reinicie o `npm run dev` |
| Ids diferentes de 1 | Mesmo caso: `npm run db:reset` |
| 401 "Token inválido ou expirado" | O token venceu (1 dia) ou a API trocou de `JWT_SECRET`. Faça login de novo |

## Perguntas prováveis na arguição (gerais)

<details>
<summary>Mostre onde está a rota protegida e explique como ela funciona.</summary>

`routes/processos.routes.js` tem `router.use(auth)`, e `middlewares/auth.js` lê `Authorization: Bearer <token>`, roda `jwt.verify` com o `JWT_SECRET` e preenche `req.usuario`. Sem token ou com token inválido, a resposta é 401. Detalhes no [doc 03](03-autenticacao.md).
</details>

<details>
<summary>O Streamlit faz parte do back-end?</summary>

Não. Ele é só um **cliente** da API, como o Insomnia ou o futuro Next.js. Ele não tem acesso ao banco: cada botão vira uma requisição HTTP (`requests.request(...)` em `demo/app.py`), e o painel da direita mostra essa requisição e a resposta.
</details>

<details>
<summary>Se fossem criar uma nova entidade, quais arquivos criariam?</summary>

1. O model no `schema.prisma`, mais `npm run prisma:migrate` para gerar a migration.
2. O schema Zod em `validators/`.
3. O service em `services/`, com as regras e o Prisma.
4. O controller em `controllers/`, que traduz HTTP.
5. O arquivo de rotas em `routes/`, registrado em `routes/index.js`.
</details>

<details>
<summary>O que mudaria para colocar a API em produção?</summary>

1. Usar um `DATABASE_URL` de um banco na nuvem e um `JWT_SECRET` forte, definidos como variáveis de ambiente do serviço de hospedagem (Render, Railway...). O código não muda.
2. Rodar `npm run prisma:deploy` para criar as tabelas.
3. Iniciar com `npm start`.
4. Restringir o CORS à origem do front-end, em vez de liberar todas.
</details>
