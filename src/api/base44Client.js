// Adapter Supabase com a MESMA interface que o app já usa (`base44.entities.*`,
// `base44.auth.*`, `base44.integrations.Core.*`), para não precisar reescrever
// as ~270 chamadas espalhadas pelas páginas/componentes. Ver supabase/migrations
// para o schema real por trás de cada entidade.
import { supabase } from '@/api/supabaseClient';
import { invokeEdgeFunction } from '@/lib/edgeFunctions';

const ENTITY_TABLE_MAP = {
  AgendaEvento: 'agenda_evento',
  Chamado: 'chamado',
  Cliente: 'cliente',
  ConfiguracaoFiscal: 'configuracao_fiscal',
  CreditoTecnico: 'credito_tecnico',
  Empresa: 'empresa',
  Equipamento: 'equipamento',
  Financeiro: 'financeiro',
  GastoTecnico: 'gasto_tecnico',
  GoogleCalendarConfig: 'google_calendar_config',
  LancamentoTecnico: 'lancamento_tecnico',
  LogAcao: 'log_acao',
  ManutencaoPMOC: 'manutencao_pmoc',
  MovimentacaoPeca: 'movimentacao_peca',
  MovimentacaoTecnico: 'movimentacao_tecnico',
  Peca: 'peca',
  NotaFiscal: 'nota_fiscal',
  Orcamento: 'orcamento',
  OrcamentoTecnico: 'orcamento_tecnico',
  PMOC: 'pmoc',
  PontoEletronico: 'ponto_eletronico',
  Tecnico: 'tecnico',
  ValorTecnico: 'valor_tecnico',
};

const SORT_FIELD_ALIASES = {
  created_date: 'created_at',
  updated_date: 'updated_at',
};

function tableFor(entityName) {
  const table = ENTITY_TABLE_MAP[entityName];
  if (!table) {
    throw new Error(`[base44 adapter] Entidade desconhecida: "${entityName}". Adicione o mapeamento em ENTITY_TABLE_MAP.`);
  }
  return table;
}

function parseSort(sortString) {
  if (!sortString) return null;
  const descending = sortString.startsWith('-');
  const rawField = descending ? sortString.slice(1) : sortString;
  const field = SORT_FIELD_ALIASES[rawField] || rawField;
  return { field, ascending: !descending };
}

function applySort(query, sortString) {
  const sort = parseSort(sortString);
  return sort ? query.order(sort.field, { ascending: sort.ascending }) : query;
}

function unwrap({ data, error }) {
  if (error) throw error;
  return data;
}

// O Base44 (schemaless) tolerava "" em campos de data/UUID; o Postgres não
// ("invalid input syntax for type date/uuid"). Formulários inicializam campos
// opcionais com "" — aqui, centralmente, "" vira null em toda escrita.
function sanitizeWrite(payload) {
  if (Array.isArray(payload)) return payload.map(sanitizeWrite);
  if (!payload || typeof payload !== 'object') return payload;
  const clean = {};
  for (const [key, value] of Object.entries(payload)) {
    if (value === undefined) continue;
    clean[key] = value === '' ? null : value;
  }
  return clean;
}

function makeEntityClient(entityName) {
  const table = tableFor(entityName);

  return {
    async list(sort, limit) {
      let query = supabase.from(table).select('*');
      query = applySort(query, sort);
      if (limit) query = query.limit(limit);
      return unwrap(await query);
    },

    async filter(criteria = {}, sort, limit) {
      let query = supabase.from(table).select('*');
      for (const [field, value] of Object.entries(criteria)) {
        query = query.eq(field, value);
      }
      query = applySort(query, sort);
      if (limit) query = query.limit(limit);
      return unwrap(await query);
    },

    async get(id) {
      return unwrap(await supabase.from(table).select('*').eq('id', id).maybeSingle());
    },

    async create(payload) {
      return unwrap(await supabase.from(table).insert(sanitizeWrite(payload)).select().single());
    },

    async bulkCreate(payloads) {
      return unwrap(await supabase.from(table).insert(sanitizeWrite(payloads)).select());
    },

    async update(id, payload) {
      return unwrap(await supabase.from(table).update(sanitizeWrite(payload)).eq('id', id).select().single());
    },

    async delete(id) {
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) throw error;
      return true;
    },
  };
}

const entitiesProxy = new Proxy(
  {},
  {
    get(_target, entityName) {
      return makeEntityClient(entityName);
    },
  }
);

async function fetchProfile(userId) {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
  if (error) throw error;
  return data;
}

async function me() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error) throw error;
  if (!user) throw new Error('Usuário não autenticado');

  const profile = await fetchProfile(user.id);
  return {
    id: user.id,
    email: user.email,
    full_name: profile?.full_name ?? null,
    role: profile?.tipo_usuario === 'admin_global' ? 'admin' : 'user',
    data: profile ?? {},
    ...profile,
  };
}

async function isAuthenticated() {
  const { data } = await supabase.auth.getSession();
  return !!data.session;
}

function redirectToLogin(returnUrl) {
  const params = returnUrl ? `?redirect=${encodeURIComponent(returnUrl)}` : '';
  window.location.href = `/Login${params}`;
}

async function logout(returnUrl) {
  await supabase.auth.signOut();
  if (returnUrl) {
    window.location.href = returnUrl;
  }
}

async function updateMe(partialData) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Usuário não autenticado');
  return unwrap(await supabase.from('profiles').update(partialData).eq('id', user.id).select().single());
}

async function updatePassword({ newPassword }) {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
  return true;
}

async function SendEmail({ to, subject, body }) {
  return invokeEdgeFunction('send-email', { to, subject, body });
}

async function UploadFile({ file }) {
  const path = `${crypto.randomUUID()}-${file.name}`;
  const { error: uploadError } = await supabase.storage.from('attachments').upload(path, file, {
    cacheControl: '3600',
    upsert: false,
  });
  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from('attachments').getPublicUrl(path);
  return { file_url: data.publicUrl };
}

async function InvokeLLM({ prompt, response_json_schema }) {
  return invokeEdgeFunction('invoke-llm', { prompt, response_json_schema });
}

export const base44 = {
  entities: entitiesProxy,
  auth: {
    me,
    isAuthenticated,
    redirectToLogin,
    logout,
    updateMe,
    updatePassword,
  },
  integrations: {
    Core: {
      SendEmail,
      UploadFile,
      InvokeLLM,
    },
  },
};
