// Espelha src/marketing/site-config.js, mas para a rota pública dinâmica do
// QR code por equipamento (/e/:id) — não é uma página de marketing (não é
// pré-renderizada, não entra em publicPages) nem parte do app autenticado.
export function isPublicEquipmentPath(pathname = "/") {
  return /^\/e\/[^/]+\/?$/.test(pathname);
}
