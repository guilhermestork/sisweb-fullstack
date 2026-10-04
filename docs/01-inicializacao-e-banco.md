# 01 — Como a API inicializa e conversa com o banco

Este documento cobre o "esqueleto" da API: o que acontece quando ela liga, por onde passa cada requisição e como o Prisma liga o código ao PostgreSQL. Ainda não há regras de negócio aqui. Elas entram nos próximos documentos.

## Rodando a API na sua máquina

```bash
docker compose up -d              # 1. sobe o PostgreSQL (na raiz do repositório)
cd backend
cp .env.example .env              # 2. cria o .env (troque o JWT_SECRET)
npm install                       # 3. instala as dependências e gera o Prisma Client
npm run prisma:deploy             # 4. cria as tabelas no banco
npm run dev                       # 5. liga a API em http://localhost:3000
```

Para testar: `curl http://localhost:3000/api/health` deve responder `{"status":"ok"}`.

## Os arquivos e o papel de cada um

```
backend/
├── .env                    ← segredos e configurações (não vai para o Git)
├── .env.example            ← modelo do .env, sem segredos (vai para o Git)
├── prisma/
│   ├── schema.prisma       ← descrição das tabelas, em linguagem do Prisma
│   └── migrations/         ← o SQL que cria essas tabelas, em ordem
└── src/
    ├── server.js           ← ponto de partida: lê o .env, conecta no banco e liga o servidor
    ├── app.js              ← monta o Express: middlewares e rotas, na ordem certa
    ├── config/db.js        ← cria a única conexão do Prisma, usada pelo projeto todo
    ├── routes/             ← quais URLs existem e para quem cada uma vai
    ├── middlewares/        ← funções que rodam "no meio do caminho" da requisição
    └── utils/AppError.js   ← o tipo de erro que nós mesmos lançamos
```

### Por que `server.js` e `app.js` são separados?

O `app.js` só **monta** a aplicação (o que fazer com cada requisição). O `server.js` **liga** a aplicação (lê o `.env`, conecta no banco, escuta a porta). Separando as duas coisas, dá para importar o `app` num teste automatizado sem abrir porta nem depender da ordem de inicialização.

## O que acontece quando a API liga

1. `server.js` chama `require('dotenv').config()`, que copia as variáveis do `.env` para `process.env`. Isso precisa vir **antes** de qualquer outro `require`, porque o Prisma lê `process.env.DATABASE_URL`.
2. `connectDB()` (em `config/db.js`) abre a conexão com o PostgreSQL. Se o banco estiver fora do ar, a API **não liga**: ela mostra o erro e encerra com `process.exit(1)`. É melhor falhar logo do que ligar e quebrar na primeira requisição.
3. Com o banco conectado, `app.listen(porta)` começa a aceitar requisições. A porta vem de `process.env.PORT`.

Nenhum segredo está escrito no código: a conexão do banco, o segredo do JWT e a porta vêm do `.env`. Esse é um requisito explícito do professor.

## O caminho de uma requisição

O Express processa os `app.use(...)` **na ordem em que aparecem** em `app.js`. Cada requisição desce por essa fila até alguém responder:

```
requisição
   │
   ▼
cors()            ← libera o navegador de outro domínio (o futuro front-end) a chamar a API
   │
   ▼
express.json()    ← transforma o corpo JSON (texto) em objeto JavaScript: req.body
   │
   ▼
/api → routes     ← procura uma rota que combine com o método + caminho
   │   (achou? o controller responde e a requisição para aqui)
   ▼
notFound          ← ninguém respondeu: 404 "Rota ... não existe"
   │
   ▼
errorHandler      ← só é chamado se algo deu ERRO em qualquer ponto acima
```

O `errorHandler` é reconhecido pelo Express porque tem **quatro** parâmetros: `(err, req, res, next)`. Quando qualquer etapa lança um erro, o Express pula direto para ele.

## Tratamento de erros centralizado

Em vez de cada rota decidir como responder um erro, **todas** as rotas só lançam o erro, e o `middlewares/errorHandler.js` traduz cada tipo para uma resposta HTTP:

| Erro | De onde vem | Resposta |
|---|---|---|
| `AppError` | Nós lançamos, ex.: `throw new AppError('Processo não encontrado', 404)` | o status que escolhemos |
| `ZodError` | Validação de dados falhou | 400 + lista de campos inválidos |
| `entity.parse.failed` | O corpo não é um JSON válido | 400 |
| `JsonWebTokenError` / `TokenExpiredError` | Token inválido ou vencido | 401 |
| Prisma `P2002` | Valor repetido num campo `@unique` (ex.: CPF já cadastrado) | 409 |
| Prisma `P2025` | Registro não encontrado para atualizar ou remover | 404 |
| Prisma `P2003` | Violação de chave estrangeira (ex.: gravar um processo apontando para um cliente que não existe) | 409 |
| Qualquer outro | Bug ou falha inesperada | 500, sem detalhes para o cliente (o detalhe vai para o console) |

Esconder o detalhe dos erros 500 é uma questão de **segurança**: mensagens internas podem revelar a estrutura do banco ou do código.

### `utils/AppError.js`

É uma classe que **estende** o `Error` do JavaScript e acrescenta um `status`. Ela separa dois tipos de erro:

- **Erros esperados**, como "não encontrado" ou "e-mail já usado". São `AppError`, e a mensagem pode ser mostrada ao usuário.
- **Erros inesperados**, ou seja, bugs. Viram 500 genérico.

## Decisão de design: Express 5

O projeto usa o **Express 5**. A diferença que importa para nós:

```js
// Express 4: um erro dentro de função async NÃO chega ao errorHandler.
// A requisição fica pendurada. Era preciso try/catch em todo controller:
async function buscar(req, res, next) {
  try {
    const processo = await service.buscar(req.params.id);
    res.json(processo);
  } catch (err) {
    next(err);
  }
}

// Express 5: o próprio Express captura o erro e manda para o errorHandler.
async function buscar(req, res) {
  const processo = await service.buscar(req.params.id);
  res.json(processo);
}
```

Com o Express 5, os controllers ficam curtos, e é impossível "esquecer" um `try/catch` e deixar um erro sem resposta. O tratamento de erros fica, de fato, centralizado num único lugar.

## Prisma: do schema ao banco

O Prisma é um **ORM**: ele permite ler e gravar no banco com código JavaScript (`prisma.processo.findMany()`) em vez de escrever SQL na mão. Ele trabalha com três peças:

| Peça | Arquivo | O que é |
|---|---|---|
| **Schema** | `prisma/schema.prisma` | A "planta" das tabelas: models, campos, tipos e relações |
| **Migrations** | `prisma/migrations/*/migration.sql` | O SQL que transforma a planta em tabelas reais, versionado no Git |
| **Prisma Client** | gerado em `node_modules/@prisma/client` | O código que usamos no projeto, gerado **a partir do schema** |

Comandos:

- `npm run prisma:generate` (`prisma generate`): lê o schema e gera o Prisma Client. Roda sozinho depois do `npm install`, por causa do script `postinstall`.
- `npm run prisma:deploy` (`prisma migrate deploy`): aplica no banco as migrations que ainda não foram aplicadas. O Prisma anota as já aplicadas na tabela `_prisma_migrations`.
- `npm run prisma:migrate` (`prisma migrate dev`): usado quando **mudamos** o schema. Ele compara o schema com o banco, escreve uma migration nova e a aplica.

### Lendo o schema

```prisma
model Processo {
  id         Int    @id @default(autoincrement())   // chave primária, 1, 2, 3...
  numero     String @unique                         // não pode repetir
  clienteId  Int    @map("cliente_id")              // no banco a coluna se chama cliente_id
  cliente    Cliente @relation(fields: [clienteId], references: [id], onDelete: Restrict)
  ...
  @@map("processos")                                // no banco a tabela se chama processos
}
```

- `@map` / `@@map`: no JavaScript usamos `camelCase` (`clienteId`); no banco, `snake_case` (`cliente_id`). O Prisma traduz.
- `clienteId` é a **coluna** real, a chave estrangeira. `cliente` é só um **atalho** do Prisma para navegar até o objeto Cliente, e não vira coluna.
- `onDelete: Restrict`: o banco **recusa** apagar um cliente que ainda tem processos. Isso protege contra processos "órfãos" mesmo que o código tenha um bug. Veja a pergunta no fim do documento.
- `enum StatusProcesso`: o status só pode ser `ativo`, `arquivado` ou `encerrado`. Quem garante isso é o próprio banco.

## Perguntas prováveis na arguição

<details>
<summary>Onde ficam a string de conexão e o segredo do JWT? Por que não no código?</summary>

No arquivo `backend/.env`, lido pelo `dotenv` no início do `server.js`. O `.env` está no `.gitignore`, então os segredos nunca vão para o GitHub. O `.env.example` mostra quais variáveis existem, sem os valores reais. Além da segurança, isso permite usar configurações diferentes em cada ambiente (sua máquina, a do colega, o servidor de produção) sem mudar o código.
</details>

<details>
<summary>Como funciona o tratamento de erros centralizado?</summary>

Os controllers e services não respondem erros: eles **lançam**. O Express 5 captura qualquer erro (inclusive em funções `async`) e o entrega ao `errorHandler`, o último middleware do `app.js`, que tem quatro parâmetros. Ele olha o tipo do erro (AppError, ZodError, código do Prisma...) e escolhe o status HTTP e a mensagem. Assim toda a API responde erros no mesmo formato, `{ "erro": "..." }`.
</details>

<details>
<summary>Por que a ordem dos app.use importa?</summary>

O Express executa os middlewares na ordem em que são registrados. O `express.json()` precisa vir antes das rotas, senão `req.body` estaria vazio. O `notFound` precisa vir depois das rotas, senão responderia 404 para tudo. E o `errorHandler` precisa ser o último, para receber erros de qualquer ponto anterior.
</details>

<details>
<summary>O que é CORS e por que configurar?</summary>

É uma regra de segurança dos **navegadores**: por padrão, uma página em `localhost:3001` (o futuro Next.js) não pode chamar uma API em `localhost:3000`, porque são "origens" diferentes. O middleware `cors()` adiciona cabeçalhos na resposta dizendo ao navegador que essa chamada é permitida. Ferramentas como curl e Thunder Client não são navegadores, por isso funcionam mesmo sem CORS.
</details>

<details>
<summary>Qual a diferença entre o schema, a migration e o Prisma Client?</summary>

O schema descreve como as tabelas **devem** ser. A migration é o SQL que **cria** essas tabelas no banco, guardado no Git para que todo mundo chegue no mesmo banco. O Prisma Client é o código **gerado** a partir do schema, que usamos no JavaScript para consultar e gravar dados.
</details>

<details>
<summary>O que acontece se tentarmos apagar um cliente que tem processos?</summary>

A relação está com `onDelete: Restrict`, então o PostgreSQL recusa a operação (erro `23001`, "restrict violation"), e nenhum processo fica órfão. Para apagar o cliente, primeiro é preciso apagar ou transferir os processos dele.

Detalhe que testamos na prática: o Prisma 5 não converte esse erro `23001` num código `P...`, então ele chegaria ao `errorHandler` como erro desconhecido (500). Hoje a API não tem rota para apagar clientes. Se um dia tiver, o certo é o **service** conferir antes se o cliente tem processos e lançar `AppError('Cliente possui processos', 409)`. A regra de negócio fica explícita no código, e a restrição do banco continua como última proteção.
</details>
