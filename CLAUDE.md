# ClimaPro

Sistema de gestão para empresas de climatização (HVAC): chamados, PMOC,
orçamentos, estoque, financeiro e ponto. Multi-tenant por empresa.

React + Vite + Tailwind no front, Supabase (Postgres + Auth + Storage + Edge
Functions) no back, deploy na Vercel a partir da branch `main`.

## Ao entregar SQL para o usuário

Ele aplica migrations na mão pelo painel do Supabase. Sempre inclua o link
junto do SQL:

**https://supabase.com/dashboard/project/plprhjkkxgmapnbmaaew/sql/new**

Cole o SQL no corpo da mensagem, não só como arquivo anexo — o editor exige
colar o conteúdo, e mandar só o nome do arquivo já causou confusão.

## Deploy

A Vercel só publica o que está na `main`. Mudança em branch não aparece em
produção, então não adianta pedir para o usuário conferir antes do merge.

Quando uma entrega tem parte que depende de migration e parte que não depende,
separe em dois PRs e suba logo o que não depende. Segurar tudo esperando o SQL
deixa o usuário sem ver nada.

Depois de um deploy, avise para recarregar com Ctrl+Shift+R: existe service
worker (`public/sw.js`) e um F5 comum pode servir a versão em cache.

## Estrutura que costuma pegar

- `vercel.json` tem uma lista literal de rewrites, sem catchall. Rota nova que
  não estiver lá dá 404 em acesso direto ou refresh.
- `src/App.jsx` decide entre três mundos: rotas públicas dinâmicas
  (`/e/:id`, `/orcamento/:token`), páginas de marketing pré-renderizadas e o
  app autenticado.
- Acesso público (sem login) passa por Edge Function com `service_role`, nunca
  por policy de RLS anônima nas tabelas.
- `modulos_ativos` na tabela `empresa` controla o que cada plano entrega. Hoje
  ele só filtra o menu em `Layout.jsx`; guarda de verdade por página ainda está
  pendente na maioria das telas.
- Planos: `src/lib/planos.js` descreve o que o usuário vê;
  `supabase/functions/_shared/stripe.ts` grava o que ele recebe. Rodam em
  runtimes diferentes e não dá para importar um do outro — mexeu num, confira o
  outro.

## Escrita

O usuário é brasileiro e prefere português. Há uma skill `humanizar-escrita`
com as regras de estilo dele; aplique em respostas em prosa.
