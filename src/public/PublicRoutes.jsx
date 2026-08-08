import React from "react";
import { Route, Routes } from "react-router-dom";
import EquipamentoPublico from "@/pages/public/EquipamentoPublico";

export default function PublicRoutes() {
  return (
    <Routes>
      <Route path="/e/:id" element={<EquipamentoPublico />} />
    </Routes>
  );
}
