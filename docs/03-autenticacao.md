# 03 — Autenticação: bcrypt e JWT

A autenticação responde duas perguntas:

1. **Cadastro e login:** "Esta pessoa é quem diz ser?" Ela prova isso com e-mail e senha.
2. **Rotas protegidas:** "Esta requisição vem de alguém que já fez login?" Ela prova isso com um token.

## Visão geral do fluxo

```
 1. Cadastro    POST /api/auth/register  { nome, email, senha }
                └─▶ senha vira hash com bcrypt ─▶ grava usuário ─▶ 201 { id, nome, email }

 2. Login       POST /api/auth/login     { email, senha }
                └─▶ busca usuário ─▶ bcrypt.compare(senha, hash) ─▶ jwt.sign({ id }) ─▶ 200 { token, usuario }

 3. Uso         GET /api/processos       Authorization: Bearer <token>
                └─▶ middleware auth: jwt.verify(token) ─▶ req.usuario = { id } ─▶ controller
```

## Endpoints

| Método e caminho | Protegido? | Corpo | Sucesso | Erros |
|---|---|---|---|---|
| `POST /api/auth/register` | Não | `{ nome, email, senha }` | 201 + usuário (sem senha) | 400 dados inválidos, 409 e-mail já cadastrado |
| `POST /api/auth/login` | Não | `{ email, senha }` | 200 + `{ token, usuario }` | 400, 401 e-mail ou senha inválidos |
| `GET /api/auth/me` | **Sim** | — | 200 + dados do usuário logado | 401 |

Além do `/auth/me`, **todas** as rotas de `/api/clientes` e `/api/processos` são protegidas.

## Senhas: por que bcrypt

**Nunca guardamos a senha.** Guardamos um **hash**: o resultado de uma função de mão única. Dá para calcular o hash a partir da senha, mas não dá para voltar do hash para a senha.

```js
// services/auth.service.js
const senhaHash = await bcrypt.hash(senha, 10);
// "123456" vira algo como "$2a$10$N9qo8uLOickgx2ZMRZoMye.IjZAgcfl7p92ldGxad68LJZdL17lhW"
```

Na coluna `senha_hash` do banco fica só esse texto. Se o banco vazar, as senhas originais não vazam junto.

O que torna o bcrypt adequado para senhas:

- **Salt.** Antes de calcular o hash, o bcrypt mistura um valor aleatório na senha e guarda esse valor dentro do próprio hash. Dois usuários com a senha "123456" ficam com hashes **diferentes**. Assim, um atacante não consegue usar tabelas prontas de "senha → hash".
- **É lento de propósito.** O `10` é o *custo*: o algoritmo repete o trabalho 2¹⁰ vezes. Para nós, o login demora uns milissegundos a mais. Para quem tenta adivinhar bilhões de senhas, isso fica inviável.

No login, não "desfazemos" o hash. O `bcrypt.compare(senha, usuario.senhaHash)` calcula o hash da senha digitada com o mesmo salt e compara os resultados.

Usamos o pacote `bcryptjs`, que é o algoritmo bcrypt escrito em JavaScript puro. O resultado é o mesmo do pacote `bcrypt`, mas sem depender de compilação nativa.

### A mesma mensagem para e-mail inexistente e senha errada

```js
const senhaConfere = usuario && (await bcrypt.compare(senha, usuario.senhaHash));
if (!senhaConfere) {
  throw new AppError('E-mail ou senha inválidos', 401);
}
```

Se a API respondesse "e-mail não encontrado" num caso e "senha errada" no outro, qualquer pessoa conseguiria descobrir quais e-mails têm conta no sistema.

### O hash nunca sai da API

Os services usam `select: usuarioPublico` (`id`, `nome`, `email`, `criadoEm`) sempre que devolvem um usuário. O `senhaHash` não aparece em nenhuma resposta.

## JWT: o "crachá" do usuário

Depois do login, o usuário não manda mais a senha. Ele manda um **token JWT** (JSON Web Token), um texto em três partes separadas por pontos:

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9 . eyJpZCI6MSwiaWF0IjoxNzkxMTM5MzYwLCJleHAiOjE3OTEyMjU3NjB9 . WBzybe0BulLYRa_zCZOr-DxQ...
          cabeçalho                                       payload                                          assinatura
   {"alg":"HS256","typ":"JWT"}                 {"id":1,"iat":1791139360,"exp":1791225760}
```

- **Payload:** os dados do token. Aqui, o `id` do usuário, quando o token foi emitido (`iat`) e quando expira (`exp`).
- **Assinatura:** calculada com o `JWT_SECRET`, que só o servidor conhece.

⚠️ **O payload não é secreto.** Ele está só codificado em Base64, e qualquer pessoa consegue ler (cole um token em jwt.io para ver). Por isso colocamos apenas o `id`, e nunca a senha ou dados sensíveis.

O que impede a falsificação é a **assinatura**. Se alguém trocar `"id":1` por `"id":2`, a assinatura deixa de bater, e só quem tem o `JWT_SECRET` conseguiria gerar uma assinatura nova. Por isso o segredo fica no `.env` e nunca no código.

### Emissão (login)

```js
const token = jwt.sign({ id: usuario.id }, process.env.JWT_SECRET, {
  expiresIn: process.env.JWT_EXPIRES_IN || '1d',
});
```

O token vale por um dia (configurável no `.env`). Depois disso, é preciso fazer login de novo. Isso limita o estrago se um token for roubado.

### Verificação (middleware `middlewares/auth.js`)

```js
function auth(req, res, next) {
  const [tipo, token] = (req.headers.authorization || '').split(' ');

  if (tipo !== 'Bearer' || !token) {
    throw new AppError('Token não informado', 401);
  }

  const payload = jwt.verify(token, process.env.JWT_SECRET);
  req.usuario = { id: payload.id };
  next();
}
```

1. Lê o cabeçalho `Authorization: Bearer <token>`. "Bearer" significa "portador": quem porta o token tem o acesso.
2. `jwt.verify` confere a assinatura e a validade. Se o token foi alterado, assinado com outro segredo ou está vencido, ele **lança um erro**, e o `errorHandler` responde `401 Token inválido ou expirado`.
3. Se o token é válido, guarda o id em `req.usuario` e chama `next()`. Os middlewares e controllers seguintes passam a saber quem está logado.

Para proteger um conjunto de rotas, basta registrar o middleware antes delas:

```js
router.use(auth);   // em routes/processos.routes.js: protege todas as rotas do arquivo
```

ou em uma rota só:

```js
router.get('/me', auth, authController.me);   // em routes/auth.routes.js
```

### O servidor não guarda sessão

A API não guarda em lugar nenhum "quem está logado". Cada requisição traz o próprio token, e a assinatura prova que ele foi emitido por nós. Isso se chama autenticação **stateless** (sem estado).

O lado bom: é simples e funciona igual com várias instâncias da API. O lado ruim: não dá para "cancelar" um token antes de ele vencer. Por isso a validade é curta.

## Testando

```bash
# cadastro
curl -s -X POST localhost:3000/api/auth/register -H 'Content-Type: application/json' \
  -d '{"nome":"Guilherme","email":"gui@exemplo.com","senha":"123456"}'

# login: copie o "token" da resposta
curl -s -X POST localhost:3000/api/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"gui@exemplo.com","senha":"123456"}'

# sem token: 401
curl -s localhost:3000/api/processos

# com token: 200
curl -s localhost:3000/api/auth/me -H "Authorization: Bearer COLE_O_TOKEN_AQUI"
```

## Perguntas prováveis na arguição

<details>
<summary>Como a senha é armazenada?</summary>

Como um hash bcrypt com custo 10, na coluna `senha_hash`. A senha original nunca é gravada. No login, `bcrypt.compare` calcula o hash da senha digitada usando o salt guardado no próprio hash e compara os dois resultados.
</details>

<details>
<summary>Por que bcrypt e não, por exemplo, SHA-256?</summary>

O SHA-256 foi feito para ser **rápido**, e isso ajuda quem tenta adivinhar senhas por força bruta. O bcrypt é lento de propósito (o custo é configurável) e já inclui um salt aleatório. Assim, senhas iguais geram hashes diferentes, e tabelas pré-calculadas não funcionam.
</details>

<details>
<summary>O que tem dentro do token? Alguém consegue alterá-lo?</summary>

O payload tem o `id` do usuário e as datas de emissão e expiração. Qualquer pessoa consegue **ler** o payload, porque ele está só em Base64. Mas ninguém consegue **alterá-lo** sem invalidar a assinatura, e para gerar uma assinatura válida é preciso o `JWT_SECRET`, que só existe no `.env` do servidor.
</details>

<details>
<summary>Mostre uma rota protegida. O que acontece sem token, com token inválido e com token válido?</summary>

`GET /api/processos`. Sem cabeçalho `Authorization`, o middleware `auth` lança `AppError('Token não informado', 401)`. Com token adulterado ou vencido, o `jwt.verify` lança `JsonWebTokenError` ou `TokenExpiredError`, e o `errorHandler` responde 401. Com token válido, o middleware preenche `req.usuario` e chama `next()`, e a requisição segue para o controller.
</details>

<details>
<summary>Como o controller sabe quem é o usuário logado?</summary>

Pelo `req.usuario`, preenchido pelo middleware `auth` a partir do payload do token. Exemplo: em `POST /api/processos`, o controller passa `req.usuario.id` ao service, que o usa como responsável pelo processo.
</details>

<details>
<summary>Por que a mensagem de erro do login é a mesma para e-mail e senha?</summary>

Para não revelar quais e-mails estão cadastrados. Mensagens diferentes permitiriam a qualquer pessoa testar uma lista de e-mails e descobrir quem tem conta.
</details>
