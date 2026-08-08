import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit, Cpu, MapPin, Calendar, Trash2, Eye, QrCode } from "lucide-react"; // Import Eye icon
import { format } from "date-fns";
import { useNavigate } from 'react-router-dom';
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { statusManutencao, STATUS_MANUTENCAO_CONFIG, LABEL_PERIODICIDADE } from "@/lib/pmocChecklist";

// This is a placeholder for `createPageUrl`. In a real application,
// this function would typically be imported from a routing utility
// or defined globally based on your project's routing strategy (e.g., Next.js, Remix, custom).
// For this standalone file to be functional, a basic implementation is provided.
const createPageUrl = (pageName) => {
  switch (pageName) {
    case "EquipamentoDetalhes":
      return "/equipamentos/detalhes"; // Adjust this path to your actual equipment details page route
    // Add other cases as needed for different page names
    default:
      return `/${pageName.toLowerCase()}`;
  }
};

const tipoConfig = {
  ar_condicionado: { label: "Ar Condicionado", color: "bg-blue-100 text-blue-800" },
  camara_fria: { label: "Câmara Fria", color: "bg-cyan-100 text-cyan-800" },
  geladeira: { label: "Geladeira", color: "bg-green-100 text-green-800" },
  freezer: { label: "Freezer", color: "bg-purple-100 text-purple-800" },
  chiller: { label: "Chiller", color: "bg-indigo-100 text-indigo-800" },
  outro: { label: "Outro", color: "bg-muted text-foreground" }
};

export default function EquipamentosList({ equipamentos, clientes, isLoading, onEdit, onDelete, onView, onQrCode }) {
  const navigate = useNavigate(); // Initialize useNavigate hook

  if (isLoading) {
    return (
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="shadow-sm border-none rounded-xl">
            <CardContent className="p-6 space-y-3">
              <Skeleton className="h-5 w-24 rounded-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
              <Skeleton className="h-3 w-2/3" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (equipamentos.length === 0) {
    return (
      <Card className="shadow-sm border-none rounded-xl">
        <EmptyState
          icon={Cpu}
          title="Nenhum equipamento cadastrado"
          description='Clique em "Novo Equipamento" para começar a controlar seu parque de máquinas.'
        />
      </Card>
    );
  }

  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
      {equipamentos.map((equipamento) => {
        const tipo = tipoConfig[equipamento.tipo] || tipoConfig.outro;
        const cliente = clientes?.find(c => c.id === equipamento.cliente_id); // Use optional chaining

        return (
          <Card
            key={equipamento.id}
            className="shadow-lg border-none hover:shadow-xl transition-shadow cursor-pointer"
            // The onClick navigation from the card itself is removed as per the outline's new button structure
          >
            <CardContent className="p-6"> {/* CardContent now has p-6 directly */}
              {/* Foto do equipamento - will now have padding due to p-6 on CardContent */}
              {equipamento.foto_url ? (
                <img
                  src={equipamento.foto_url}
                  alt={equipamento.numero_equipamento}
                  className="w-full h-48 object-cover rounded-t-lg mb-4" // Added mb-4 for spacing
                />
              ) : (
                <div className="w-full h-48 bg-gradient-to-br from-indigo-100 to-indigo-200 flex items-center justify-center rounded-t-lg mb-4"> {/* Added mb-4 */}
                  <Cpu className="w-16 h-16 text-indigo-400" />
                </div>
              )}

              <div className="flex justify-between items-start mb-3">
                <div>
                  <div className="flex flex-wrap gap-2 mb-2">
                    <Badge className={tipo.color}>
                      {tipo.label}
                    </Badge>
                    {equipamento.pmoc_ativo && (
                      <Badge variant="outline" className={STATUS_MANUTENCAO_CONFIG[statusManutencao(equipamento.proxima_manutencao, equipamento.ultima_manutencao)].cor}>
                        {STATUS_MANUTENCAO_CONFIG[statusManutencao(equipamento.proxima_manutencao, equipamento.ultima_manutencao)].label}
                      </Badge>
                    )}
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">
                    {equipamento.numero_equipamento}
                  </h3>
                  {equipamento.pmoc_ativo && equipamento.periodicidade_pmoc && (
                    <p className="text-xs text-purple-600 font-medium mt-0.5">
                      PMOC {LABEL_PERIODICIDADE[equipamento.periodicidade_pmoc]}
                    </p>
                  )}
                </div>
                {/* Original Edit/Delete buttons are removed from here */}
              </div>

              <div className="space-y-2 mb-4">
                <div className="text-sm">
                  <span className="font-medium text-foreground">Marca:</span>
                  <span className="text-muted-foreground ml-2">{equipamento.marca}</span>
                </div>
                <div className="text-sm">
                  <span className="font-medium text-foreground">Modelo:</span>
                  <span className="text-muted-foreground ml-2">{equipamento.modelo}</span>
                </div>
                {equipamento.capacidade && (
                  <div className="text-sm">
                    <span className="font-medium text-foreground">Capacidade:</span>
                    <span className="text-muted-foreground ml-2">{equipamento.capacidade}</span>
                  </div>
                )}
              </div>

              {cliente && (
                <div className="text-sm text-muted-foreground mb-2 flex items-start gap-2">
                  <span className="font-medium">Cliente:</span>
                  <span>{cliente.nome}</span>
                </div>
              )}

              {equipamento.estabelecimento_nome && (
                <div className="flex items-center gap-2 text-sm text-indigo-600 mb-1">
                  <MapPin className="w-4 h-4 text-indigo-400" />
                  <span className="font-medium">📍 {equipamento.estabelecimento_nome}</span>
                </div>
              )}

              {equipamento.localizacao && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <span>{equipamento.localizacao}</span>
                </div>
              )}

              {equipamento.data_instalacao && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span>Instalado em {format(new Date(equipamento.data_instalacao), "dd/MM/yyyy")}</span>
                </div>
              )}

              {/* New action buttons */}
              <div className="mt-4 grid grid-cols-3 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="col-span-2"
                  onClick={() => onView(equipamento)}
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Ver Histórico
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEdit(equipamento)}
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Editar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onQrCode(equipamento)}
                >
                  <QrCode className="w-4 h-4 mr-2" />
                  QR Code
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onDelete(equipamento)}
                  className="text-red-600 hover:text-red-700"
                  aria-label={`Excluir equipamento ${equipamento.numero_equipamento}`}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}