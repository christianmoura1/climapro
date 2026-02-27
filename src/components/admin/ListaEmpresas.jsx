import React, { useState } from 'react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  Building2, 
  Tag, 
  Calendar,
  Ban,
  CheckCircle,
  AlertTriangle,
  Trash2,
  Clock,
  Users,
  UserCog,
  ChevronDown,
  ChevronUp,
  Settings
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

import GerenciarModulos from "./GerenciarModulos";

const statusConfig = {
  ativa: {
    color: "bg-green-100 text-green-800 border-green-200",
    icon: CheckCircle,
    label: "Ativa"
  },
  suspensa: {
    color: "bg-orange-100 text-orange-800 border-orange-200",
    icon: AlertTriangle,
    label: "Suspensa"
  },
  inativa: {
    color: "bg-gray-100 text-gray-800 border-gray-200",
    icon: Ban,
    label: "Inativa"
  }
};

const statusPagamentoConfig = {
  ativo: {
    color: "bg-green-100 text-green-800",
    label: "✅ Em dia"
  },
  pendente: {
    color: "bg-orange-100 text-orange-800",
    label: "⚠️ Pendente"
  },
  bloqueado: {
    color: "bg-red-100 text-red-800",
    label: "🚫 Bloqueado"
  }
};

const planoConfig = {
  free: { color: "bg-gray-100 text-gray-800", label: "Free", preco: "Gratuito" },
  intermediario: { color: "bg-blue-100 text-blue-800", label: "Intermediário", preco: "R$ 59,90/mês" },
  avancado: { color: "bg-purple-100 text-purple-800", label: "Avançado", preco: "R$ 99,90/mês" }
};

export default function ListaEmpresas({ empresas, tecnicos = [], clientes = [], onUpdateStatus, onUpdatePlan, onDelete, onConfirmarPagamento, onUpdateModulos }) {
  const [expandedEmpresa, setExpandedEmpresa] = useState(null);

  const calcularDiasRestantes = (dataVencimento) => {
    if (!dataVencimento) return null;
    const hoje = new Date();
    const vencimento = new Date(dataVencimento);
    const dias = differenceInDays(vencimento, hoje);
    return dias;
  };

  if (empresas.length === 0) {
    return (
      <div className="p-12 text-center text-gray-500">
        <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <p className="text-lg font-medium mb-2">Nenhuma empresa cadastrada</p>
        <p className="text-sm">Clique em "Nova Empresa" para começar</p>
      </div>
    );
  }

  return (
    <div className="divide-y">
      {empresas.map((empresa) => {
        const status = statusConfig[empresa.status] || statusConfig.ativa;
        const StatusIcon = status.icon;
        const plano = planoConfig[empresa.plano] || planoConfig.free;
        const statusPagamento = statusPagamentoConfig[empresa.status_pagamento || 'ativo'];
        const diasRestantes = calcularDiasRestantes(empresa.data_vencimento_plano);

        const tecnicosDaEmpresa = tecnicos.filter(t => t.empresa_id === empresa.id && t.status === 'ativo').length;
        const clientesDaEmpresa = clientes.filter(c => c.empresa_id === empresa.id).length;

        const isExpanded = expandedEmpresa === empresa.id;

        return (
          <Collapsible
            key={empresa.id}
            open={isExpanded}
            onOpenChange={() => setExpandedEmpresa(isExpanded ? null : empresa.id)}
          >
            <div className="p-6 hover:bg-gray-50 transition-colors">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
                      <Building2 className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">{empresa.nome}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Tag className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-600 font-mono">
                          ID: {empresa.slug_empresa}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-gray-500">CNPJ</p>
                      <p className="font-medium text-gray-900">{empresa.cnpj}</p>
                    </div>
                    {empresa.telefone && (
                      <div>
                        <p className="text-sm text-gray-500">Telefone</p>
                        <p className="font-medium text-gray-900">{empresa.telefone}</p>
                      </div>
                    )}
                    {empresa.email_contato && (
                      <div>
                        <p className="text-sm text-gray-500">Email</p>
                        <p className="font-medium text-gray-900">{empresa.email_contato}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-sm text-gray-500">Cadastrado em</p>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <p className="font-medium text-gray-900">
                          {empresa.created_date 
                            ? format(new Date(empresa.created_date), "dd/MM/yyyy", { locale: ptBR })
                            : 'N/A'}
                        </p>
                      </div>
                    </div>
                    
                    {empresa.data_vencimento_plano && empresa.plano !== 'free' && (
                      <div>
                        <p className="text-sm text-gray-500">Vencimento do Plano</p>
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <p className="font-medium text-gray-900">
                            {format(new Date(empresa.data_vencimento_plano), "dd/MM/yyyy", { locale: ptBR })}
                          </p>
                        </div>
                      </div>
                    )}

                    <div>
                      <p className="text-sm text-gray-500">Técnicos / Clientes</p>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1">
                          <UserCog className="w-4 h-4 text-teal-500" />
                          <span className="font-medium text-gray-900">{tecnicosDaEmpresa}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Users className="w-4 h-4 text-green-500" />
                          <span className="font-medium text-gray-900">{clientesDaEmpresa}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className={`${status.color} border`}>
                      <StatusIcon className="w-3 h-3 mr-1" />
                      {status.label}
                    </Badge>
                    <Badge className={statusPagamento.color}>
                      {statusPagamento.label}
                    </Badge>
                    <Badge className={plano.color}>
                      {plano.label} - {plano.preco}
                    </Badge>
                    
                    {diasRestantes !== null && empresa.plano !== 'free' && (
                      <Badge className={`${
                        diasRestantes <= 0 ? 'bg-red-100 text-red-800' :
                        diasRestantes <= 7 ? 'bg-orange-100 text-orange-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        <Clock className="w-3 h-3 mr-1" />
                        {diasRestantes <= 0 ? 'Vencido' : `${diasRestantes} dias restantes`}
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 ml-4">
                  <CollapsibleTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Settings className="w-4 h-4 mr-2" />
                      Módulos
                      {isExpanded ? <ChevronUp className="w-4 h-4 ml-2" /> : <ChevronDown className="w-4 h-4 ml-2" />}
                    </Button>
                  </CollapsibleTrigger>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        Status
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => onUpdateStatus(empresa.id, 'ativa')}>
                        <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
                        Ativar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onUpdateStatus(empresa.id, 'suspensa')}>
                        <AlertTriangle className="w-4 h-4 mr-2 text-orange-500" />
                        Suspender
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onUpdateStatus(empresa.id, 'inativa')}>
                        <Ban className="w-4 h-4 mr-2 text-gray-500" />
                        Desativar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        Alterar Plano
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem 
                        onClick={() => onUpdatePlan(empresa.id, 'free')}
                        disabled={empresa.plano === 'free'}
                      >
                        Free
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => onUpdatePlan(empresa.id, 'intermediario')}
                        disabled={empresa.plano === 'intermediario'}
                      >
                        Intermediário (30 dias)
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => onUpdatePlan(empresa.id, 'avancado')}
                        disabled={empresa.plano === 'avancado'}
                      >
                        Avançado (30 dias)
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {(empresa.status_pagamento === 'pendente' || empresa.status_pagamento === 'bloqueado') && (
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700"
                      onClick={() => onConfirmarPagamento(empresa.id)}
                    >
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Confirmar Pgto
                    </Button>
                  )}

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta ação não pode ser desfeita. Isso excluirá permanentemente a empresa 
                          <strong> {empresa.nome}</strong> e todos os seus dados.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => onDelete(empresa.id)}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          Sim, excluir empresa
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>

              <CollapsibleContent>
                <GerenciarModulos 
                  empresa={empresa} 
                  onUpdateModulos={onUpdateModulos}
                />
              </CollapsibleContent>
            </div>
          </Collapsible>
        );
      })}
    </div>
  );
}