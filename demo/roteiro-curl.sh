#!/usr/bin/env bash
# Roteiro da demonstração da API com curl (plano B da apresentação).
#
# Uso:  ./demo/roteiro-curl.sh            (pausa a cada passo: Enter para seguir)
#       SEM_PAUSA=1 ./demo/roteiro-curl.sh
#
# Pré-requisitos: API rodando (npm run dev em backend/) e banco vazio ou
# sem o e-mail/CPF/número usados abaixo.

API="${API_URL:-http://localhost:3000/api}"
TOKEN=""

# Formata o JSON da resposta (usa o Node, que já está instalado para a API).
formatar() {
  node -e '
    let s = "";
    process.stdin.on("data", (d) => (s += d)).on("end", () => {
      try { console.log(JSON.stringify(JSON.parse(s), null, 2)); } catch { console.log(s || "(sem corpo)"); }
    });'
}

# passo "Título" MÉTODO /caminho ['{"json":"opcional"}'] [sem-token]
passo() {
  local titulo="$1" metodo="$2" caminho="$3" corpo="$4" sem_token="$5"
  local args=(-s -X "$metodo" "$API$caminho" -w '\n%{http_code}')

  [ -n "$corpo" ] && args+=(-H 'Content-Type: application/json' -d "$corpo")
  [ -n "$TOKEN" ] && [ -z "$sem_token" ] && args+=(-H "Authorization: Bearer $TOKEN")

  echo
  echo "━━━ $titulo"
  echo "    $metodo $caminho"
  [ -n "$corpo" ] && echo "    corpo: $corpo"
  [ -n "$TOKEN" ] && [ -z "$sem_token" ] && echo "    Authorization: Bearer ${TOKEN:0:20}…"

  local saida status
  saida=$(curl "${args[@]}")
  status=$(tail -n1 <<<"$saida")
  RESPOSTA=$(sed '$d' <<<"$saida")

  echo "◀── $status"
  formatar <<<"$RESPOSTA"

  [ -z "$SEM_PAUSA" ] && read -r -p $'\n[Enter para continuar] '
}

passo "API no ar?" GET /health

passo "Cadastro de usuário (senha vira hash bcrypt)" POST /auth/register \
  '{"nome":"Guilherme","email":"gui@exemplo.com","senha":"123456"}'

passo "Validação: dados inválidos → 400" POST /auth/register \
  '{"nome":"G","email":"nao-e-email","senha":"1"}'

passo "Login com senha errada → 401" POST /auth/login \
  '{"email":"gui@exemplo.com","senha":"errada"}'

passo "Login → recebe o JWT" POST /auth/login \
  '{"email":"gui@exemplo.com","senha":"123456"}'
TOKEN=$(node -pe 'JSON.parse(require("fs").readFileSync(0)).token' <<<"$RESPOSTA")

passo "Rota protegida SEM token → 401" GET /processos "" sem-token

passo "Rota protegida COM token → 200" GET /auth/me

passo "Criar cliente (CPF com pontuação é aceito)" POST /clientes \
  '{"nome":"Maria Silva","cpf":"123.456.789-09","email":"maria@exemplo.com"}'

passo "Criar processo (responsável = usuário do token)" POST /processos \
  '{"numero":"5001234-56.2026.8.24.0023","vara":"2ª Vara Cível","comarca":"Florianópolis","clienteId":1}'

passo "Validação do processo → 400 com a lista de campos" POST /processos \
  '{"numero":"","vara":"","comarca":"Florianópolis","clienteId":"um","status":"pausado"}'

passo "Listar processos (com cliente e responsável)" GET /processos

passo "Atualizar só o status (PATCH)" PATCH /processos/1 '{"status":"arquivado"}'

passo "Cliente com seus processos" GET /clientes/1

passo "Excluir processo → 204" DELETE /processos/1

passo "Buscar o processo excluído → 404" GET /processos/1

echo
echo "Fim do roteiro."
