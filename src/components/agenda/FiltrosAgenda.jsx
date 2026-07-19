import React from "react";
import { Label } from "@/components/ui/label";
import { Filter } from "lucide-react";

export default function FiltrosAgenda({ filtros, onFiltrosChange, tecnicos }) {
  return (
    <div className="flex gap-4 mt-6 flex-wrap">
      <div className="flex items-center gap-2">
        <Filter className="w-4 h-4 text-muted-foreground" />
        <Label className="text-sm font-medium">Filtros:</Label>
      </div>

      <div className="flex items-center gap-2">
        <Label className="text-sm">Técnico:</Label>
        <select
          value={filtros.tecnico_id}
          onChange={(e) => onFiltrosChange({...filtros, tecnico_id: e.target.value})}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="todos">Todos</option>
          {tecnicos.map((tecnico) => (
            <option key={tecnico.id} value={tecnico.id}>
              {tecnico.nome}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-2">
        <Label className="text-sm">Tipo:</Label>
        <select
          value={filtros.tipo}
          onChange={(e) => onFiltrosChange({...filtros, tipo: e.target.value})}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="todos">Todos</option>
          <option value="chamado">Chamados</option>
          <option value="pmoc">PMOC</option>
          <option value="reuniao">Reuniões</option>
          <option value="outro">Outros</option>
        </select>
      </div>

      <div className="flex items-center gap-2">
        <Label className="text-sm">Status:</Label>
        <select
          value={filtros.status}
          onChange={(e) => onFiltrosChange({...filtros, status: e.target.value})}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="todos">Todos</option>
          <option value="pendente">Pendente</option>
          <option value="confirmado">Confirmado</option>
          <option value="em_andamento">Em Andamento</option>
          <option value="concluido">Concluído</option>
          <option value="cancelado">Cancelado</option>
        </select>
      </div>
    </div>
  );
}