import { supabase } from "@/api/supabaseClient";

// Versão do helper — aparece nos erros para sabermos qual build está rodando.
const BUILD_TAG = "EF2";

// Headers HTTP só aceitam ISO-8859-1; um único caractere invisível fora disso
// (espaço não separável, zero-width space vindo de copy/paste de chave) faz o
// navegador lançar "Failed to construct 'Request': ... is not a valid
// ByteString". Chaves e tokens JWT legítimos são ASCII puro, então remover
// qualquer caractere fora do ASCII imprimível é sempre seguro — e se algo for
// removido, registramos qual header estava sujo para diagnóstico.
function limparHeader(nome, valor, sujos) {
  const original = String(valor ?? "");
  const limpo = original.replace(/[^\x20-\x7e]/g, "");
  if (limpo !== original) {
    const invalidos = [...original]
      .filter((ch) => !/[\x20-\x7e]/.test(ch))
      .map((ch) => `U+${ch.codePointAt(0).toString(16).toUpperCase().padStart(4, "0")}`);
    sujos.push(`${nome} (${invalidos.slice(0, 3).join(", ")})`);
  }
  return limpo;
}

// Chamada direta às Edge Functions via fetch, no lugar de
// supabase.functions.invoke() — a lógica de headers do SDK para o novo
// formato de chave (sb_publishable_...) dispara o erro de ByteString acima.
export async function invokeEdgeFunction(name, body) {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const baseUrl = (import.meta.env.VITE_SUPABASE_URL || "").trim();
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  const sujos = [];
  const headers = {
    "Content-Type": "application/json",
    apikey: limparHeader("apikey", anonKey, sujos),
    Authorization: `Bearer ${limparHeader("token", session?.access_token ?? anonKey, sujos)}`,
  };
  if (sujos.length > 0) {
    console.warn(`[ClimaPro ${BUILD_TAG}] Headers continham caracteres inválidos (removidos): ${sujos.join("; ")}`);
  }

  let response;
  try {
    response = await fetch(`${baseUrl}/functions/v1/${name}`, {
      method: "POST",
      headers,
      body: JSON.stringify(body ?? {}),
    });
  } catch (fetchError) {
    const extra = sujos.length > 0 ? ` [headers corrigidos: ${sujos.join("; ")}]` : "";
    throw new Error(`[${BUILD_TAG}] Falha de rede ao chamar ${name}: ${fetchError.message}${extra}`);
  }

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.error || `[${BUILD_TAG}] Erro ${response.status} ao chamar ${name}`);
  }
  return payload;
}
