import { jsPDF } from "jspdf";

// Relatório de conclusão do chamado em PDF.
//
// Existe separado do RelatorioCompletoChamado porque aquele monta HTML e abre
// numa janela para o operador imprimir. Aqui o arquivo precisa virar um Blob
// para subir no Storage e ir no WhatsApp do cliente, sem passar por janela
// nenhuma.
//
// Sem emoji no texto: as fontes padrão do jsPDF são WinAnsi e emoji sai como
// quadrado. Acento vai bem, que é o que importa em português.

const MARGEM = 15;
const LARGURA = 210; // A4 em mm
const ALTURA = 297;
const UTIL = LARGURA - MARGEM * 2;

const AZUL = [37, 99, 235];
const CINZA = [75, 85, 99];
const PRETO = [31, 41, 55];

function formatarData(valor) {
  if (!valor) return null;
  const d = new Date(valor);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

// Busca a imagem e devolve dataURL. Volta null em qualquer falha: foto que não
// carrega não pode derrubar o relatório inteiro.
async function comoDataUrl(url) {
  if (!url) return null;
  if (url.startsWith("data:")) return url;
  try {
    const resposta = await fetch(url);
    if (!resposta.ok) return null;
    const blob = await resposta.blob();
    return await new Promise((resolve) => {
      const leitor = new FileReader();
      leitor.onloadend = () => resolve(leitor.result);
      leitor.onerror = () => resolve(null);
      leitor.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

// Proporção real da imagem, para a foto não sair esticada.
function medir(dataUrl) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
    img.onerror = () => resolve(null);
    img.src = dataUrl;
  });
}

export async function gerarRelatorioPdf({ chamado, cliente, tecnico, empresa }) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  let y = MARGEM;

  const quebrarSePreciso = (altura) => {
    if (y + altura > ALTURA - MARGEM) {
      doc.addPage();
      y = MARGEM;
    }
  };

  const titulo = (texto) => {
    quebrarSePreciso(14);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...AZUL);
    doc.text(texto, MARGEM, y);
    y += 2;
    doc.setDrawColor(229, 231, 235);
    doc.line(MARGEM, y, LARGURA - MARGEM, y);
    y += 6;
  };

  const linha = (rotulo, valor) => {
    if (!valor) return;
    const texto = String(valor);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...CINZA);
    const larguraRotulo = 45;
    const partes = doc.splitTextToSize(texto, UTIL - larguraRotulo);
    quebrarSePreciso(partes.length * 5 + 2);
    doc.text(rotulo, MARGEM, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...PRETO);
    doc.text(partes, MARGEM + larguraRotulo, y);
    y += partes.length * 5 + 1;
  };

  const paragrafo = (texto) => {
    if (!texto) return;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...PRETO);
    const partes = doc.splitTextToSize(String(texto), UTIL);
    for (const parte of partes) {
      quebrarSePreciso(5);
      doc.text(parte, MARGEM, y);
      y += 5;
    }
    y += 2;
  };

  // ---------- cabeçalho ----------
  const logo = await comoDataUrl(empresa?.logo_url);
  if (logo) {
    const tam = await medir(logo);
    if (tam) {
      const altura = Math.min(20, (40 * tam.h) / tam.w);
      const largura = (altura * tam.w) / tam.h;
      try {
        doc.addImage(logo, "PNG", MARGEM, y, largura, altura);
        y += altura + 4;
      } catch {
        // logo em formato que o jsPDF não aceita: segue sem ela
      }
    }
  }

  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...AZUL);
  doc.text(empresa?.nome || "ClimaPro", MARGEM, y);
  y += 6;

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...CINZA);
  const contato = [
    empresa?.cnpj ? `CNPJ: ${empresa.cnpj}` : null,
    empresa?.telefone,
    empresa?.email_contato,
  ].filter(Boolean).join("  |  ");
  if (contato) { doc.text(contato, MARGEM, y); y += 4; }
  if (empresa?.endereco) { doc.text(empresa.endereco, MARGEM, y); y += 4; }

  y += 2;
  doc.setDrawColor(...AZUL);
  doc.setLineWidth(0.8);
  doc.line(MARGEM, y, LARGURA - MARGEM, y);
  doc.setLineWidth(0.2);
  y += 8;

  doc.setFontSize(15);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...PRETO);
  doc.text("Relatório de Atendimento", MARGEM, y);
  y += 9;

  // ---------- dados ----------
  titulo("Informações do chamado");
  linha("Número:", `#${chamado.numero_chamado || chamado.id?.slice(0, 8)}`);
  linha("Título:", chamado.titulo);
  linha("Abertura:", formatarData(chamado.data_abertura || chamado.created_at));
  linha("Conclusão:", formatarData(chamado.data_finalizacao));
  linha("Status:", "Finalizado");
  y += 3;

  titulo("Cliente");
  linha("Nome:", cliente?.nome);
  linha("Telefone:", cliente?.telefone);
  linha("Local:", chamado.local || cliente?.endereco);
  y += 3;

  titulo("Técnico responsável");
  linha("Nome:", tecnico?.nome);
  linha("Telefone:", tecnico?.telefone);
  y += 3;

  titulo("Serviço");
  if (chamado.descricao) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...CINZA);
    quebrarSePreciso(6);
    doc.text("Problema relatado", MARGEM, y);
    y += 5;
    paragrafo(chamado.descricao);
  }
  if (chamado.observacoes_tecnico) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...CINZA);
    quebrarSePreciso(6);
    doc.text("O que foi feito", MARGEM, y);
    y += 5;
    paragrafo(chamado.observacoes_tecnico);
  }
  if (chamado.observacoes_empresa) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...CINZA);
    quebrarSePreciso(6);
    doc.text("Observações da empresa", MARGEM, y);
    y += 5;
    paragrafo(chamado.observacoes_empresa);
  }
  if (chamado.data_lembrete_proxima_manutencao) {
    const d = new Date(`${chamado.data_lembrete_proxima_manutencao}T12:00:00`);
    linha("Próxima manutenção:", d.toLocaleDateString("pt-BR"));
  }
  y += 3;

  // ---------- fotos ----------
  const fotos = (chamado.fotos_finalizacao || []).slice(0, 8);
  if (fotos.length > 0) {
    titulo("Registro fotográfico");
    const colunas = 3;
    const vao = 4;
    const largura = (UTIL - vao * (colunas - 1)) / colunas;
    let coluna = 0;
    let alturaLinha = 0;

    for (const url of fotos) {
      const dados = await comoDataUrl(url);
      if (!dados) continue;
      const tam = await medir(dados);
      const altura = tam ? Math.min((largura * tam.h) / tam.w, 55) : 40;

      if (coluna === 0) {
        quebrarSePreciso(altura + 4);
        alturaLinha = altura;
      } else {
        alturaLinha = Math.max(alturaLinha, altura);
      }

      try {
        doc.addImage(dados, "JPEG", MARGEM + coluna * (largura + vao), y, largura, altura);
      } catch {
        // formato que o jsPDF não aceita: pula essa foto
      }

      coluna += 1;
      if (coluna === colunas) {
        y += alturaLinha + vao;
        coluna = 0;
        alturaLinha = 0;
      }
    }
    if (coluna !== 0) y += alturaLinha + vao;
    y += 2;
  }

  // ---------- assinatura ----------
  const assinatura = await comoDataUrl(chamado.assinatura_cliente);
  if (assinatura) {
    titulo("Confirmação do serviço");
    const tam = await medir(assinatura);
    const largura = 70;
    const altura = tam ? Math.min((largura * tam.h) / tam.w, 35) : 25;
    quebrarSePreciso(altura + 12);
    try {
      doc.addImage(assinatura, "PNG", MARGEM, y, largura, altura);
      y += altura + 2;
    } catch {
      // assinatura ilegível para o jsPDF: segue sem a imagem
    }
    doc.setDrawColor(...CINZA);
    doc.line(MARGEM, y, MARGEM + largura, y);
    y += 4;
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...CINZA);
    doc.text(chamado.nome_cliente_confirmacao || cliente?.nome || "Cliente", MARGEM, y);
    y += 6;
  }

  // ---------- rodapé em todas as páginas ----------
  const paginas = doc.getNumberOfPages();
  for (let p = 1; p <= paginas; p++) {
    doc.setPage(p);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(156, 163, 175);
    doc.text(
      `Emitido em ${new Date().toLocaleString("pt-BR")}  |  Página ${p} de ${paginas}`,
      MARGEM,
      ALTURA - 8
    );
  }

  return doc.output("blob");
}

export function nomeDoArquivo(chamado) {
  const numero = chamado?.numero_chamado || chamado?.id?.slice(0, 8) || "chamado";
  return `relatorio-${String(numero).replace(/[^\w-]/g, "")}.pdf`;
}
