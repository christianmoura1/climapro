import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CalendarClock, Cpu, History, MapPin, QrCode } from "lucide-react";
import { format } from "date-fns";

const data = (valor) => valor ? format(new Date(`${valor}T12:00:00`), "dd/MM/yyyy") : "Não informada";

export default function EquipamentosClientePortal({ equipamentos = [], onHistorico, onQrCode }) {
  if (!equipamentos.length) return (
    <div className="py-10 text-center">
      <Cpu className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
      <p className="font-medium">Nenhum equipamento cadastrado</p>
      <p className="mt-1 text-sm text-muted-foreground">Quando a empresa cadastrar seus ativos, eles aparecerão aqui.</p>
    </div>
  );
  return <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{equipamentos.map((item) => (
    <article key={item.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:border-blue-300 hover:shadow-md">
      <div className="flex gap-4 p-4">
        {item.foto_url ? <img className="h-20 w-20 shrink-0 rounded-lg border object-cover" src={item.foto_url} alt={`${item.marca} ${item.modelo}`} />
          : <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg bg-blue-50"><Cpu className="h-8 w-8 text-blue-600" /></div>}
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">{item.numero_equipamento || "Equipamento"}</p>
          <h3 className="truncate font-semibold">{item.marca} {item.modelo}</h3>
          <div className="mt-2 flex flex-wrap gap-1"><Badge variant="outline" className="text-xs capitalize">{item.tipo?.replaceAll("_", " ")}</Badge>
            {item.capacidade && <Badge variant="outline" className="text-xs">{item.capacidade}</Badge>}</div>
        </div>
      </div>
      <dl className="grid grid-cols-2 gap-x-3 gap-y-2 border-y bg-slate-50/70 px-4 py-3 text-xs">
        <div className="col-span-2 flex gap-2"><MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-500" /><div><dt className="text-muted-foreground">Local</dt><dd className="font-medium">{item.estabelecimento_nome || item.localizacao || "Não informado"}</dd></div></div>
        <div><dt className="text-muted-foreground">Nº de série</dt><dd className="truncate font-medium">{item.numero_serie || "Não informado"}</dd></div>
        <div><dt className="text-muted-foreground">Última manutenção</dt><dd className="font-medium">{data(item.ultima_manutencao)}</dd></div>
        <div className="col-span-2 flex gap-2"><CalendarClock className="mt-0.5 h-3.5 w-3.5 text-slate-500" /><div><dt className="text-muted-foreground">Próxima manutenção</dt><dd className="font-medium">{data(item.proxima_manutencao)}</dd></div></div>
      </dl>
      <div className="grid grid-cols-2 gap-2 p-4">
        <Button variant="outline" size="sm" onClick={() => onHistorico(item)}><History className="mr-2 h-4 w-4" />Histórico</Button>
        <Button variant="outline" size="sm" onClick={() => onQrCode(item)}><QrCode className="mr-2 h-4 w-4" />QR Code</Button>
      </div>
    </article>
  ))}</div>;
}
