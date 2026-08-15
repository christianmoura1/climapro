import React, { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { supabase } from "@/api/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { MessageCircle, Send, Save, CheckCircle2, AlertCircle, Clock } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "@/components/ui/use-toast";

const EVENTOS = [
  {
    chave: "chamado_aberto",
    titulo: "Chamado aberto",
    descricao: "Todo chamado novo, inclusive os que entram pelo QR code do equipamento.",
  },
  {
    chave: "orcamento_respondido",
    titulo: "Orçamento respondido",
    descricao: "Quando o cliente aprova ou recusa um orçamento pelo link público.",
  },
  {
    chave: "alerta",
    titulo: "Alertas do sistema",
    descricao: "PMOC atrasado, equipamento com chamado repetido, orçamento parado, cliente sumido.",
  },
];

const STATUS = {
  pendente: { rotulo: "Na fila", cor: "bg-amber-100 text-amber-800", Icone: Clock },
  enviando: { rotulo: "Enviando", cor: "bg-blue-100 text-blue-800", Icone: Clock },
  enviado: { rotulo: "Enviado", cor: "bg-green-100 text-green-800", Icone: CheckCircle2 },
  erro: { rotulo: "Falhou", cor: "bg-red-100 text-red-800", Icone: AlertCircle },
  cancelado: { rotulo: "Cancelado", cor: "bg-muted text-foreground", Icone: AlertCircle },
};

// Mesma regra do normalizar_whatsapp() do banco, só que aqui serve para mostrar
// ao usuário o número exato que vai ser usado. Se os dois discordarem, quem
// manda é o banco — este aqui é enfeite, não validação.
function previewNumero(bruto) {
  const digitos = String(bruto || "").replace(/\D/g, "");
  if (!digitos) return null;
  if (digitos.length >= 12 && digitos.startsWith("55")) return digitos;
  if (digitos.length === 10 || digitos.length === 11) return `55${digitos}`;
  return digitos;
}

export default function NotificacoesWhatsApp({ empresa }) {
  const queryClient = useQueryClient();
  const [destino, setDestino] = useState("");
  const [ativo, setAtivo] = useState(false);
  const [eventos, setEventos] = useState({});

  useEffect(() => {
    if (!empresa) return;
    setDestino(empresa.whatsapp_destino || "");
    setAtivo(!!empresa.whatsapp_ativo);
    setEventos(empresa.whatsapp_eventos || {});
  }, [empresa]);

  const { data: historico = [] } = useQuery({
    queryKey: ["whatsapp-historico", empresa?.id],
    queryFn: () =>
      base44.entities.WhatsappMensagem.filter({ empresa_id: empresa.id }, "-created_date", 10),
    enabled: !!empresa?.id,
    // a mensagem sai em segundos; sem isso a lista fica mostrando "Na fila"
    // para sempre e parece que quebrou
    refetchInterval: 10000,
  });

  const salvar = useMutation({
    mutationFn: () =>
      base44.entities.Empresa.update(empresa.id, {
        whatsapp_destino: destino.trim() || null,
        whatsapp_ativo: ativo,
        whatsapp_eventos: eventos,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["minha-empresa"] });
      toast({ description: "Configuração de WhatsApp salva.", variant: "success" });
    },
    onError: (erro) =>
      toast({ description: erro.message || "Não consegui salvar.", variant: "destructive" }),
  });

  const testar = useMutation({
    mutationFn: async () => {
      // Precisa ir direto no supabase: o adapter base44 só fala com tabelas,
      // não tem caminho para RPC.
      const { error } = await supabase.rpc("whatsapp_enfileirar_teste", {
        p_empresa_id: empresa.id,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-historico", empresa?.id] });
      toast({
        description: "Mensagem de teste na fila. Deve chegar em alguns segundos.",
        variant: "success",
      });
    },
    onError: (erro) =>
      toast({ description: erro.message || "Não consegui enfileirar o teste.", variant: "destructive" }),
  });

  const numeroFinal = previewNumero(destino);
  const salvoENaoTemNumero = ativo && !numeroFinal;

  return (
    <Card className="shadow-lg border-none mt-6">
      <CardHeader className="border-b bg-gradient-to-r from-green-50 to-emerald-50">
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-green-600" />
          Notificações por WhatsApp
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          O ClimaPro manda as mensagens do número dele para o seu. Você não precisa deixar
          nenhum celular conectado.
        </p>
      </CardHeader>

      <CardContent className="pt-6 space-y-6">
        <div className="space-y-2">
          <Label htmlFor="whatsapp_destino">Número que vai receber</Label>
          <Input
            id="whatsapp_destino"
            value={destino}
            onChange={(e) => setDestino(e.target.value)}
            placeholder="(11) 93624-3089"
            inputMode="tel"
          />
          {numeroFinal ? (
            <p className="text-xs text-muted-foreground">
              As mensagens vão para <span className="font-mono">{numeroFinal}</span>. Pode digitar
              com DDD, parênteses e traço que o sistema arruma.
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Digite com DDD. Se for de fora do Brasil, comece com o código do país.
            </p>
          )}
        </div>

        <div className="flex items-center justify-between rounded-lg border p-4">
          <div className="pr-4">
            <p className="font-medium">Receber notificações</p>
            <p className="text-sm text-muted-foreground">
              Desligado aqui, nada é enviado — nem os eventos marcados abaixo.
            </p>
          </div>
          <Switch checked={ativo} onCheckedChange={setAtivo} />
        </div>

        {salvoENaoTemNumero && (
          <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-3">
            Você ligou as notificações mas não cadastrou um número. Nada vai ser enviado até
            preencher o campo acima.
          </p>
        )}

        <Separator />

        <div className="space-y-3">
          <p className="font-medium">O que avisar</p>
          {EVENTOS.map((evento) => (
            <div key={evento.chave} className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium">{evento.titulo}</p>
                <p className="text-xs text-muted-foreground">{evento.descricao}</p>
              </div>
              <Switch
                checked={eventos[evento.chave] !== false}
                disabled={!ativo}
                onCheckedChange={(marcado) =>
                  setEventos((atual) => ({ ...atual, [evento.chave]: marcado }))
                }
              />
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-3">
          <Button
            onClick={() => salvar.mutate()}
            disabled={salvar.isPending}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Save className="w-4 h-4 mr-2" />
            {salvar.isPending ? "Salvando..." : "Salvar"}
          </Button>
          <Button
            variant="outline"
            onClick={() => testar.mutate()}
            disabled={testar.isPending || !numeroFinal}
          >
            <Send className="w-4 h-4 mr-2" />
            {testar.isPending ? "Enviando..." : "Enviar teste"}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          O teste funciona mesmo com as notificações desligadas — serve justamente para conferir o
          número antes de ligar.
        </p>

        {historico.length > 0 && (
          <>
            <Separator />
            <div className="space-y-2">
              <p className="font-medium">Últimas mensagens</p>
              {historico.map((mensagem) => {
                const config = STATUS[mensagem.status] || STATUS.pendente;
                const Icone = config.Icone;
                return (
                  <div key={mensagem.id} className="flex items-start gap-3 rounded-md border p-3">
                    <Badge className={`${config.cor} shrink-0 gap-1`}>
                      <Icone className="w-3 h-3" />
                      {config.rotulo}
                    </Badge>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm truncate">{mensagem.texto.split("\n")[0]}</p>
                      <p className="text-xs text-muted-foreground">
                        {mensagem.created_at
                          ? format(new Date(mensagem.created_at), "dd/MM 'às' HH:mm", { locale: ptBR })
                          : "—"}
                        {mensagem.tentativas > 1 && ` · ${mensagem.tentativas} tentativas`}
                      </p>
                      {mensagem.status === "erro" && mensagem.erro && (
                        <p className="text-xs text-red-600 mt-1 break-words">{mensagem.erro}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
