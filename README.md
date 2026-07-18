# ClimaPro

Sistema de gestão de manutenção/climatização (HVAC) multi-tenant, construído em React + Vite,
com banco de dados e autenticação no [Supabase](https://supabase.com).

## Rodando localmente

1. Clone o repositório e instale as dependências:
   ```
   npm install
   ```
2. Crie um projeto gratuito em [supabase.com](https://supabase.com) e aplique o schema:
   ```
   supabase link --project-ref SEU_PROJECT_REF
   supabase db push
   ```
   (o schema completo está em `supabase/migrations/0001_init.sql`)
3. Copie `.env.local.example` para `.env.local` e preencha com a URL e a `anon key` do seu
   projeto (Project Settings > API no painel do Supabase):
   ```
   VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
   VITE_SUPABASE_ANON_KEY=sua-anon-public-key
   ```
4. Rode o app: `npm run dev`

## Edge Functions

A lógica de servidor (envio de e-mail, lembretes de manutenção, importação/deduplicação de
dados) vive em `supabase/functions/`. Deploy com:
```
supabase functions deploy send-email
supabase functions deploy verificar-lembretes-manutencao
# ...demais functions em supabase/functions/
```

Segredos necessários (`supabase secrets set NOME=valor`):
- `RESEND_API_KEY` — envio de e-mail transacional (resend.com, free tier)
- `ANTHROPIC_API_KEY` — geração de documento de PMOC via IA (opcional)

`verificar-lembretes-manutencao` deve ser agendada (Supabase Cron / `pg_cron`) para rodar
diariamente.

## Deploy do front-end

Build estático (`npm run build`, saída em `dist/`), hospedado gratuitamente na
[Vercel](https://vercel.com) ou Netlify, conectado a este repositório com deploy automático a
cada push.
