import React from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { 
  ArrowLeft, 
  Download, 
  CheckCircle, 
  Circle, 
  Mail
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function PMOCDetail({ pmoc, cliente, tecnico, onClose, onUpdate }) {
  const handleGerarPDF = async () => {
    try {
      const prompt = `Gere um relatório PMOC profissional em formato JSON com os seguintes dados:

Cliente: ${cliente?.nome}
Endereço: ${cliente?.endereco}
Técnico: ${tecnico?.nome || 'Não atribuído'}
Periodicidade: ${pmoc.periodicidade}
Data início: ${pmoc.data_inicio}
Próxima manutenção: ${pmoc.proxima_manutencao}

Checklist:
${pmoc.atividades?.map((a, i) => `${i + 1}. ${a.descricao} - ${a.concluido ? 'OK' : 'Pendente'}`).join('\n')}

Observações: ${pmoc.observacoes || 'Nenhuma'}

Formate como um documento oficial PMOC conforme norma brasileira.`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            titulo: { type: "string" },
            conteudo_html: { type: "string" }
          }
        }
      });

      console.log("PDF gerado:", result);
      alert("PDF gerado com sucesso! Verifique o console para mais detalhes.");
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      alert("Erro ao gerar PDF. Tente novamente.");
    }
  };

  const handleEnviarEmail = async () => {
    if (cliente?.email) {
      try {
        await base44.integrations.Core.SendEmail({
          to: cliente.email,
          subject: `PMOC - ${cliente.nome}`,
          body: `Segue em anexo o relatório PMOC.\n\nPeriodicidade: ${pmoc.periodicidade}\nPróxima manutenção: ${pmoc.proxima_manutencao}\n\nAtenciosamente,\nEquipe ClimaPro`
        });
        alert("E-mail enviado com sucesso!");
      } catch (error) {
        console.error("Erro ao enviar e-mail:", error);
        alert("Erro ao enviar e-mail. Tente novamente.");
      }
    } else {
      alert("Cliente não possui e-mail cadastrado.");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-purple-50 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={onClose}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Detalhes do PMOC</h1>
              <p className="text-muted-foreground mt-1">{cliente?.nome}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleGerarPDF}>
              <Download className="w-4 h-4 mr-2" />
              Baixar PDF
            </Button>
            <Button variant="outline" onClick={handleEnviarEmail}>
              <Mail className="w-4 h-4 mr-2" />
              Enviar E-mail
            </Button>
          </div>
        </div>

        <div className="grid lg:grid-cols-1 gap-6">
          {/* Informações */}
          <Card className="shadow-lg border-none">
            <CardHeader>
              <CardTitle>Informações do PMOC</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Cliente</Label>
                  <p className="font-semibold text-foreground">{cliente?.nome}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Endereço</Label>
                  <p className="text-foreground">{cliente?.endereco}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Técnico Responsável</Label>
                  <p className="text-foreground">{tecnico?.nome || 'Não atribuído'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Periodicidade</Label>
                  <Badge className="bg-purple-100 text-purple-800">
                    {pmoc.periodicidade}
                  </Badge>
                </div>
                <div>
                  <Label className="text-muted-foreground">Data de Início</Label>
                  <p className="text-foreground">
                    {pmoc.data_inicio ? format(new Date(pmoc.data_inicio), "dd/MM/yyyy", { locale: ptBR }) : 'N/A'}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Próxima Manutenção</Label>
                  <p className="font-semibold text-orange-600">
                    {pmoc.proxima_manutencao ? format(new Date(pmoc.proxima_manutencao), "dd/MM/yyyy", { locale: ptBR }) : 'N/A'}
                  </p>
                </div>
              </div>

              {/* Checklist */}
              <div>
                <Label className="text-lg font-semibold mb-3 block">Checklist de Manutenção</Label>
                <div className="space-y-2">
                  {pmoc.atividades?.map((atividade, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                      {atividade.concluido ? (
                        <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                      ) : (
                        <Circle className="w-5 h-5 text-muted-foreground/40 flex-shrink-0" />
                      )}
                      <span className={`${atividade.concluido ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {atividade.descricao}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Observações */}
              {pmoc.observacoes && (
                <div>
                  <Label className="text-muted-foreground">Observações</Label>
                  <p className="text-foreground mt-1 bg-muted p-3 rounded-lg">
                    {pmoc.observacoes}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}