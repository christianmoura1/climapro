import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit, Cpu, MapPin, Calendar, Trash2, Eye } from "lucide-react"; // Import Eye icon
import { format } from "date-fns";
import { useNavigate } from 'react-router-dom';

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
  outro: { label: "Outro", color: "bg-gray-100 text-gray-800" }
};

export default function EquipamentosList({ equipamentos, clientes, isLoading, onEdit, onDelete, onView }) {
  const navigate = useNavigate(); // Initialize useNavigate hook

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (equipamentos.length === 0) {
    return (
      <Card className="shadow-lg border-none">
        <CardContent className="p-12 text-center">
          <Cpu className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600 text-lg font-medium mb-2">Nenhum equipamento cadastrado ainda</p>
          <p className="text-gray-500 text-sm">Clique em "Novo Equipamento" para começar</p>
        </CardContent>
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
                  <Badge className={`${tipo.color} mb-2`}>
                    {tipo.label}
                  </Badge>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {equipamento.numero_equipamento}
                  </h3>
                </div>
                {/* Original Edit/Delete buttons are removed from here */}
              </div>

              <div className="space-y-2 mb-4">
                <div className="text-sm">
                  <span className="font-medium text-gray-700">Marca:</span>
                  <span className="text-gray-600 ml-2">{equipamento.marca}</span>
                </div>
                <div className="text-sm">
                  <span className="font-medium text-gray-700">Modelo:</span>
                  <span className="text-gray-600 ml-2">{equipamento.modelo}</span>
                </div>
                {equipamento.capacidade && (
                  <div className="text-sm">
                    <span className="font-medium text-gray-700">Capacidade:</span>
                    <span className="text-gray-600 ml-2">{equipamento.capacidade}</span>
                  </div>
                )}
              </div>

              {cliente && (
                <div className="text-sm text-gray-600 mb-2 flex items-start gap-2">
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
                <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  <span>{equipamento.localizacao}</span>
                </div>
              )}

              {equipamento.data_instalacao && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <span>Instalado em {format(new Date(equipamento.data_instalacao), "dd/MM/yyyy")}</span>
                </div>
              )}

              {/* New action buttons */}
              <div className="flex gap-2 mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
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
                  onClick={() => onDelete(equipamento.id)} // Changed to pass id
                  className="text-red-600 hover:text-red-700"
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