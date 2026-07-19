import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Upload, FileText, Download, Trash2, Eye } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";

export default function DocumentosCliente({ cliente }) {
  const [uploading, setUploading] = useState(false);
  const [tipoDoc, setTipoDoc] = useState("laudo");
  const queryClient = useQueryClient();

  const updateClienteMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Cliente.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['clientes']);
    }
  });

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validar tamanho (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert("Arquivo muito grande. Máximo 10MB.");
      return;
    }

    setUploading(true);
    try {
      const result = await base44.integrations.Core.UploadFile({ file });
      
      const novoDoc = {
        nome: file.name,
        tipo: tipoDoc,
        url: result.file_url,
        data_upload: new Date().toISOString(),
        tecnico_responsavel: ""
      };

      const documentosAtualizados = [...(cliente.documentos || []), novoDoc];
      
      await updateClienteMutation.mutateAsync({
        id: cliente.id,
        data: { documentos: documentosAtualizados }
      });

      alert("Documento enviado com sucesso!");
    } catch (error) {
      console.error("Erro ao fazer upload:", error);
      alert("Erro ao enviar documento. Tente novamente.");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (index) => {
    if (!confirm("Deseja realmente excluir este documento?")) return;

    const documentosAtualizados = cliente.documentos.filter((_, i) => i !== index);
    await updateClienteMutation.mutateAsync({
      id: cliente.id,
      data: { documentos: documentosAtualizados }
    });
  };

  const documentos = cliente.documentos || [];

  return (
    <Card className="shadow-lg border-none">
      <CardHeader>
        <CardTitle>Documentos e Laudos</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Upload */}
        <div className="border-2 border-dashed border-border rounded-lg p-6">
          <div className="flex flex-col items-center gap-4">
            <Upload className="w-12 h-12 text-muted-foreground" />
            <div className="w-full max-w-xs">
              <select
                value={tipoDoc}
                onChange={(e) => setTipoDoc(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mb-3"
              >
                <option value="laudo">Laudo</option>
                <option value="contrato">Contrato</option>
                <option value="orcamento">Orçamento</option>
                <option value="pmoc">PMOC</option>
                <option value="outro">Outro</option>
              </select>
            </div>
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.xlsx,.xls,.doc,.docx"
              onChange={handleUpload}
              disabled={uploading}
              className="hidden"
              id="doc-upload"
            />
            <label
              htmlFor="doc-upload"
              className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg inline-flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              {uploading ? 'Enviando...' : 'Selecionar Arquivo'}
            </label>
            <p className="text-xs text-muted-foreground text-center">
              PDF, Imagens, Excel ou Word - Máximo 10MB
            </p>
          </div>
        </div>

        {/* Lista de Documentos */}
        {documentos.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="w-12 h-12 mx-auto mb-2 text-gray-300" />
            <p>Nenhum documento cadastrado ainda</p>
          </div>
        ) : (
          <div className="space-y-3">
            {documentos.map((doc, index) => (
              <div key={index} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted">
                <div className="flex items-center gap-3 flex-1">
                  <FileText className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="font-medium text-foreground">{doc.nome}</p>
                    <div className="flex gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {doc.tipo}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(doc.data_upload), "dd/MM/yyyy")}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.open(doc.url, '_blank')}
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    Ver
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const link = document.createElement('a');
                      link.href = doc.url;
                      link.download = doc.nome;
                      link.click();
                    }}
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-red-600 hover:text-red-700"
                    onClick={() => handleDelete(index)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}