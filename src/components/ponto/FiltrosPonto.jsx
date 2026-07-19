import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { format, addMonths, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function FiltrosPonto({ filtros, onFiltrosChange, tecnicos, mesReferencia, onMesChange }) {
  return (
    <Card className="shadow-lg border-none mb-8">
      <CardContent className="p-6">
        <div className="grid md:grid-cols-4 gap-4">
          {/* Seletor de mês */}
          <div>
            <Label className="text-sm font-medium text-foreground mb-2">Período</Label>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => onMesChange(subMonths(mesReferencia, 1))}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <div className="flex-1 text-center font-semibold text-foreground">
                {format(mesReferencia, 'MMMM yyyy', { locale: ptBR })}
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={() => onMesChange(addMonths(mesReferencia, 1))}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Filtro por técnico */}
          <div>
            <Label className="text-sm font-medium text-foreground mb-2">Técnico</Label>
            <select
              value={filtros.tecnico_id}
              onChange={(e) => onFiltrosChange({ ...filtros, tecnico_id: e.target.value })}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="todos">Todos os técnicos</option>
              {tecnicos.map((tecnico) => (
                <option key={tecnico.id} value={tecnico.id}>
                  {tecnico.nome}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro por status */}
          <div>
            <Label className="text-sm font-medium text-foreground mb-2">Status</Label>
            <select
              value={filtros.status}
              onChange={(e) => onFiltrosChange({ ...filtros, status: e.target.value })}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="todos">Todos</option>
              <option value="normal">Normal</option>
              <option value="editado">Editado</option>
              <option value="aprovado_manual">Aprovado Manual</option>
            </select>
          </div>

          {/* Botão de hoje */}
          <div className="flex items-end">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => onMesChange(new Date())}
            >
              Mês Atual
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}