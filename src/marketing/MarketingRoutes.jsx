import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import HomePage from "@/marketing/pages/HomePage";
import {
  PmocLandingPage,
  ServiceOrderLandingPage,
  TechnicianLandingPage,
} from "@/marketing/pages/SolutionPages";
import {
  PmocCalculatorPage,
  PmocGuidePage,
  PreventiveChecklistPage,
  ServiceOrderTemplatePage,
} from "@/marketing/pages/ResourcePages";
import "@/marketing/marketing.css";

export default function MarketingRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/LandingPage" element={<Navigate to="/" replace />} />
      <Route path="/solucoes/sistema-pmoc" element={<PmocLandingPage />} />
      <Route
        path="/solucoes/ordem-servico-ar-condicionado"
        element={<ServiceOrderLandingPage />}
      />
      <Route path="/para/tecnico-autonomo" element={<TechnicianLandingPage />} />
      <Route
        path="/recursos/modelo-ordem-servico-ar-condicionado"
        element={<ServiceOrderTemplatePage />}
      />
      <Route
        path="/recursos/checklist-manutencao-preventiva-ar-condicionado"
        element={<PreventiveChecklistPage />}
      />
      <Route path="/recursos/guia-pmoc" element={<PmocGuidePage />} />
      <Route path="/recursos/calculadora-preco-pmoc" element={<PmocCalculatorPage />} />
    </Routes>
  );
}
