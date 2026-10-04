// Corpo HTML do e-mail de conclusão do chamado.
//
// O send-email manda o `body` como `html` para o Resend, então texto puro com
// \n chegava numa parede única. Aqui sai um e-mail de verdade, que é o que o
// cliente final recebe junto do PDF.
//
// HTML de e-mail é conservador de propósito: tabela, estilo em linha e nada de
// flex ou grid. Gmail e Outlook descartam folha de estilo e quebram layout
// moderno.

const escapar = (valor) =>
  String(valor ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const paraHtml = (texto) => escapar(texto).replace(/\n/g, "<br>");

function linha(rotulo, valor) {
  if (!valor) return "";
  return `
    <tr>
      <td style="padding:6px 0;color:#6b7280;font-size:13px;width:150px;vertical-align:top;">${escapar(rotulo)}</td>
      <td style="padding:6px 0;color:#1f2937;font-size:13px;font-weight:600;">${escapar(valor)}</td>
    </tr>`;
}

function bloco(titulo, texto) {
  if (!texto) return "";
  return `
    <p style="margin:18px 0 4px;color:#6b7280;font-size:11px;letter-spacing:.6px;text-transform:uppercase;font-weight:700;">${escapar(titulo)}</p>
    <p style="margin:0;color:#1f2937;font-size:14px;line-height:1.6;">${paraHtml(texto)}</p>`;
}

export function montarEmailRelatorio({ chamado, cliente, tecnico, empresa, urlRelatorio }) {
  const numero = chamado?.numero_chamado || chamado?.id?.slice(0, 8) || "";
  const nomeEmpresa = empresa?.nome || "ClimaPro";

  const concluido = chamado?.data_finalizacao
    ? new Date(chamado.data_finalizacao).toLocaleString("pt-BR", {
        day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
      })
    : null;

  const proxima = chamado?.data_lembrete_proxima_manutencao
    ? new Date(`${chamado.data_lembrete_proxima_manutencao}T12:00:00`).toLocaleDateString("pt-BR")
    : null;

  const botaoPdf = urlRelatorio
    ? `
      <tr><td style="padding:24px 0 0;">
        <a href="${escapar(urlRelatorio)}"
           style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;
                  padding:12px 22px;border-radius:6px;font-size:14px;font-weight:600;">
          Baixar relatório em PDF
        </a>
        <p style="margin:10px 0 0;color:#9ca3af;font-size:11px;">
          Se o botão não abrir, copie e cole este endereço no navegador:<br>
          <span style="color:#6b7280;word-break:break-all;">${escapar(urlRelatorio)}</span>
        </p>
      </td></tr>`
    : "";

  const assunto = `Serviço concluído - ${chamado?.titulo || "Chamado"} #${numero}`;

  const corpo = `
<div style="margin:0;padding:0;background:#f3f4f6;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
             style="max-width:600px;background:#ffffff;border-radius:10px;overflow:hidden;
                    font-family:Arial,Helvetica,sans-serif;">

        <tr><td style="background:#17305c;padding:22px 28px;">
          <p style="margin:0;color:#ffffff;font-size:17px;font-weight:700;">${escapar(nomeEmpresa)}</p>
          <p style="margin:4px 0 0;color:#93c5fd;font-size:12px;">Relatório de atendimento #${escapar(numero)}</p>
        </td></tr>

        <tr><td style="padding:26px 28px 0;">
          <p style="margin:0 0 6px;color:#1f2937;font-size:16px;font-weight:700;">Serviço concluído</p>
          <p style="margin:0;color:#4b5563;font-size:14px;line-height:1.6;">
            Olá, ${escapar(cliente?.nome || "tudo bem")}. O atendimento abaixo foi finalizado.
          </p>
        </td></tr>

        <tr><td style="padding:20px 28px 0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
                 style="background:#f7f8fa;border:1px solid #e2e8f0;border-radius:8px;padding:14px 16px;">
            ${linha("Serviço", chamado?.titulo)}
            ${linha("Chamado", `#${numero}`)}
            ${linha("Técnico", tecnico?.nome)}
            ${linha("Concluído em", concluido)}
            ${linha("Local", chamado?.local || cliente?.endereco)}
            ${linha("Acompanhado por", chamado?.nome_cliente_confirmacao)}
          </table>
        </td></tr>

        <tr><td style="padding:4px 28px 0;">
          ${bloco("Problema relatado", chamado?.descricao)}
          ${bloco("O que foi feito", chamado?.observacoes_tecnico)}
          ${bloco("Observações da empresa", chamado?.observacoes_empresa)}
        </td></tr>

        ${proxima ? `
        <tr><td style="padding:18px 28px 0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
                 style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:12px 16px;">
            <tr>
              <td style="color:#2563eb;font-size:13px;font-weight:700;">Próxima manutenção prevista</td>
              <td align="right" style="color:#1f2937;font-size:13px;font-weight:700;">${escapar(proxima)}</td>
            </tr>
          </table>
        </td></tr>` : ""}

        <tr><td style="padding:0 28px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            ${botaoPdf}
          </table>
        </td></tr>

        <tr><td style="padding:26px 28px 28px;">
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:0 0 14px;">
          <p style="margin:0;color:#6b7280;font-size:12px;line-height:1.6;">
            <strong style="color:#1f2937;">${escapar(nomeEmpresa)}</strong><br>
            ${empresa?.telefone ? `${escapar(empresa.telefone)}<br>` : ""}
            ${empresa?.email_contato ? `${escapar(empresa.email_contato)}<br>` : ""}
            ${empresa?.endereco ? escapar(empresa.endereco) : ""}
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</div>`;

  return { assunto, corpo };
}
