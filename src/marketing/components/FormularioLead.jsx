import React, { useState } from "react";

const WHATSAPP_FALLBACK = "5541992572743";

// Chamada à Edge Function sem passar pelo invokeEdgeFunction.
//
// Aquele helper importa o client do Supabase, que é criado no carregamento do
// módulo e exige as variáveis de ambiente. As páginas de marketing são
// pré-renderizadas no build, onde essas variáveis não existem, e o import
// sozinho já derruba o prerender com "supabaseUrl is required". Por isso aqui
// as variáveis são lidas na hora do envio, dentro do navegador.
//
// Não precisa de sessão: a função é pública e aceita a anonKey.
async function enviarLead(corpo) {
  const baseUrl = (import.meta.env.VITE_SUPABASE_URL || "").trim();
  const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || "").trim();
  if (!baseUrl || !anonKey) throw new Error("Formulário indisponível no momento.");

  const resposta = await fetch(`${baseUrl}/functions/v1/captar-lead`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
    },
    body: JSON.stringify(corpo),
  });

  const payload = await resposta.json().catch(() => null);
  if (!resposta.ok) throw new Error(payload?.error || "Não consegui enviar agora.");
  return payload;
}

// Formulário do cliente final. Fica nas páginas de marketing, que são
// pré-renderizadas e rodam fora do app autenticado, então usa só o
// invokeEdgeFunction (que cai para a anonKey quando não há sessão) e nenhum
// componente do painel.
export default function FormularioLead({ origem, titulo, descricao }) {
  const [dados, setDados] = useState({
    nome: "",
    organizacao: "",
    telefone: "",
    email: "",
    cidade: "",
    quantidade_equipamentos: "",
    mensagem: "",
    website: "", // isca de robô, escondida
  });
  const [estado, setEstado] = useState("parado"); // parado | enviando | pronto | erro
  const [erro, setErro] = useState("");

  const campo = (nome) => (evento) => setDados({ ...dados, [nome]: evento.target.value });

  const enviar = async (evento) => {
    evento.preventDefault();
    setEstado("enviando");
    setErro("");

    try {
      const utm = {};
      if (typeof window !== "undefined") {
        const params = new URLSearchParams(window.location.search);
        for (const chave of ["utm_source", "utm_medium", "utm_campaign", "gclid"]) {
          const valor = params.get(chave);
          if (valor) utm[chave] = valor;
        }
      }

      const resposta = await enviarLead({ ...dados, origem, utm });
      if (resposta?.error) throw new Error(resposta.error);
      setEstado("pronto");
    } catch (falha) {
      // A página é de captação: morrer em silêncio aqui custa o lead. Mostra o
      // WhatsApp como saída em vez de só dizer que deu erro.
      setEstado("erro");
      setErro(falha?.message || "Não consegui enviar agora.");
    }
  };

  if (estado === "pronto") {
    return (
      <div className="m-lead m-lead--ok" id="contato">
        <h2>Recebido. Vamos falar com você.</h2>
        <p>
          Retornamos em até um dia útil no telefone que você deixou. Se preferir adiantar, chama no
          WhatsApp que a gente já marca o levantamento.
        </p>
        <a className="m-button" href={`https://wa.me/${WHATSAPP_FALLBACK}`} target="_blank" rel="noreferrer">
          Falar no WhatsApp agora
        </a>
      </div>
    );
  }

  return (
    <div className="m-lead" id="contato">
      <h2>{titulo}</h2>
      {descricao ? <p className="m-lead__lead">{descricao}</p> : null}

      <form onSubmit={enviar} className="m-lead__form">
        <div className="m-lead__row">
          <label htmlFor="lead-nome">
            Seu nome *
            <input id="lead-nome" value={dados.nome} onChange={campo("nome")} required autoComplete="name" />
          </label>
          <label htmlFor="lead-organizacao">
            Hotel, condomínio ou empresa
            <input id="lead-organizacao" value={dados.organizacao} onChange={campo("organizacao")} autoComplete="organization" />
          </label>
        </div>

        <div className="m-lead__row">
          <label htmlFor="lead-telefone">
            Telefone com DDD *
            <input id="lead-telefone" value={dados.telefone} onChange={campo("telefone")} required inputMode="tel" autoComplete="tel" placeholder="(27) 99999-9999" />
          </label>
          <label htmlFor="lead-email">
            E-mail
            <input id="lead-email" type="email" value={dados.email} onChange={campo("email")} autoComplete="email" />
          </label>
        </div>

        <div className="m-lead__row">
          <label htmlFor="lead-cidade">
            Cidade
            <input id="lead-cidade" value={dados.cidade} onChange={campo("cidade")} placeholder="Vitória" />
          </label>
          <label htmlFor="lead-quantidade">
            Quantos aparelhos, mais ou menos
            <input id="lead-quantidade" value={dados.quantidade_equipamentos} onChange={campo("quantidade_equipamentos")} inputMode="numeric" placeholder="90" />
          </label>
        </div>

        <label htmlFor="lead-mensagem">
          Alguma coisa que a gente precisa saber
          <textarea id="lead-mensagem" rows={3} value={dados.mensagem} onChange={campo("mensagem")} />
        </label>

        {/* Isca de robô: sai da tela sem display:none, que alguns robôs detectam. */}
        <div aria-hidden="true" className="m-lead__isca">
          <label htmlFor="lead-website">Não preencha este campo</label>
          <input id="lead-website" value={dados.website} onChange={campo("website")} tabIndex={-1} autoComplete="off" />
        </div>

        <button type="submit" className="m-button" disabled={estado === "enviando"}>
          {estado === "enviando" ? "Enviando..." : "Quero o levantamento gratuito"}
        </button>

        {estado === "erro" ? (
          <p className="m-lead__erro" role="alert">
            {erro} Chama no{" "}
            <a href={`https://wa.me/${WHATSAPP_FALLBACK}`} target="_blank" rel="noreferrer">WhatsApp</a>{" "}
            que a gente resolve por lá.
          </p>
        ) : null}

        <p className="m-lead__nota">
          Sem compromisso e sem custo. Usamos seus dados só para retornar este contato.
        </p>
      </form>
    </div>
  );
}
