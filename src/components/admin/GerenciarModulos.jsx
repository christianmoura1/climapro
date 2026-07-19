
import React, { useState } from 'react';
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  ClipboardList, 
  Users, 
  Cpu, 
  UserCog, 
  Calendar, 
  DollarSign, 
  FileText,
  Clock // Added Clock icon import
} from "lucide-react";

const modulosDisponiveis = [
  { id: 'chamados', label: 'Chamados', icon: ClipboardList, color: 'text-blue-600' },
  { id: 'clientes', label: 'Clientes', icon: Users, color: 'text-green-600' },
  { id: 'equipamentos', label: 'Equipamentos', icon: Cpu, color: 'text-indigo-600' },
  { id: 'tecnicos', label: 'Técnicos', icon: UserCog, color: 'text-teal-600' },
  { id: 'agenda', label: 'Agenda', icon: Calendar, color: 'text-orange-600' },
  { id: 'ponto_eletronico', label: 'Ponto Eletrônico', icon: Clock, color: 'text-blue-600' }, // New module added
  { id: 'pmoc', label: 'PMOC', icon: Calendar, color: 'text-purple-600' },
  { id: 'financeiro', label: 'Financeiro', icon: DollarSign, color: 'text-orange-600' },
  { id: 'notas_fiscais', label: 'Notas Fiscais', icon: FileText, color: 'text-indigo-600' }
];

export default function GerenciarModulos({ empresa, onUpdateModulos }) {
  const [modulos, setModulos] = useState(empresa.modulos_ativos || {
    chamados: true,
    clientes: true,
    equipamentos: true,
    tecnicos: true,
    agenda: true,
    ponto_eletronico: true, // New module set to true by default
    pmoc: true,
    financeiro: false,
    notas_fiscais: false
  });

  const handleToggle = async (moduloId) => {
    const novosModulos = {
      ...modulos,
      [moduloId]: !modulos[moduloId]
    };
    
    setModulos(novosModulos);
    await onUpdateModulos(empresa.id, novosModulos, moduloId, !modulos[moduloId]);
  };

  const modulosAtivos = Object.values(modulos).filter(Boolean).length;

  return (
    <Card className="mt-4">
      <CardHeader className="pb-3 bg-muted">
        <CardTitle className="text-sm font-semibold text-foreground flex items-center justify-between">
          <span>Módulos Ativos ({modulosAtivos}/{modulosDisponiveis.length})</span>
          <Badge variant="outline" className="text-xs">
            Configurável
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {modulosDisponiveis.map((modulo) => {
            const Icon = modulo.icon;
            const isAtivo = modulos[modulo.id];
            
            return (
              <div
                key={modulo.id}
                className={`
                  flex items-center justify-between p-3 rounded-lg border-2 transition-all
                  ${isAtivo 
                    ? 'border-green-200 bg-green-50' 
                    : 'border-border bg-muted opacity-60'
                  }
                `}
              >
                <div className="flex items-center gap-2">
                  <Icon className={`w-5 h-5 ${isAtivo ? modulo.color : 'text-muted-foreground'}`} />
                  <Label 
                    htmlFor={`modulo-${modulo.id}-${empresa.id}`}
                    className="text-sm font-medium cursor-pointer"
                  >
                    {modulo.label}
                  </Label>
                </div>
                <Switch
                  id={`modulo-${modulo.id}-${empresa.id}`}
                  checked={isAtivo}
                  onCheckedChange={() => handleToggle(modulo.id)}
                />
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
