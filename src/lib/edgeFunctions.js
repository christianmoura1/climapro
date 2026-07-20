import { supabase } from "@/api/supabaseClient";

// Chamada direta às Edge Functions via fetch, no lugar de
// supabase.functions.invoke(). Em produção (chave no formato novo
// sb_publishable_...), o supabase-js instalado lança
// "Failed to construct 'Request': 'headers' of 'RequestInit' ... is not a
// valid ByteString" de forma consistente ao invocar functions — reproduzido
// mesmo sem extensões do navegador. Construindo a requisição nós mesmos,
// eliminamos a dependência da lógica de headers do SDK que está disparando
// esse erro.
export async function invokeEdgeFunction(name, body) {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const baseUrl = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  const response = await fetch(`${baseUrl}/functions/v1/${name}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: anonKey,
      Authorization: `Bearer ${session?.access_token ?? anonKey}`,
    },
    body: JSON.stringify(body ?? {}),
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.error || `Erro ${response.status} ao chamar ${name}`);
  }
  return payload;
}
