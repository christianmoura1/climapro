"""Gera o SQL de importação dos dados do Gelax vindos do export do Base44.

Dois cuidados que motivaram este script em vez de um import direto de CSV:

1. Os arquivos exportados trazem dados de sete contas diferentes do Base44 no
   mesmo CSV. Só as linhas do empresa_id do Gelax entram — importar o resto
   jogaria dados de outras empresas dentro da conta dele.

2. Os ids do Base44 são ObjectId de 24 hex e o nosso schema usa uuid. Cada id
   vira um uuid5 derivado do original: sendo determinístico, as relações
   (equipamento -> cliente, chamado -> cliente/equipamento) continuam batendo,
   e rodar duas vezes gera os mesmos ids — o que, junto com o
   `on conflict do nothing`, torna a importação repetível sem duplicar nada.

Uso: python3 scripts/gerar-import-gelax.py
"""
import csv
import json
import os
import sys
import uuid

ORIGEM = os.environ.get("ORIGEM_CSV", "/root/.claude/uploads/ee23e7e3-2612-5112-87a9-b286871339ce")
DESTINO = os.path.join(os.path.dirname(os.path.abspath(__file__)), "import-gelax")
GELAX_BASE44 = "68f795f1fd5140cbca465aae"
NS = uuid.UUID("6ba7b812-9dad-11d1-80b4-00c04fd430c8")

# A empresa é resolvida por nome dentro do próprio SQL, para não depender de
# acertar o uuid dela aqui.
EMPRESA = "(select id from empresa where nome ilike '%gelax%')"

# As assinaturas vêm em base64 e pesam. Os chamados saem em lotes para nenhum
# arquivo passar do que o editor do Supabase aguenta colar de uma vez.
LIMITE_ARQUIVO = 220 * 1024

ARQ_CLIENTE = "70ff5ec8-Cliente_export_1.csv"
ARQ_EQUIPAMENTO = "1659aad2-Equipamento_export.csv"
ARQ_CHAMADO = "f0c5ef5e-Chamado_export_1.csv"


def novo_id(base44_id):
    return str(uuid.uuid5(NS, base44_id))


def ler(arquivo):
    caminho = os.path.join(ORIGEM, arquivo)
    if not os.path.exists(caminho):
        sys.exit(f"CSV não encontrado: {caminho}\nDefina ORIGEM_CSV apontando para a pasta dos exports.")
    with open(caminho, newline="", encoding="utf-8") as f:
        return [l for l in csv.DictReader(f) if l["empresa_id"] == GELAX_BASE44]


def txt(v):
    if v is None:
        return "null"
    v = v.strip()
    return "'" + v.replace("'", "''") + "'" if v else "null"


def txt_ou(v, padrao):
    return txt(v) if (v or "").strip() else txt(padrao)


def num(v):
    v = (v or "").strip()
    if not v:
        return "null"
    try:
        float(v)
    except ValueError:
        return "null"
    return v


def data(v):
    v = (v or "").strip()
    return "'" + v[:10] + "'" if v else "null"


def ts(v):
    v = (v or "").strip()
    return "'" + v + "'" if v else "null"


def booleano(v):
    return "true" if (v or "").strip().lower() == "true" else "false"


def jsonb(v):
    v = (v or "").strip()
    if not v:
        return "'[]'::jsonb"
    try:
        json.loads(v)
    except json.JSONDecodeError:
        return "'[]'::jsonb"
    return "'" + v.replace("'", "''") + "'::jsonb"


def array_texto(v):
    v = (v or "").strip()
    if not v:
        return "'{}'"
    try:
        itens = json.loads(v)
    except json.JSONDecodeError:
        return "'{}'"
    if not isinstance(itens, list) or not itens:
        return "'{}'"
    return "array[" + ", ".join(txt(str(i)) for i in itens) + "]::text[]"


clientes = ler(ARQ_CLIENTE)
equipamentos = ler(ARQ_EQUIPAMENTO)
chamados = ler(ARQ_CHAMADO)

ids_cliente = {c["id"] for c in clientes}
ids_equipamento = {e["id"] for e in equipamentos}

equip_validos = [e for e in equipamentos if e["cliente_id"] in ids_cliente]
cham_validos = [c for c in chamados if c["cliente_id"] in ids_cliente]
descartados = [c for c in chamados if c["cliente_id"] not in ids_cliente]

CAB_CLIENTE = """insert into cliente (id, empresa_id, nome, email, telefone, whatsapp, endereco,
  latitude, longitude, tipo_estabelecimento, observacoes, tem_acesso_portal,
  estabelecimentos, created_at) values"""

CAB_EQUIPAMENTO = """insert into equipamento (id, empresa_id, cliente_id, numero_equipamento, tipo,
  marca, modelo, capacidade, localizacao, estabelecimento_nome, data_instalacao,
  numero_serie, foto_url, ultima_manutencao, proxima_manutencao, observacoes,
  created_at) values"""

# tecnico_id fica de fora: não houve export de técnicos e apontar para um id
# inexistente quebraria a foreign key.
CAB_CHAMADO = """insert into chamado (id, empresa_id, cliente_id, equipamento_id, equipamentos_ids,
  numero_chamado, titulo, descricao, local, tipo_problema, prioridade, status,
  data_abertura, data_agendamento, data_finalizacao, fotos_anexos,
  fotos_finalizacao, videos_finalizacao, nome_cliente_confirmacao,
  assinatura_cliente, observacoes_tecnico, observacoes_empresa, origem,
  created_at) values"""

valores_cliente = []
for c in clientes:
    # telefone é NOT NULL no nosso schema
    telefone = c["telefone"].strip() or c["whatsapp"].strip() or "não informado"
    valores_cliente.append(
        f"  ('{novo_id(c['id'])}', {EMPRESA}, {txt(c['nome'])}, {txt(c['email'])}, "
        f"{txt(telefone)}, {txt(c['whatsapp'])}, {txt(c['endereco'])}, "
        f"{num(c['latitude'])}, {num(c['longitude'])}, {txt(c['tipo_estabelecimento'])}, "
        f"{txt(c['observacoes'])}, {booleano(c['tem_acesso_portal'])}, "
        f"{jsonb(c['estabelecimentos'])}, {ts(c['created_date'])})"
    )

valores_equipamento = []
for e in equip_validos:
    valores_equipamento.append(
        f"  ('{novo_id(e['id'])}', {EMPRESA}, '{novo_id(e['cliente_id'])}', "
        f"{txt(e['numero_equipamento'])}, {txt_ou(e['tipo'], 'outro')}, "
        f"{txt_ou(e['marca'], 'não informado')}, {txt_ou(e['modelo'], 'não informado')}, "
        f"{txt(e['capacidade'])}, {txt(e['localizacao'])}, {txt(e['estabelecimento_nome'])}, "
        f"{data(e['data_instalacao'])}, {txt(e['numero_serie'])}, {txt(e['foto_url'])}, "
        f"{data(e['ultima_manutencao'])}, {data(e['proxima_manutencao'])}, "
        f"{txt(e['observacoes'])}, {ts(e['created_date'])})"
    )

valores_chamado = []
for c in cham_validos:
    equip_id = (
        f"'{novo_id(c['equipamento_id'])}'"
        if c["equipamento_id"] in ids_equipamento else "null"
    )
    try:
        lista = json.loads(c["equipamentos_ids"] or "[]")
    except json.JSONDecodeError:
        lista = []
    mapeados = [novo_id(i) for i in lista if i in ids_equipamento]
    equips = (
        "array[" + ", ".join(f"'{i}'" for i in mapeados) + "]::uuid[]"
        if mapeados else "'{}'::uuid[]"
    )
    valores_chamado.append(
        f"  ('{novo_id(c['id'])}', {EMPRESA}, '{novo_id(c['cliente_id'])}', {equip_id}, {equips}, "
        f"{txt(c['numero_chamado'])}, {txt_ou(c['titulo'], 'Chamado importado')}, "
        f"{txt_ou(c['descricao'], 'Sem descrição no sistema anterior')}, "
        f"{txt(c['local'])}, {txt(c['tipo_problema'])}, {txt_ou(c['prioridade'], 'media')}, "
        f"{txt_ou(c['status'], 'pendente')}, "
        f"coalesce({ts(c['data_abertura'])}, {ts(c['created_date'])}, now()), "
        f"{ts(c['data_agendamento'])}, {ts(c['data_finalizacao'])}, "
        f"{array_texto(c['fotos_anexos'])}, {array_texto(c['fotos_finalizacao'])}, "
        f"{array_texto(c['videos_finalizacao'])}, {txt(c['nome_cliente_confirmacao'])}, "
        f"{txt(c['assinatura_cliente'])}, {txt(c['observacoes_tecnico'])}, "
        f"{txt(c['observacoes_empresa'])}, 'manual', {ts(c['created_date'])})"
    )

CABECALHO = (
    "-- Importação dos dados do Gelax Refrigeração (export do Base44).\n"
    "-- Rode os arquivos na ordem do nome, um por vez, no SQL Editor.\n"
    "-- Repetir é seguro: os ids vêm dos ids antigos e há on conflict do nothing.\n\n"
)

os.makedirs(DESTINO, exist_ok=True)
for antigo in os.listdir(DESTINO):
    os.remove(os.path.join(DESTINO, antigo))


def escrever(indice, titulo, corpo):
    nome = f"{indice:02d}_{titulo}.sql"
    caminho = os.path.join(DESTINO, nome)
    with open(caminho, "w", encoding="utf-8") as f:
        f.write(CABECALHO + corpo)
    print(f"  {nome:28s} {os.path.getsize(caminho) / 1024:6.0f} KB")


def bloco(cabecalho, valores):
    return cabecalho + "\n" + ",\n".join(valores) + "\non conflict (id) do nothing;\n"


print("arquivos gerados em scripts/import-gelax/:")
escrever(1, "clientes", bloco(CAB_CLIENTE, valores_cliente))
escrever(2, "equipamentos", bloco(CAB_EQUIPAMENTO, valores_equipamento))

lote, tamanho, indice = [], 0, 3
for v in valores_chamado:
    if lote and tamanho + len(v) > LIMITE_ARQUIVO:
        escrever(indice, f"chamados_parte{indice - 2}", bloco(CAB_CHAMADO, lote))
        lote, tamanho = [], 0
        indice += 1
    lote.append(v)
    tamanho += len(v)
if lote:
    escrever(indice, f"chamados_parte{indice - 2}", bloco(CAB_CHAMADO, lote))
    indice += 1

escrever(
    indice,
    "conferencia",
    "-- Rode depois de todos os arquivos acima.\n"
    f"select 'clientes' as tabela, count(*) from cliente where empresa_id = {EMPRESA}\n"
    f"union all select 'equipamentos', count(*) from equipamento where empresa_id = {EMPRESA}\n"
    f"union all select 'chamados', count(*) from chamado where empresa_id = {EMPRESA};\n",
)

print()
print(f"clientes:     {len(clientes)}")
print(f"equipamentos: {len(equip_validos)}")
print(f"chamados:     {len(cham_validos)} de {len(chamados)}")
if descartados:
    print(f"\n{len(descartados)} chamado(s) fora, por apontarem para cliente ausente do export:")
    for c in descartados:
        print(f"  {c['numero_chamado']} — {c['titulo'][:60]}")
