import { jsPDF } from "jspdf";

// Relatório de conclusão do chamado em PDF.
//
// Existe separado do RelatorioCompletoChamado porque aquele monta HTML e abre
// numa janela para o operador imprimir. Aqui o arquivo precisa virar um Blob
// para subir no Storage e ir no WhatsApp do cliente, sem passar por janela
// nenhuma.
//
// Este documento vai para a mão do cliente final e, no caso de hotel e
// condomínio, é o que fica arquivado para mostrar à fiscalização. Então o
// acabamento importa tanto quanto o conteúdo.
//
// Sem emoji: as fontes padrão do jsPDF são WinAnsi e emoji sai como quadrado.
// Acento vai bem, que é o que importa em português.

const LARGURA = 210; // A4 em mm
const ALTURA = 297;
const MARGEM = 16;
const UTIL = LARGURA - MARGEM * 2;

const MARINHO = [23, 48, 92];
const AZUL = [37, 99, 235];
const VERDE = [22, 101, 52];
const VERDE_FUNDO = [220, 252, 231];
const TEXTO = [31, 41, 55];
const SUAVE = [107, 114, 128];
const CARTAO = [247, 248, 250];
const BORDA = [226, 232, 240];
const BRANCO = [255, 255, 255];

function formatarDataHora(valor) {
  if (!valor) return null;
  const d = new Date(valor);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function formatarData(valor) {
  if (!valor) return null;
  const d = new Date(`${valor}T12:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("pt-BR");
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

function medir(dataUrl) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
    img.onerror = () => resolve(null);
    img.src = dataUrl;
  });
}

// O jsPDF exige o formato certo no addImage. Passar "JPEG" num PNG faz ele
// recusar a imagem, e como a chamada fica dentro de try/catch o resultado é
// um buraco branco no relatório, sem erro nenhum. Foi exatamente o que
// aconteceu na primeira versão.
function formatoDaImagem(dataUrl) {
  const achado = /^data:image\/([a-z0-9+]+)/i.exec(dataUrl || "");
  const tipo = (achado?.[1] || "").toUpperCase();
  if (tipo === "JPG") return "JPEG";
  return ["JPEG", "PNG", "WEBP"].includes(tipo) ? tipo : null;
}

async function prepararImagem(url) {
  const dados = await comoDataUrl(url);
  if (!dados) return null;
  const formato = formatoDaImagem(dados);
  if (!formato) {
    console.warn("[relatorioPdf] formato de imagem não suportado pelo PDF:", dados.slice(0, 30));
    return null;
  }
  const tamanho = await medir(dados);
  return { dados, formato, w: tamanho?.w || 4, h: tamanho?.h || 3 };
}

export async function gerarRelatorioPdf({ chamado, cliente, tecnico, empresa }) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  let y = 0;

  const novaPagina = () => {
    doc.addPage();
    y = MARGEM + 4;
  };

  const espaco = (altura) => {
    if (y + altura > ALTURA - 18) novaPagina();
  };

  // ============ CABEÇALHO ============
  const logo = await prepararImagem(empresa?.logo_url);
  const alturaFaixa = 34;

  doc.setFillColor(...MARINHO);
  doc.rect(0, 0, LARGURA, alturaFaixa, "F");
  // Fio de destaque embaixo da faixa
  doc.setFillColor(...AZUL);
  doc.rect(0, alturaFaixa, LARGURA, 1.2, "F");

  if (logo) {
    // A logo entra numa caixa branca: logo colorida sobre fundo marinho
    // costuma sumir, e a maioria vem com fundo transparente.
    const alturaMax = 16;
    const alturaLogo = Math.min(alturaMax, (46 * logo.h) / logo.w);
    const larguraLogo = (alturaLogo * logo.w) / logo.h;
    doc.setFillColor(...BRANCO);
    doc.roundedRect(MARGEM - 2, 9, larguraLogo + 4, alturaLogo + 4, 1.5, 1.5, "F");
    try {
      doc.addImage(logo.dados, logo.formato, MARGEM, 11, larguraLogo, alturaLogo);
    } catch (erro) {
      console.warn("[relatorioPdf] não consegui desenhar a logo:", erro);
    }
  } else {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(17);
    doc.setTextColor(...BRANCO);
    doc.text(empresa?.nome || "ClimaPro", MARGEM, 17);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(203, 213, 225);
    const contato = [empresa?.cnpj ? `CNPJ ${empresa.cnpj}` : null, empresa?.telefone]
      .filter(Boolean).join("   ");
    if (contato) doc.text(contato, MARGEM, 23);
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...BRANCO);
  doc.text("RELATÓRIO DE ATENDIMENTO", LARGURA - MARGEM, 15, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(147, 197, 253);
  doc.text(`#${chamado?.numero_chamado || chamado?.id?.slice(0, 8) || ""}`,
    LARGURA - MARGEM, 21.5, { align: "right" });
  doc.setFontSize(8);
  doc.setTextColor(203, 213, 225);
  const emissao = new Date().toLocaleDateString("pt-BR");
  doc.text(`Emitido em ${emissao}`, LARGURA - MARGEM, 27, { align: "right" });

  y = alturaFaixa + 9;

  // Linha de contato da empresa (quando a logo ocupou o espaço do nome)
  if (logo) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...TEXTO);
    doc.text(empresa?.nome || "ClimaPro", MARGEM, y);
    y += 4.5;
  }
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...SUAVE);
  const rodapeEmpresa = [
    empresa?.cnpj ? `CNPJ ${empresa.cnpj}` : null,
    empresa?.telefone,
    empresa?.email_contato,
    empresa?.endereco,
  ].filter(Boolean).join("   •   ");
  if (rodapeEmpresa) {
    for (const parte of doc.splitTextToSize(rodapeEmpresa, UTIL)) {
      doc.text(parte, MARGEM, y);
      y += 3.6;
    }
  }
  y += 5;

  // ============ FAIXA DE STATUS ============
  const dados = [
    ["Abertura", formatarDataHora(chamado?.data_abertura || chamado?.created_at) || "—"],
    ["Conclusão", formatarDataHora(chamado?.data_finalizacao) || "—"],
  ];

  doc.setFillColor(...CARTAO);
  doc.setDrawColor(...BORDA);
  doc.roundedRect(MARGEM, y, UTIL, 19, 2, 2, "FD");

  let x = MARGEM + 5;
  for (const [rotulo, valor] of dados) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...SUAVE);
    doc.text(rotulo.toUpperCase(), x, y + 7);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(...TEXTO);
    doc.text(valor, x, y + 13);
    x += 52;
  }

  // Selo de finalizado
  doc.setFillColor(...VERDE_FUNDO);
  doc.roundedRect(LARGURA - MARGEM - 34, y + 5.5, 29, 8, 4, 4, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...VERDE);
  doc.text("FINALIZADO", LARGURA - MARGEM - 19.5, y + 11, { align: "center" });

  y += 26;

  // ============ AJUDANTES DE SEÇÃO ============
  const secao = (texto) => {
    espaco(16);
    doc.setFillColor(...AZUL);
    doc.rect(MARGEM, y - 3.6, 1.6, 5, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(...MARINHO);
    doc.text(texto, MARGEM + 4.5, y);
    y += 2.5;
    doc.setDrawColor(...BORDA);
    doc.setLineWidth(0.3);
    doc.line(MARGEM, y, LARGURA - MARGEM, y);
    y += 6;
  };

  // Dois cartões lado a lado, para cliente e técnico.
  const cartaoDuplo = (esquerda, direita) => {
    const larguraCartao = (UTIL - 5) / 2;
    const linhas = Math.max(esquerda.itens.length, direita.itens.length);
    const altura = 12 + linhas * 6;
    espaco(altura + 4);

    [[esquerda, MARGEM], [direita, MARGEM + larguraCartao + 5]].forEach(([bloco, px]) => {
      doc.setFillColor(...CARTAO);
      doc.setDrawColor(...BORDA);
      doc.roundedRect(px, y, larguraCartao, altura, 2, 2, "FD");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(...AZUL);
      doc.text(bloco.titulo.toUpperCase(), px + 5, y + 7);

      let ly = y + 14;
      for (const [rotulo, valor] of bloco.itens) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(...SUAVE);
        doc.text(rotulo, px + 5, ly);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8.5);
        doc.setTextColor(...TEXTO);
        const texto = doc.splitTextToSize(String(valor || "—"), larguraCartao - 32)[0] || "—";
        doc.text(texto, px + 26, ly);
        ly += 6;
      }
    });

    y += altura + 7;
  };

  const blocoTexto = (rotulo, texto) => {
    if (!texto) return;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...SUAVE);
    espaco(10);
    doc.text(rotulo.toUpperCase(), MARGEM, y);
    y += 4.5;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(...TEXTO);
    for (const parte of doc.splitTextToSize(String(texto), UTIL - 4)) {
      espaco(5);
      doc.text(parte, MARGEM, y);
      y += 4.8;
    }
    y += 3;
  };

  // ============ CLIENTE E TÉCNICO ============
  secao("Identificação");
  cartaoDuplo(
    {
      titulo: "Cliente",
      itens: [
        ["Nome", cliente?.nome],
        ["Telefone", cliente?.telefone],
        ["Local", chamado?.local || cliente?.endereco],
      ],
    },
    {
      titulo: "Técnico responsável",
      itens: [
        ["Nome", tecnico?.nome],
        ["Telefone", tecnico?.telefone],
        ["Serviço", chamado?.titulo],
      ],
    }
  );

  // ============ SERVIÇO ============
  secao("Serviço executado");
  blocoTexto("Problema relatado", chamado?.descricao);
  blocoTexto("O que foi feito", chamado?.observacoes_tecnico);
  blocoTexto("Observações da empresa", chamado?.observacoes_empresa);

  const proxima = formatarData(chamado?.data_lembrete_proxima_manutencao);
  if (proxima) {
    espaco(14);
    doc.setFillColor(239, 246, 255);
    doc.setDrawColor(191, 219, 254);
    doc.roundedRect(MARGEM, y, UTIL, 11, 2, 2, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...AZUL);
    doc.text("Próxima manutenção prevista", MARGEM + 5, y + 7);
    doc.setTextColor(...TEXTO);
    doc.text(proxima, LARGURA - MARGEM - 5, y + 7, { align: "right" });
    y += 17;
  }

  // ============ FOTOS ============
  // Carrega tudo antes de desenhar. Assim, se nenhuma foto puder entrar, o
  // título nem é impresso, em vez de sobrar um bloco em branco.
  const fotos = [];
  for (const url of (chamado?.fotos_finalizacao || []).slice(0, 9)) {
    const imagem = await prepararImagem(url);
    if (imagem) fotos.push(imagem);
  }

  if (fotos.length > 0) {
    secao("Registro fotográfico");
    const colunas = 3;
    const vao = 5;
    const larguraBox = (UTIL - vao * (colunas - 1)) / colunas;
    const alturaBox = larguraBox * 0.75;

    let coluna = 0;
    fotos.forEach((foto, indice) => {
      if (coluna === 0) espaco(alturaBox + 10);
      const px = MARGEM + coluna * (larguraBox + vao);

      doc.setFillColor(...BRANCO);
      doc.setDrawColor(...BORDA);
      doc.roundedRect(px, y, larguraBox, alturaBox, 1.5, 1.5, "FD");

      // Encaixa a foto dentro da caixa sem distorcer
      const escala = Math.min(larguraBox / foto.w, alturaBox / foto.h);
      const lf = foto.w * escala;
      const hf = foto.h * escala;
      try {
        doc.addImage(foto.dados, foto.formato,
          px + (larguraBox - lf) / 2, y + (alturaBox - hf) / 2, lf, hf);
      } catch (erro) {
        console.warn("[relatorioPdf] não consegui desenhar uma foto:", erro);
      }

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(...SUAVE);
      doc.text(`Foto ${indice + 1}`, px + larguraBox / 2, y + alturaBox + 4, { align: "center" });

      coluna += 1;
      if (coluna === colunas) {
        y += alturaBox + 10;
        coluna = 0;
      }
    });
    if (coluna !== 0) y += alturaBox + 10;
    y += 1;
  }

  // ============ ASSINATURA ============
  const assinatura = await prepararImagem(chamado?.assinatura_cliente);
  const quemAssinou = chamado?.nome_cliente_confirmacao || cliente?.nome;

  if (assinatura || quemAssinou) {
    secao("Confirmação do serviço");
    const alturaBox = 40;
    espaco(alturaBox + 6);

    doc.setFillColor(...CARTAO);
    doc.setDrawColor(...BORDA);
    doc.roundedRect(MARGEM, y, UTIL, alturaBox, 2, 2, "FD");

    if (assinatura) {
      const larguraMax = 62;
      const alturaMax = 20;
      const escala = Math.min(larguraMax / assinatura.w, alturaMax / assinatura.h);
      const la = assinatura.w * escala;
      const ha = assinatura.h * escala;
      try {
        doc.addImage(assinatura.dados, assinatura.formato,
          MARGEM + (UTIL - la) / 2, y + 7, la, ha);
      } catch (erro) {
        console.warn("[relatorioPdf] não consegui desenhar a assinatura:", erro);
      }
    }

    doc.setDrawColor(...SUAVE);
    doc.setLineWidth(0.3);
    doc.line(MARGEM + UTIL / 2 - 35, y + 29, MARGEM + UTIL / 2 + 35, y + 29);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...TEXTO);
    doc.text(quemAssinou || "Cliente", MARGEM + UTIL / 2, y + 33.5, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...SUAVE);
    doc.text("Confirmação do serviço executado", MARGEM + UTIL / 2, y + 37.5, { align: "center" });

    y += alturaBox + 6;
  }

  // ============ RODAPÉ EM TODAS AS PÁGINAS ============
  const paginas = doc.getNumberOfPages();
  for (let p = 1; p <= paginas; p++) {
    doc.setPage(p);
    doc.setDrawColor(...BORDA);
    doc.setLineWidth(0.3);
    doc.line(MARGEM, ALTURA - 13, LARGURA - MARGEM, ALTURA - 13);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...SUAVE);
    doc.text(empresa?.nome || "ClimaPro", MARGEM, ALTURA - 8.5);
    doc.text(`Página ${p} de ${paginas}`, LARGURA - MARGEM, ALTURA - 8.5, { align: "right" });
  }

  return doc.output("blob");
}

export function nomeDoArquivo(chamado) {
  const numero = chamado?.numero_chamado || chamado?.id?.slice(0, 8) || "chamado";
  return `relatorio-${String(numero).replace(/[^\w-]/g, "")}.pdf`;
}
