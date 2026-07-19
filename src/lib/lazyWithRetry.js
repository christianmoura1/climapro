import React from "react";

const RELOAD_FLAG = "climapro-chunk-reload";

// React.lazy com autorrecuperação: quando o site é atualizado (deploy novo),
// navegadores com a versão antiga aberta tentam baixar chunks cujo hash mudou
// e recebem 404 ("Failed to fetch dynamically imported module"). Nesse caso,
// recarregamos a página UMA vez para pegar o index.html novo; se falhar de
// novo (erro real de rede), o erro sobe normalmente para o error boundary.
export function lazyWithRetry(importer) {
  return React.lazy(async () => {
    try {
      const mod = await importer();
      sessionStorage.removeItem(RELOAD_FLAG);
      return mod;
    } catch (error) {
      if (typeof window !== "undefined" && !sessionStorage.getItem(RELOAD_FLAG)) {
        sessionStorage.setItem(RELOAD_FLAG, "1");
        window.location.reload();
        return new Promise(() => {});
      }
      throw error;
    }
  });
}
