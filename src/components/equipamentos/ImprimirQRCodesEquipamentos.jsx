import React, { useEffect, useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "@/components/ui/use-toast";

const SITE_URL = "https://geradordepmoc.com.br";

// Componente "headless" (sem UI visível): renderiza os QR codes de todos os
// equipamentos fora da tela só pra capturar o SVG já gerado (mesma técnica
// do QRCodeEquipamentoModal), monta uma folha de etiquetas e abre a janela
// de impressão — depois se desmonta sozinho via onDone.
export default function ImprimirQRCodesEquipamentos({ equipamentos, clientes, onDone }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (equipamentos.length === 0) {
      toast({ description: "Nenhum equipamento para imprimir.", variant: "destructive" });
      onDone();
      return;
    }

    const etiquetas = equipamentos
      .map((equipamento) => {
        const svg = containerRef.current?.querySelector(`[data-eq-id="${equipamento.id}"] svg`);
        if (!svg) return null;
        const cliente = clientes?.find((c) => c.id === equipamento.cliente_id);
        return {
          svgMarkup: svg.outerHTML,
          titulo: equipamento.numero_equipamento || `${equipamento.marca} ${equipamento.modelo}`,
          subtitulo: cliente?.nome || "",
        };
      })
      .filter(Boolean);

    const html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Etiquetas QR Code — Equipamentos</title>
<style>
  @page { size: A4 portrait; margin: 10mm; }
  html, body { margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .folha { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6mm; }
  .etiqueta { border: 1px dashed #ccc; border-radius: 4px; padding: 3mm; text-align: center; break-inside: avoid; page-break-inside: avoid; }
  .etiqueta svg { width: 28mm; height: 28mm; }
  .titulo { font-size: 9px; font-weight: 700; margin: 1mm 0 0; }
  .sub { font-size: 7px; color: #444; margin: 0.5mm 0 0; }
  @media screen { body { padding: 24px; } }
</style>
</head>
<body>
  <div class="folha">
    ${etiquetas
      .map(
        (e) => `
    <div class="etiqueta">
      ${e.svgMarkup}
      <p class="titulo">${e.titulo}</p>
      ${e.subtitulo ? `<p class="sub">${e.subtitulo}</p>` : ""}
      <p class="sub">Aponte a câmera para abrir chamado ou ver histórico</p>
    </div>`
      )
      .join("")}
  </div>
</body>
</html>`;

    const blob = new Blob([html], { type: "text/html" });
    const blobUrl = URL.createObjectURL(blob);
    const printWindow = window.open(blobUrl, "_blank");
    if (printWindow) {
      printWindow.onload = () => {
        setTimeout(() => printWindow.print(), 500);
      };
      printWindow.onafterprint = () => URL.revokeObjectURL(blobUrl);
    } else {
      URL.revokeObjectURL(blobUrl);
      toast({ description: "O navegador bloqueou a janela de impressão. Libere pop-ups e tente novamente.", variant: "destructive" });
    }

    onDone();
  }, []);

  return (
    <div ref={containerRef} style={{ position: "fixed", top: -9999, left: -9999 }} aria-hidden="true">
      {equipamentos.map((equipamento) => (
        <div key={equipamento.id} data-eq-id={equipamento.id}>
          <QRCodeSVG value={`${SITE_URL}/e/${equipamento.id}`} size={140} />
        </div>
      ))}
    </div>
  );
}
