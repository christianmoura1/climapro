import React from "react";
import { Button } from "@/components/ui/button";

// Botão de anexar arquivo que funciona dentro de modal e no iPhone.
//
// O padrão antigo era um <input type="file"> com `hidden` (display:none) e um
// <label htmlFor> ao lado. Isso quebra em duas situações que se somaram no
// cadastro de equipamento pelo painel do técnico:
//
// 1. o Safari do iPhone se recusa a abrir o seletor de um input com
//    display:none acionado por label;
// 2. o Dialog do Radix, que envolve o formulário ali, gerencia foco e ponteiro
//    e engole o clique que sobra.
//
// O resultado era o pior tipo de defeito: clicar e não acontecer nada, sem erro
// nenhum. Os logs do Supabase não tinham uma requisição de storage sequer.
//
// Aqui o input é escondido por posicionamento (não por display) e o clique é
// disparado no próprio botão, dentro do gesto do usuário — que é o que todo
// navegador aceita.
export function BotaoUpload({
  onArquivos,
  accept = "image/*",
  multiple = false,
  disabled = false,
  children,
  className = "",
  variant = "outline",
  id,
}) {
  const inputRef = React.useRef(null);

  const abrirSeletor = () => {
    if (disabled) return;
    inputRef.current?.click();
  };

  const aoEscolher = (evento) => {
    const arquivos = Array.from(evento.target.files || []);
    if (arquivos.length > 0) onArquivos(multiple ? arquivos : arquivos[0]);
    // Zera o valor para o mesmo arquivo poder ser escolhido de novo depois de
    // um erro — sem isso o segundo clique não dispara o onChange.
    evento.target.value = '';
  };

  return (
    <>
      <input
        ref={inputRef}
        id={id}
        type="file"
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        onChange={aoEscolher}
        // sr-only: some da tela sem sair do fluxo, ao contrário de display:none
        className="absolute h-px w-px overflow-hidden opacity-0"
        tabIndex={-1}
        aria-hidden="true"
      />
      <Button
        type="button"
        variant={variant}
        disabled={disabled}
        onClick={abrirSeletor}
        className={`min-h-11 ${className}`}
      >
        {children}
      </Button>
    </>
  );
}

export default BotaoUpload;
