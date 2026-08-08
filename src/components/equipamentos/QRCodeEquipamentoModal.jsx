import React, { useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { X, Printer } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

const SITE_URL = "https://geradordepmoc.com.br";

export default function QRCodeEquipamentoModal({ equipamento, cliente, onClose }) {
  const qrWrapRef = useRef(null);
  const url = `${SITE_URL}/e/${equipamento.id}`;

  const imprimirEtiqueta = () => {
    const svg = qrWrapRef.current?.querySelector("svg");
    if (!svg) return;
    const svgMarkup = svg.outerHTML;

    const html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Etiqueta QR — ${equipamento.numero_equipamento || ''}</title>
<style>
  @page { size: 50mm 50mm; margin: 2mm; }
  html, body { margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .etiqueta { width: 46mm; box-sizing: border-box; padding: 2mm; text-align: center; }
  .etiqueta svg { width: 34mm; height: 34mm; }
  .titulo { font-size: 9px; font-weight: 700; margin: 1mm 0 0; }
  .sub { font-size: 7px; color: #444; margin: 0.5mm 0 0; }
  @media screen { body { padding: 24px; display: flex; justify-content: center; } .etiqueta { border: 1px dashed #ccc; } }
</style>
</head>
<body>
  <div class="etiqueta">
    ${svgMarkup}
    <p class="titulo">${equipamento.numero_equipamento || `${equipamento.marca} ${equipamento.modelo}`}</p>
    ${cliente?.nome ? `<p class="sub">${cliente.nome}</p>` : ''}
    <p class="sub">Aponte a câmera para abrir chamado ou ver histórico</p>
  </div>
</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html' });
    const blobUrl = URL.createObjectURL(blob);
    const printWindow = window.open(blobUrl, '_blank');
    if (printWindow) {
      printWindow.onload = () => {
        setTimeout(() => printWindow.print(), 500);
      };
      printWindow.onafterprint = () => URL.revokeObjectURL(blobUrl);
    } else {
      URL.revokeObjectURL(blobUrl);
      toast({ description: 'O navegador bloqueou a janela de impressão. Libere pop-ups e tente novamente.', variant: "destructive" });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="qrcode-title">
      <div className="w-full max-w-sm rounded-t-2xl bg-background p-6 shadow-xl sm:rounded-2xl">
        <div className="flex items-start justify-between mb-4">
          <h2 id="qrcode-title" className="text-lg font-semibold text-foreground">QR Code do Equipamento</h2>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Fechar">
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div ref={qrWrapRef} className="flex justify-center bg-white p-4 rounded-xl border">
          <QRCodeSVG value={url} size={180} />
        </div>

        <div className="text-center mt-3">
          <p className="font-medium text-foreground">{equipamento.numero_equipamento || `${equipamento.marca} ${equipamento.modelo}`}</p>
          {cliente?.nome && <p className="text-sm text-muted-foreground">{cliente.nome}</p>}
          <p className="text-xs text-muted-foreground mt-2 break-all">{url}</p>
        </div>

        <p className="text-xs text-muted-foreground mt-3">
          Cole essa etiqueta no equipamento. Ao escanear, qualquer pessoa pode abrir um chamado de manutenção ou (com o código de acesso do cliente) consultar o histórico completo — sem precisar de login.
        </p>

        <div className="mt-5 flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onClose}>Fechar</Button>
          <Button className="flex-1 bg-indigo-600 hover:bg-indigo-700" onClick={imprimirEtiqueta}>
            <Printer className="w-4 h-4 mr-2" />
            Imprimir Etiqueta
          </Button>
        </div>
      </div>
    </div>
  );
}
