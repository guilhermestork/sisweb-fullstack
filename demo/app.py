"""Cliente de demonstração da API de Gestão Jurídica.

Este app NÃO acessa o banco: tudo passa pela API em Node.js via HTTP.
Cada ação dispara uma requisição, e o painel da direita mostra exatamente
o que foi enviado e o que a API respondeu.
"""

import os

import pandas as pd
import requests
import streamlit as st

API_URL_PADRAO = os.getenv("API_URL", "http://localhost:3000/api")
STATUS_PROC = ["ativo", "arquivado", "encerrado"]

st.set_page_config(page_title="Gestão Jurídica — Demo da API", layout="wide")

ss = st.session_state
ss.setdefault("token", None)
ss.setdefault("usuario", None)
ss.setdefault("historico", [])
ss.setdefault("resultados", {})

# ── cliente HTTP ──────────────────────────────────────────────────────────────

def chamar(metodo, caminho, corpo=None, registrar=True):
    """Faz uma requisição à API e devolve (status, json).

    registrar=False é usado nas consultas "de apoio" (ex.: preencher um
    selectbox), para que o painel mostre só as requisições pedidas pelo usuário.
    """
    url = ss.api_url.rstrip("/") + caminho
    headers = {}
    if ss.enviar_token and ss.token:
        headers["Authorization"] = f"Bearer {ss.token}"

    try:
        resp = requests.request(metodo, url, json=corpo, headers=headers, timeout=10)
    except requests.ConnectionError:
        st.error(f"Não foi possível conectar em {url}. A API está rodando?")
        st.stop()

    try:
        dados = resp.json()
    except ValueError:
        dados = None

    if registrar:
        ss.historico.insert(0, {
            "metodo": metodo,
            "url": url,
            "headers": headers,
            "corpo": corpo,
            "status": resp.status_code,
            "resposta": dados,
        })
        del ss.historico[20:]
    return resp.status_code, dados


def mostrar_resultado(status, dados):
    """Mensagem curta de sucesso/erro logo abaixo do formulário."""
    if status < 400:
        st.success(f"{status} — sucesso")
        return
    st.error(f"{status} — {(dados or {}).get('erro', 'erro')}")
    detalhes = (dados or {}).get("detalhes")
    if detalhes:
        st.dataframe(pd.DataFrame(detalhes), width="stretch", hide_index=True)


def tabela(linhas):
    if not linhas:
        st.info("Nenhum registro encontrado.")
        return
    st.dataframe(pd.DataFrame(linhas), width="stretch", hide_index=True)


def linhas_clientes(clientes):
    """Troca o _count do Prisma por uma coluna simples "processos"."""
    return [
        {
            "id": c["id"],
            "nome": c["nome"],
            "cpf": c["cpf"],
            "email": c["email"],
            "telefone": c["telefone"],
            "processos": c["_count"]["processos"],
        }
        for c in clientes
    ]


def linhas_processos(processos):
    """Achata cliente/usuarioResponsavel para caber numa tabela."""
    return [
        {
            "id": p["id"],
            "numero": p["numero"],
            "cliente": p["cliente"]["nome"],
            "vara": p["vara"],
            "comarca": p["comarca"],
            "status": p["status"],
            "responsável": p["usuarioResponsavel"]["nome"],
        }
        for p in processos
    ]


def opcoes(caminho, rotulo):
    """{rótulo: id} para selectbox, buscando a lista na API sem registrar no painel."""
    status, dados = chamar("GET", caminho, registrar=False)
    if status != 200:
        st.warning(f"Não foi possível carregar {caminho} ({status}). Faça login primeiro.")
        return {}
    return {f"{item['id']} – {rotulo(item)}": item["id"] for item in dados}


def guardar(chave, status, dados):
    ss.resultados[chave] = (status, dados)


def resultado(chave):
    return ss.resultados.get(chave)

# ── barra lateral ─────────────────────────────────────────────────────────────

st.sidebar.title("Gestão Jurídica")
st.sidebar.text_input("URL da API", value=API_URL_PADRAO, key="api_url")

try:
    online = requests.get(ss.api_url.rstrip("/") + "/health", timeout=2).ok
except requests.RequestException:
    online = False
st.sidebar.markdown("API: 🟢 online" if online else "API: 🔴 offline")

if ss.usuario:
    st.sidebar.markdown(f"Logado como **{ss.usuario['nome']}**")
    if st.sidebar.button("Sair"):
        ss.token = None
        ss.usuario = None
        st.rerun()
else:
    st.sidebar.markdown("Não logado")

st.sidebar.checkbox(
    "Enviar token nas requisições",
    value=True,
    key="enviar_token",
    help="Desmarque para ver as rotas protegidas responderem 401.",
)

pagina = st.sidebar.radio("Navegação", ["Autenticação", "Clientes", "Processos"])

col_acao, col_painel = st.columns([3, 2], gap="large")

# ── páginas ───────────────────────────────────────────────────────────────────

def page_autenticacao():
    st.header("Autenticação")
    tabs = st.tabs(["Login", "Cadastro", "Meu usuário"])

    with tabs[0]:
        with st.form("login"):
            email = st.text_input("E-mail")
            senha = st.text_input("Senha", type="password")
            if st.form_submit_button("POST /auth/login"):
                status, dados = chamar("POST", "/auth/login", {"email": email, "senha": senha})
                if status == 200:
                    ss.token = dados["token"]
                    ss.usuario = dados["usuario"]
                guardar("login", status, dados)
                st.rerun()
        if resultado("login"):
            mostrar_resultado(*resultado("login"))

    with tabs[1]:
        with st.form("cadastro"):
            nome = st.text_input("Nome")
            email = st.text_input("E-mail")
            senha = st.text_input("Senha (mín. 6 caracteres)", type="password")
            if st.form_submit_button("POST /auth/register"):
                guardar("cadastro", *chamar("POST", "/auth/register", {"nome": nome, "email": email, "senha": senha}))
        if resultado("cadastro"):
            mostrar_resultado(*resultado("cadastro"))

    with tabs[2]:
        st.caption("Rota protegida: só responde com um token válido.")
        if st.button("GET /auth/me"):
            guardar("me", *chamar("GET", "/auth/me"))
        if resultado("me"):
            status, dados = resultado("me")
            mostrar_resultado(status, dados)
            if status == 200:
                st.json(dados)


def page_clientes():
    st.header("Clientes")
    tabs = st.tabs(["Listar", "Buscar por id", "Inserir"])

    with tabs[0]:
        if st.button("GET /clientes"):
            guardar("clientes", *chamar("GET", "/clientes"))
        if resultado("clientes"):
            status, dados = resultado("clientes")
            if status == 200:
                tabela(linhas_clientes(dados))
            else:
                mostrar_resultado(status, dados)

    with tabs[1]:
        cid = st.number_input("id do cliente", min_value=1, step=1, key="cli_id")
        if st.button(f"GET /clientes/{cid}"):
            guardar("cliente", *chamar("GET", f"/clientes/{cid}"))
        if resultado("cliente"):
            status, dados = resultado("cliente")
            mostrar_resultado(status, dados)
            if status == 200:
                st.json(dados)

    with tabs[2]:
        with st.form("ins_cliente"):
            nome = st.text_input("Nome completo")
            cpf = st.text_input("CPF", placeholder="123.456.789-09")
            email = st.text_input("E-mail (opcional)")
            telefone = st.text_input("Telefone (opcional)")
            if st.form_submit_button("POST /clientes"):
                corpo = {"nome": nome, "cpf": cpf}
                if email:
                    corpo["email"] = email
                if telefone:
                    corpo["telefone"] = telefone
                guardar("ins_cliente", *chamar("POST", "/clientes", corpo))
        if resultado("ins_cliente"):
            mostrar_resultado(*resultado("ins_cliente"))


def page_processos():
    st.header("Processos")
    tabs = st.tabs(["Listar", "Buscar por id", "Inserir", "Atualizar", "Excluir"])

    with tabs[0]:
        if st.button("GET /processos"):
            guardar("processos", *chamar("GET", "/processos"))
        if resultado("processos"):
            status, dados = resultado("processos")
            if status == 200:
                tabela(linhas_processos(dados))
            else:
                mostrar_resultado(status, dados)

    with tabs[1]:
        pid = st.number_input("id do processo", min_value=1, step=1, key="proc_id")
        if st.button(f"GET /processos/{pid}"):
            guardar("processo", *chamar("GET", f"/processos/{pid}"))
        if resultado("processo"):
            status, dados = resultado("processo")
            mostrar_resultado(status, dados)
            if status == 200:
                st.json(dados)

    with tabs[2]:
        opts_c = opcoes("/clientes", lambda c: c["nome"])
        with st.form("ins_processo"):
            cli_sel = st.selectbox("Cliente", list(opts_c.keys()))
            numero = st.text_input("Número do processo", placeholder="5001234-56.2026.8.24.0023")
            vara = st.text_input("Vara")
            comarca = st.text_input("Comarca")
            status_sel = st.selectbox("Status", STATUS_PROC)
            if st.form_submit_button("POST /processos"):
                corpo = {
                    "numero": numero,
                    "vara": vara,
                    "comarca": comarca,
                    "status": status_sel,
                    "clienteId": opts_c.get(cli_sel),
                }
                guardar("ins_processo", *chamar("POST", "/processos", corpo))
        if resultado("ins_processo"):
            mostrar_resultado(*resultado("ins_processo"))

    with tabs[3]:
        st.caption("PATCH envia só os campos que você alterar.")
        opts_p = opcoes("/processos", lambda p: p["numero"])
        sel = st.selectbox("Processo a atualizar", list(opts_p.keys()))
        if sel:
            atual_id = opts_p[sel]
            status, atual = chamar("GET", f"/processos/{atual_id}", registrar=False)
            if status == 200:
                opts_c = opcoes("/clientes", lambda c: c["nome"])
                cli_labels = list(opts_c.keys())
                cli_atual = next((k for k, v in opts_c.items() if v == atual["clienteId"]), cli_labels[0])
                with st.form("upd_processo"):
                    cli_sel = st.selectbox("Cliente", cli_labels, index=cli_labels.index(cli_atual))
                    numero = st.text_input("Número", value=atual["numero"])
                    vara = st.text_input("Vara", value=atual["vara"])
                    comarca = st.text_input("Comarca", value=atual["comarca"])
                    status_sel = st.selectbox("Status", STATUS_PROC, index=STATUS_PROC.index(atual["status"]))
                    if st.form_submit_button(f"PATCH /processos/{atual_id}"):
                        novos = {
                            "clienteId": opts_c[cli_sel],
                            "numero": numero,
                            "vara": vara,
                            "comarca": comarca,
                            "status": status_sel,
                        }
                        corpo = {k: v for k, v in novos.items() if v != atual[k]}
                        guardar("upd_processo", *chamar("PATCH", f"/processos/{atual_id}", corpo))
                        st.rerun()
        if resultado("upd_processo"):
            mostrar_resultado(*resultado("upd_processo"))

    with tabs[4]:
        opts_p = opcoes("/processos", lambda p: p["numero"])
        sel = st.selectbox("Processo a excluir", list(opts_p.keys()))
        if sel and st.button(f"DELETE /processos/{opts_p[sel]}", type="primary"):
            guardar("del_processo", *chamar("DELETE", f"/processos/{opts_p[sel]}"))
            st.rerun()
        if resultado("del_processo"):
            mostrar_resultado(*resultado("del_processo"))


PAGES = {
    "Autenticação": page_autenticacao,
    "Clientes": page_clientes,
    "Processos": page_processos,
}

with col_acao:
    PAGES[pagina]()

# ── painel da requisição ──────────────────────────────────────────────────────

def mascarar(headers):
    """Mostra só o começo do token, para caber na tela."""
    auth = headers.get("Authorization")
    if auth:
        return {**headers, "Authorization": auth[:30] + "…"}
    return headers


with col_painel:
    st.subheader("Requisição e resposta")
    if not ss.historico:
        st.info("Faça alguma ação ao lado para ver a requisição HTTP aqui.")
    else:
        ultima = ss.historico[0]
        st.code(f"{ultima['metodo']} {ultima['url']}", language="http")
        st.markdown("**Cabeçalhos enviados**")
        st.json(mascarar(ultima["headers"]) or {}, expanded=True)
        if ultima["corpo"] is not None:
            st.markdown("**Corpo enviado**")
            st.json(ultima["corpo"], expanded=True)
        cor = "green" if ultima["status"] < 400 else "red"
        st.markdown(f"**Resposta:** :{cor}[{ultima['status']}]")
        if ultima["resposta"] is not None:
            st.json(ultima["resposta"], expanded=True)
        else:
            st.caption("(sem corpo)")

        with st.expander(f"Histórico ({len(ss.historico)})"):
            for h in ss.historico:
                st.text(f"{h['status']}  {h['metodo']} {h['url']}")
