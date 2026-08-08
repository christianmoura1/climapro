import React, { useCallback, useEffect, useState } from "react";
import { CloudOff, RefreshCw, CheckCircle2 } from "lucide-react";
import { contarPendentes, estaOnline, iniciarSincronizacaoAutomatica } from "@/lib/outbox";
// Registra o handler de finalização de chamado na outbox. O import precisa
// existir em algum lugar carregado sempre, senão a fila acorda sem saber
// processar o que foi gravado numa sessão anterior.
import "@/lib/sincronizacaoChamado";

// Barra fixa que aparece só quando há algo a dizer: sem conexão, ou com ações
// esperando para subir. Fora isso não ocupa espaço na tela.
export default function StatusConexao() {
  const [online, setOnline] = useState(estaOnline());
  const [pendentes, setPendentes] = useState(0);
  const [acabouDeSincronizar, setAcabouDeSincronizar] = useState(false);

  const atualizarContagem = useCallback(async () => {
    const total = await contarPendentes();
    setPendentes((anterior) => {
      if (anterior > 0 && total === 0) {
        setAcabouDeSincronizar(true);
        setTimeout(() => setAcabouDeSincronizar(false), 4000);
      }
      return total;
    });
  }, []);

  useEffect(() => {
    const aoFicarOnline = () => setOnline(true);
    const aoFicarOffline = () => setOnline(false);
    window.addEventListener('online', aoFicarOnline);
    window.addEventListener('offline', aoFicarOffline);

    const parar = iniciarSincronizacaoAutomatica(atualizarContagem);
    atualizarContagem();

    return () => {
      window.removeEventListener('online', aoFicarOnline);
      window.removeEventListener('offline', aoFicarOffline);
      parar?.();
    };
  }, [atualizarContagem]);

  if (online && pendentes === 0 && !acabouDeSincronizar) return null;

  const plural = pendentes === 1 ? 'ação' : 'ações';

  let estilo = 'bg-amber-500 text-white';
  let icone = <CloudOff className="w-4 h-4 shrink-0" />;
  let texto = 'Sem conexão. O que você salvar fica no aparelho e sobe quando o sinal voltar.';

  if (online && pendentes > 0) {
    estilo = 'bg-blue-600 text-white';
    icone = <RefreshCw className="w-4 h-4 shrink-0 animate-spin" />;
    texto = `Enviando ${pendentes} ${plural} que ficaram pendentes...`;
  } else if (!online && pendentes > 0) {
    texto = `Sem conexão. ${pendentes} ${plural} aguardando o sinal voltar.`;
  } else if (online && acabouDeSincronizar) {
    estilo = 'bg-green-600 text-white';
    icone = <CheckCircle2 className="w-4 h-4 shrink-0" />;
    texto = 'Tudo sincronizado.';
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed bottom-0 inset-x-0 z-[60] flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium shadow-lg print:hidden ${estilo}`}
    >
      {icone}
      <span className="text-center">{texto}</span>
    </div>
  );
}
