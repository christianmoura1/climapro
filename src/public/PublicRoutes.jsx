import React from "react";
import { Route, Routes } from "react-router-dom";
import EquipamentoPublico from "@/pages/public/EquipamentoPublico";
import OrcamentoPublico from "@/pages/public/OrcamentoPublico";

export default function PublicRoutes() {
  return (
    <Routes>
      <Route path="/e/:id" element={<EquipamentoPublico />} />
      <Route path="/orcamento/:token" element={<OrcamentoPublico />} />
    </Routes>
  );
}
