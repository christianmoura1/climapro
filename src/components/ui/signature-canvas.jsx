import React, { useCallback, useEffect, useState } from "react";

// Canvas de assinatura por ponteiro (mouse, dedo, caneta). Nasceu dentro do
// ExecutarManutencaoModal do PMOC e foi extraído para ser usado também na
// aprovação pública de orçamento — os dois capturam assinatura do cliente.
export function SignatureCanvas({ canvasRef, width = 600, height = 200, label, onChange }) {
  const [isDrawing, setIsDrawing] = useState(false);

  const setupCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    }
  }, [canvasRef]);

  useEffect(() => setupCanvas(), [setupCanvas]);

  const getCoordinates = (event) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) * (canvas.width / rect.width),
      y: (event.clientY - rect.top) * (canvas.height / rect.height),
    };
  };

  const startDrawing = (event) => {
    event.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      if (event.pointerId != null && typeof canvas.setPointerCapture === 'function') {
        canvas.setPointerCapture(event.pointerId);
      }
    } catch {
      // Alguns WebViews do iOS expõem a API, mas recusam a captura.
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    setupCanvas();
    const { x, y } = getCoordinates(event);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (event) => {
    event.preventDefault();
    if (!isDrawing || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;
    const { x, y } = getCoordinates(event);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = (event) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    try {
      if (
        canvas &&
        event.pointerId != null &&
        typeof canvas.releasePointerCapture === 'function' &&
        (typeof canvas.hasPointerCapture !== 'function' || canvas.hasPointerCapture(event.pointerId))
      ) {
        canvas.releasePointerCapture(event.pointerId);
      }
    } catch {
      // O traço ainda pode ser finalizado sem captura explícita do ponteiro.
    }
    setIsDrawing(false);
    onChange?.(true);
  };

  return (
    <div className="overflow-hidden rounded-xl border-2 border-slate-300 bg-white shadow-inner focus-within:border-primary">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        onPointerDown={startDrawing}
        onPointerMove={draw}
        onPointerUp={stopDrawing}
        onPointerCancel={stopDrawing}
        className="block h-auto w-full cursor-crosshair touch-none"
        style={{ aspectRatio: `${width} / ${height}` }}
        role="img"
        tabIndex={0}
        aria-label={label}
      />
    </div>
  );
}

export function limparAssinatura(canvasRef, onClear) {
  const canvas = canvasRef.current;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  onClear?.(false);
}

export function isCanvasEmpty(canvasRef) {
  const canvas = canvasRef.current;
  if (!canvas) return true;
  const ctx = canvas.getContext('2d');
  if (!ctx) return true;
  const pixelBuffer = new Uint32Array(
    ctx.getImageData(0, 0, canvas.width, canvas.height).data.buffer
  );
  return !pixelBuffer.some((color) => color !== 0);
}

export function getCanvasDataURL(canvasRef) {
  return canvasRef.current ? canvasRef.current.toDataURL() : '';
}

export default SignatureCanvas;
