// Espelha src/marketing/site-config.js, mas para as rotas públicas dinâmicas:
// o QR code por equipamento (/e/:id) e a aprovação de orçamento pelo cliente
// (/orcamento/:token). Nenhuma delas é página de marketing (não são
// pré-renderizadas, não entram em publicPages) nem parte do app autenticado.
export function isPublicEquipmentPath(pathname = "/") {
  return /^\/e\/[^/]+\/?$/.test(pathname);
}

export function isPublicOrcamentoPath(pathname = "/") {
  return /^\/orcamento\/[^/]+\/?$/.test(pathname);
}

export function isPublicAppPath(pathname = "/") {
  return isPublicEquipmentPath(pathname) || isPublicOrcamentoPath(pathname);
}
