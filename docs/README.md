# Documentação de estudo

Esta pasta explica **como o projeto funciona e por quê**. Ela foi escrita para nós dois estudarmos antes das apresentações: o professor pode perguntar a qualquer um sobre qualquer parte do código.

Leia na ordem. Cada documento é escrito no momento em que a parte correspondente é construída.

| # | Documento | Assunto |
|---|---|---|
| 00 | [Visão geral](00-visao-geral.md) | O que estamos construindo, o que o professor exige e como o projeto se organiza |
| 01 | [Inicialização e banco](01-inicializacao-e-banco.md) | Como a API liga, o caminho de uma requisição, o tratamento de erros, o Express 5 e o Prisma |
| 02 | [Camadas e CRUD](02-camadas-e-crud.md) | Rotas → controllers → services seguindo um `POST /processos`, validação com Zod e endpoints de Clientes e Processos |
| 03 | [Autenticação](03-autenticacao.md) | Cadastro e login, hash de senha com bcrypt, JWT e o middleware de rota protegida |

## Como usar estes documentos para estudar

1. Leia o documento com o código aberto ao lado. Os nomes de arquivo citados existem no repositório.
2. No fim de cada documento há uma seção **"Perguntas prováveis na arguição"**. Tente responder em voz alta, sem olhar, antes de conferir a resposta.
3. Rode a API e repita a requisição citada no texto. Ver a resposta de verdade fixa melhor do que só ler.
