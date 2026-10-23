// Compressão de imagem no navegador, antes de subir e antes de entrar no PDF.
//
// Por que existe: a câmera do celular manda foto de 1,7 MB e o ClimaPro
// guardava exatamente isso. Em três meses o bucket passou de 3 GB, o Supabase
// restringiu o projeto e ninguém mais conseguiu entrar — inclusive cliente
// pagante. A foto de um ar-condicionado no telhado não precisa de 4000px para
// provar que foi feita a manutenção.
//
// Duas regras que não podem ser quebradas aqui:
//
// 1. Falha na compressão NUNCA bloqueia o envio. O técnico fecha chamado em
//    telhado, com 3G ruim e o celular que ele tem. Se o canvas falhar, sobe o
//    arquivo original — grande é melhor que perdido.
// 2. Orientação do iPhone precisa ser respeitada. Foto de iPhone vem com a
//    rotação no EXIF; desenhar no canvas descarta o EXIF, e sem tratar isso a
//    foto chega deitada no relatório que o hotel arquiva.

// Lado maior da imagem depois de redimensionar.
// 1600px cobre com folga o uso real: visualizar na tela e imprimir no A4.
export const LADO_UPLOAD = 1600;
// No PDF a foto é desenhada com uns 90mm de largura. 1000px dá cerca de
// 280 dpi nesse tamanho, acima do que qualquer impressora de escritório usa.
export const LADO_PDF = 1000;

export const QUALIDADE = 0.72;

// Abaixo disso não vale o risco de recomprimir: ganho pequeno e toda
// recompressão perde um pouco de qualidade.
export const MINIMO_PARA_COMPRIMIR = 120 * 1024;

// PNG continua PNG. Converter para JPEG encheria de preto o fundo das
// assinaturas e dos recortes transparentes, que é pior do que o tamanho.
export function tipoDeSaida(mime) {
  if (mime === 'image/png') return 'image/png';
  if (mime === 'image/jpeg' || mime === 'image/jpg' || mime === 'image/webp') return 'image/jpeg';
  return null;
}

export function ehImagemComprimivel(file) {
  return tipoDeSaida(file?.type) !== null;
}

// Tamanho de destino mantendo a proporção. Imagem menor que o limite passa
// batido: aumentar não melhora nada e só gera arquivo maior.
export function calcularDestino(largura, altura, ladoMaximo) {
  if (!largura || !altura) return null;
  const maior = Math.max(largura, altura);
  if (maior <= ladoMaximo) return { largura, altura, redimensionou: false };
  const escala = ladoMaximo / maior;
  return {
    largura: Math.max(1, Math.round(largura * escala)),
    altura: Math.max(1, Math.round(altura * escala)),
    redimensionou: true,
  };
}

// Vale a pena mexer neste arquivo?
export function vaiComprimir(file, ladoMaximo = LADO_UPLOAD) {
  if (!ehImagemComprimivel(file)) return false;
  // Arquivo já pequeno fica como está, independente da dimensão.
  if ((file.size ?? 0) < MINIMO_PARA_COMPRIMIR) return false;
  return ladoMaximo > 0;
}

// Decide entre o resultado da compressão e o original. Recomprimir JPEG de
// câmera às vezes engorda o arquivo; nesse caso o original ganha.
export function escolherMenor(original, comprimido) {
  if (!comprimido || !comprimido.size) return original;
  return comprimido.size < original.size ? comprimido : original;
}

// Decodifica respeitando a orientação do EXIF. O createImageBitmap resolve
// isso sozinho; o caminho do <img> é reserva para navegador que não tem.
async function decodificar(file) {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file, { imageOrientation: 'from-image' });
    } catch {
      // Safari antigo não aceita a opção: tenta sem ela antes de desistir.
      try {
        return await createImageBitmap(file);
      } catch {
        /* cai no <img> */
      }
    }
  }

  const url = URL.createObjectURL(file);
  try {
    return await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('não consegui decodificar a imagem'));
      img.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

function paraBlob(canvas, tipo, qualidade) {
  return new Promise((resolve) => {
    if (canvas.toBlob) canvas.toBlob((b) => resolve(b), tipo, qualidade);
    else resolve(null);
  });
}

/**
 * Devolve um File comprimido, ou o próprio original se não der para melhorar.
 * Nunca lança: quem chama não precisa de try/catch.
 */
export async function comprimirImagem(file, { ladoMaximo = LADO_UPLOAD, qualidade = QUALIDADE } = {}) {
  if (!vaiComprimir(file, ladoMaximo)) return file;

  const tipo = tipoDeSaida(file.type);
  let fonte = null;
  try {
    fonte = await decodificar(file);
    const largura = fonte.naturalWidth || fonte.width;
    const altura = fonte.naturalHeight || fonte.height;
    const destino = calcularDestino(largura, altura, ladoMaximo);
    if (!destino) return file;

    const canvas = document.createElement('canvas');
    canvas.width = destino.largura;
    canvas.height = destino.altura;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    // Fundo branco só no JPEG, que não tem transparência: sem isso a área
    // transparente vira preta.
    if (tipo === 'image/jpeg') {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    ctx.drawImage(fonte, 0, 0, destino.largura, destino.altura);

    const blob = await paraBlob(canvas, tipo, qualidade);
    if (!blob) return file;

    const nome = tipo === 'image/jpeg' ? file.name.replace(/\.(png|webp|jpe?g)$/i, '.jpg') : file.name;
    const comprimido = new File([blob], nome, { type: tipo, lastModified: Date.now() });
    return escolherMenor(file, comprimido);
  } catch (erro) {
    console.warn('[comprimirImagem] segui com o arquivo original:', erro);
    return file;
  } finally {
    if (fonte && typeof fonte.close === 'function') fonte.close();
  }
}

/**
 * Mesma compressão, para quem já tem um dataURL em mãos — é o caso do PDF,
 * que baixa a foto do Storage antes de desenhar. Devolve o dataURL original
 * em qualquer falha.
 */
export async function comprimirDataUrl(dataUrl, { ladoMaximo = LADO_PDF, qualidade = QUALIDADE } = {}) {
  if (!dataUrl || !dataUrl.startsWith('data:image/')) return dataUrl;
  try {
    const resposta = await fetch(dataUrl);
    const blob = await resposta.blob();
    const arquivo = new File([blob], 'foto', { type: blob.type });
    const menor = await comprimirImagem(arquivo, { ladoMaximo, qualidade });
    if (menor === arquivo) return dataUrl;
    return await new Promise((resolve) => {
      const leitor = new FileReader();
      leitor.onloadend = () => resolve(leitor.result || dataUrl);
      leitor.onerror = () => resolve(dataUrl);
      leitor.readAsDataURL(menor);
    });
  } catch (erro) {
    console.warn('[comprimirDataUrl] segui com a imagem original:', erro);
    return dataUrl;
  }
}
