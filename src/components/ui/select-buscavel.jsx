import React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

// Seleção com busca, para as listas que cresceram: com 96 clientes, rolar um
// <select> até achar "Vanessa Pontes" é pior que digitar três letras.
//
// `itens` são { valor, rotulo, secundario? }. O `secundario` aparece embaixo
// em cinza e também entra na busca — é o que resolve dois clientes de mesmo
// nome, ou achar um equipamento pelo endereço.
//
// A busca ignora acento e maiúscula: procurar "goncalves" acha "Gonçalves".
export function SelectBuscavel({
  itens = [],
  valor,
  onChange,
  placeholder = "Selecione",
  textoBusca = "Digite para buscar...",
  textoVazio = "Nada encontrado.",
  opcaoTodos = null,
  id,
  disabled = false,
  className = "",
}) {
  const [aberto, setAberto] = React.useState(false);

  const selecionado = itens.find((i) => String(i.valor) === String(valor));
  const rotuloAtual = selecionado?.rotulo || (opcaoTodos && !valor ? opcaoTodos : placeholder);

  const escolher = (novoValor) => {
    onChange(novoValor);
    setAberto(false);
  };

  return (
    <Popover open={aberto} onOpenChange={setAberto}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={aberto}
          disabled={disabled}
          className={`h-10 w-full justify-between font-normal ${
            selecionado || (opcaoTodos && !valor) ? '' : 'text-muted-foreground'
          } ${className}`}
        >
          <span className="truncate">{rotuloAtual}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command
          filter={(value, search) => {
            const normalizar = (t) => String(t).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
            return normalizar(value).includes(normalizar(search)) ? 1 : 0;
          }}
        >
          <CommandInput placeholder={textoBusca} />
          <CommandList>
            <CommandEmpty>{textoVazio}</CommandEmpty>
            <CommandGroup>
              {opcaoTodos && (
                <CommandItem value={opcaoTodos} onSelect={() => escolher("")}>
                  <Check className={`mr-2 h-4 w-4 ${!valor ? 'opacity-100' : 'opacity-0'}`} />
                  {opcaoTodos}
                </CommandItem>
              )}
              {itens.map((item) => (
                <CommandItem
                  key={item.valor}
                  // O cmdk casa a busca contra `value`, então o texto
                  // secundário precisa entrar aqui para ser pesquisável.
                  value={`${item.rotulo} ${item.secundario || ''}`}
                  onSelect={() => escolher(item.valor)}
                >
                  <Check
                    className={`mr-2 h-4 w-4 shrink-0 ${
                      String(item.valor) === String(valor) ? 'opacity-100' : 'opacity-0'
                    }`}
                  />
                  <span className="min-w-0">
                    <span className="block truncate">{item.rotulo}</span>
                    {item.secundario && (
                      <span className="block truncate text-xs text-muted-foreground">{item.secundario}</span>
                    )}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export default SelectBuscavel;
