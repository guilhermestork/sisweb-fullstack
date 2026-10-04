# 02 — Arquitetura em camadas: Clientes e Processos

Este documento segue uma requisição real por todas as camadas da API e explica o que cada uma faz. O exemplo é a criação de um processo, a operação mais completa do projeto.

## As camadas

```
backend/src/
├── routes/        ← "Qual URL existe e que middlewares ela exige?"
├── validators/    ← "Que formato de dados é aceito?" (schemas Zod)
├── controllers/   ← "Como traduzir HTTP ⇄ chamada de função?"
├── services/      ← "Quais são as regras do negócio?" (e acesso ao banco via Prisma)
└── middlewares/   ← funções reaproveitadas no caminho (auth, validate, erros)
```

Cada camada só conversa com a de baixo. A rota chama o controller, o controller chama o service, e o service usa o Prisma.

| Camada | Conhece HTTP (`req`, `res`, status)? | Conhece o banco (Prisma)? |
|---|---|---|
| Rota | Sim | Não |
| Controller | Sim | Não |
| Service | **Não** | Sim |

Essa separação é a decisão central da arquitetura. O **service não sabe que existe HTTP**: ele recebe dados comuns (`criar(dados, usuarioId)`) e devolve dados ou lança `AppError`. Por isso, a mesma regra poderia ser chamada por outra coisa (um script, um teste, uma fila) sem mudar nada.

## Seguindo um `POST /api/processos` do início ao fim

```http
POST /api/processos
Authorization: Bearer eyJhbGciOi...
Content-Type: application/json

{ "numero": "5001234-56.2026.8.24.0023", "vara": "2ª Vara Cível", "comarca": "Florianópolis", "clienteId": 1 }
```

### 1. Rota — `routes/processos.routes.js`

```js
router.use(auth);                                                     // vale para todas as rotas abaixo
router.post('/', validate(processoCreateSchema), processosController.criar);
```

A rota não tem lógica. Ela só declara a **fila de funções** que a requisição atravessa: primeiro `auth`, depois `validate`, por último o controller. Se alguma delas lançar erro, a fila para e o Express pula para o `errorHandler`.

### 2. Middleware `auth`

Confere o token JWT e coloca o id do usuário logado em `req.usuario`. Detalhes no [documento 03](03-autenticacao.md).

### 3. Middleware `validate` + schema Zod — `validators/processo.validator.js`

```js
const processoCreateSchema = z.object({
  numero: z.string().trim().min(1, 'Informe o número do processo'),
  vara: z.string().trim().min(1, 'Informe a vara'),
  comarca: z.string().trim().min(1, 'Informe a comarca'),
  status: z.enum(['ativo', 'arquivado', 'encerrado']).optional(),
  clienteId: z.number().int().positive('clienteId deve ser um id válido'),
});
```

O `validate(schema)` roda `schema.parse(req.body)`:

- **Dados válidos:** o `req.body` é **substituído** pela versão já limpa. Espaços nas pontas são removidos, e **campos que não estão no schema são descartados**. Isso impede, por exemplo, que alguém mande `"usuarioId": 99` para se passar por outro usuário.
- **Dados inválidos:** o Zod lança `ZodError`, e o `errorHandler` responde 400 com a lista de campos:

```json
{ "erro": "Dados inválidos",
  "detalhes": [{ "campo": "status", "mensagem": "Valor inválido. Use: ativo, arquivado, encerrado" }] }
```

Validação de **formato** (é texto? é número? está vazio?) fica aqui. Validação que precisa **consultar o banco** (o cliente existe? o número já foi usado?) fica no service.

### 4. Controller — `controllers/processos.controller.js`

```js
async function criar(req, res) {
  const processo = await processosService.criar(req.body, req.usuario.id);
  res.status(201).json(processo);
}
```

O controller tira o que interessa da requisição (o corpo e o usuário logado), chama o service e escolhe o **status HTTP** da resposta: `201 Created`. Não tem `try/catch`, porque o Express 5 leva qualquer erro ao `errorHandler` (veja o [documento 01](01-inicializacao-e-banco.md#decisão-de-design-express-5)).

### 5. Service — `services/processos.service.js`

```js
async function criar(dados, usuarioId) {
  await garantirClienteExiste(dados.clienteId);   // regra: o cliente precisa existir     → senão 400
  await garantirNumeroLivre(dados.numero);         // regra: número de processo é único    → senão 409

  return prisma.processo.create({
    data: { ...dados, usuarioId },                 // regra: o responsável é quem cadastrou
    include: incluirRelacoes,                      // devolve junto o nome do cliente e do responsável
  });
}
```

Aqui moram as **regras de negócio**:

- O cliente informado tem que existir.
- O número do processo não pode repetir.
- O responsável pelo processo é o usuário logado que o cadastrou, e o cliente da API não escolhe isso.

### 6. Resposta

```json
{
  "id": 1, "numero": "5001234-56.2026.8.24.0023", "vara": "2ª Vara Cível", "comarca": "Florianópolis",
  "status": "ativo", "clienteId": 1, "usuarioId": 1, "criadoEm": "...", "atualizadoEm": "...",
  "cliente": { "id": 1, "nome": "Maria Silva" },
  "usuarioResponsavel": { "id": 1, "nome": "Guilherme" }
}
```

O `include` do Prisma faz o "JOIN" e traz os objetos relacionados. Usamos `select` dentro dele para devolver só o id e o nome, e nunca dados sensíveis do usuário.

## Endpoints de Processos (entidade principal, CRUD completo)

Todos exigem `Authorization: Bearer <token>`.

| Método e caminho | O que faz | Sucesso | Erros possíveis |
|---|---|---|---|
| `GET /api/processos` | Lista todos, com cliente e responsável | 200 | 401 |
| `GET /api/processos/:id` | Busca um | 200 | 400 id inválido, 404 |
| `POST /api/processos` | Cria; o responsável é o usuário logado | 201 | 400 dados ou cliente inexistente, 409 número repetido |
| `PATCH /api/processos/:id` | Atualiza só os campos enviados | 200 | 400, 404, 409 |
| `DELETE /api/processos/:id` | Remove | 204 (sem corpo) | 404 |

## Endpoints de Clientes (entidade relacionada)

Todos exigem `Authorization: Bearer <token>`.

| Método e caminho | O que faz | Sucesso | Erros possíveis |
|---|---|---|---|
| `GET /api/clientes` | Lista em ordem alfabética, com a quantidade de processos de cada um | 200 | 401 |
| `GET /api/clientes/:id` | Busca um, com a lista dos seus processos | 200 | 400, 404 |
| `POST /api/clientes` | Cria; aceita CPF com ou sem pontuação e guarda só os dígitos | 201 | 400, 409 CPF repetido |

O professor exige "pelo menos leitura" para a entidade relacionada. Incluímos a criação porque, sem ela, não há como cadastrar um processo (todo processo precisa de um cliente).

## Por que `PATCH` e não `PUT` para atualizar?

- `PUT` significa "substitua o recurso inteiro por este". O cliente teria que mandar **todos** os campos.
- `PATCH` significa "altere só estes campos". Para arquivar um processo, basta mandar `{ "status": "arquivado" }`.

O schema de atualização reaproveita o de criação:

```js
const processoUpdateSchema = processoCreateSchema
  .partial()                                                  // todos os campos viram opcionais
  .refine((dados) => Object.keys(dados).length > 0, 'Informe ao menos um campo para atualizar');
```

## O `id` da URL também é validado

`GET /api/processos/abc` não chega a consultar o banco. Os parâmetros de rota chegam como **texto**, e o `idParamSchema` (`validators/comum.validator.js`) converte para número com `z.coerce.number()`. Se não for um inteiro positivo, a resposta é 400.

## Por que conferir no service se o Prisma já daria erro?

O banco tem `@unique` no número do processo e chave estrangeira em `clienteId`, então gravar dados ruins já falharia de qualquer jeito. Mesmo assim, o service confere antes, por dois motivos:

1. **Mensagens claras.** "Cliente 999 não existe" é muito mais útil para quem usa a API do que "Operação viola uma relação entre tabelas".
2. **Regra explícita.** Quem lê o service vê as regras de negócio ali, escritas, sem precisar conhecer o schema do banco.

As restrições do banco continuam lá como **última linha de defesa**. Se duas requisições chegarem exatamente ao mesmo tempo com o mesmo número, o `@unique` barra a segunda (`P2002`), e o `errorHandler` responde 409.

## Testando com curl

```bash
# guarde o token do login numa variável
TOKEN=$(curl -s -X POST localhost:3000/api/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"gui@exemplo.com","senha":"123456"}' | node -pe 'JSON.parse(require("fs").readFileSync(0)).token')

curl -s -X POST localhost:3000/api/clientes -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"nome":"Maria Silva","cpf":"123.456.789-09"}'

curl -s -X POST localhost:3000/api/processos -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"numero":"5001234-56.2026.8.24.0023","vara":"2ª Vara Cível","comarca":"Florianópolis","clienteId":1}'

curl -s -X PATCH localhost:3000/api/processos/1 -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"status":"arquivado"}'

curl -s -i -X DELETE localhost:3000/api/processos/1 -H "Authorization: Bearer $TOKEN"
```

## Perguntas prováveis na arguição

<details>
<summary>Qual a responsabilidade de cada camada?</summary>

A **rota** define a URL e a sequência de middlewares (auth, validate). O **controller** lê a requisição, chama o service e escolhe o status HTTP da resposta. O **service** aplica as regras de negócio e acessa o banco pelo Prisma. O service não conhece `req` nem `res`, e o controller não conhece o Prisma.
</details>

<details>
<summary>Onde fica a validação e por que em dois lugares?</summary>

A validação de **formato** fica nos schemas Zod, aplicados pelo middleware `validate` antes do controller: tipos, campos obrigatórios, tamanho mínimo, valores permitidos. A validação que depende do **banco** fica no service: o cliente existe? o número já foi usado? Uma não substitui a outra. O Zod não consulta o banco, e o service não deveria se preocupar com "isso é texto ou número?".
</details>

<details>
<summary>Como garantem que o usuário não escolha outro responsável para o processo?</summary>

O `usuarioId` não está no schema de criação, então o Zod o descarta se vier no corpo. O controller passa `req.usuario.id`, que veio do token JWT validado, e o service usa esse valor. O responsável é sempre quem estava logado no cadastro.
</details>

<details>
<summary>Por que o DELETE responde 204 e não 200?</summary>

`204 No Content` significa "deu certo e não há nada para devolver". Como o processo deixou de existir, não há corpo na resposta. O `200` é para quando a resposta tem conteúdo.
</details>

<details>
<summary>O que acontece em GET /api/processos/999?</summary>

O `idParamSchema` aceita o 999 (é inteiro positivo), o controller chama `buscarPorId(999)`, o Prisma devolve `null`, e o service lança `new AppError('Processo não encontrado', 404)`. O Express 5 entrega o erro ao `errorHandler`, que responde `404 { "erro": "Processo não encontrado" }`.
</details>
