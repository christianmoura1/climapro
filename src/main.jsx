import React from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import App from "@/App.jsx";
import "@/index.css";

const rootElement = document.getElementById("root");

if (rootElement.hasChildNodes()) {
  hydrateRoot(rootElement, <App />);
} else {
  createRoot(rootElement).render(<App />);
}

// Service worker: faz o app abrir sem rede, para o técnico conseguir fechar o
// chamado em casa de máquinas e subsolo. Registrado depois do load para não
// disputar banda com o primeiro render.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((erro) => {
      console.warn('[ClimaPro] Service worker não registrado:', erro);
    });
  });
}
