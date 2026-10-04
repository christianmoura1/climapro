// Normalização do número de WhatsApp no navegador.
//
// Espelha a função normalizar_whatsapp() do banco (migration 0022). Quem manda
// é o banco: isto aqui serve para a tela mostrar antes o número que vai ser
// usado, e para desabilitar botão quando o campo está incompleto.
//
// O nono dígito NÃO é removido. Em DDD fora de São Paulo o próprio WhatsApp
// resolve isso; tirar na mão manda para um número que não existe.
export function previewNumero(bruto) {
  const digitos = String(bruto || "").replace(/\D/g, "");
  if (!digitos) return null;
  if (digitos.length >= 12 && digitos.startsWith("55")) return digitos;
  if (digitos.length === 10 || digitos.length === 11) return `55${digitos}`;
  return digitos;
}
