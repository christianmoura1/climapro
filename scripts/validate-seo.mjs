import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { LIMITE_CHAMADOS_FREE, LIMITE_CLIENTES_FREE, PLANOS } from "../src/lib/planos.js";
import { llmsFullTxt, llmsTxt } from "./llms-txt.mjs";
import { canonicalUrl, publicPages, structuredDataFor } from "../src/marketing/site-config.js";

const root = process.cwd();
const dist = path.join(root, "dist");
const errors = [];
const titles = new Set();
const descriptions = new Set();

function fail(message) {
  errors.push(message);
}

function fileFor(route) {
  return route === "/"
    ? path.join(dist, "index.html")
    : path.join(dist, `${route.slice(1)}.html`);
}

function count(pattern, text) {
  return [...text.matchAll(pattern)].length;
}

function hasEncodingCorruption(text) {
  return (
    /\p{L}\?\p{L}/u.test(text) ||
    /\uFFFD/u.test(text) ||
    /\u00c3[\u0080-\u00bf]|\u00c2[\u0080-\u00bf]|\u00e2(?:\u20ac|\u2122)/u.test(text)
  );
}

for (const page of publicPages) {
  const file = fileFor(page.path);
  let html;

  try {
    html = await readFile(file, "utf8");
  } catch {
    fail(`${page.path}: arquivo pré-renderizado ausente`);
    continue;
  }

  const title = html.match(/<title>(.*?)<\/title>/s)?.[1];
  const description = html.match(/<meta name="description" content="(.*?)"/s)?.[1];
  const text = html
    .replace(/<script[\s\S]*?<\/script>/g, " ")
    .replace(/<style[\s\S]*?<\/style>/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (title !== page.title) fail(`${page.path}: title incorreto`);
  if (!description) fail(`${page.path}: description ausente`);
  if (titles.has(title)) fail(`${page.path}: title duplicado`);
  if (descriptions.has(description)) fail(`${page.path}: description duplicada`);
  titles.add(title);
  descriptions.add(description);

  if (count(/<h1\b/g, html) !== 1) fail(`${page.path}: precisa ter exatamente um H1`);
  if (!html.includes(`rel="canonical" href="${canonicalUrl(page.path)}"`)) {
    fail(`${page.path}: canonical incorreta`);
  }
  if (!html.includes('name="robots" content="index,follow')) {
    fail(`${page.path}: robots de indexação ausente`);
  }
  if (!html.includes('type="application/ld+json"')) {
    fail(`${page.path}: JSON-LD ausente`);
  }
  if (html.includes("<!--seo-head-->")) fail(`${page.path}: marcador SEO não substituído`);
  if (hasEncodingCorruption(html)) fail(`${page.path}: encoding corrompido no HTML`);
  if (text.length < 1500) fail(`${page.path}: conteúdo insuficiente (${text.length} caracteres)`);

  const forbiddenClaims = [
    /emissão automática de NFS-e/i,
    /suporte 24\/7/i,
    /100% seguro/i,
    /sem curva de aprendizado/i,
    /sincronização de rotas/i,
    /white label/i,
  ];
  for (const claim of forbiddenClaims) {
    if (claim.test(text)) fail(`${page.path}: claim não comprovada (${claim})`);
  }
}

const sitemap = await readFile(path.join(dist, "sitemap.xml"), "utf8");
const today = new Date().toISOString().slice(0, 10);
const lastmods = [...sitemap.matchAll(/<lastmod>([^<]*)<\/lastmod>/g)].map((match) => match[1]);
if (lastmods.length !== publicPages.length) {
  fail(`sitemap: ${lastmods.length} datas para ${publicPages.length} páginas`);
}
for (const lastmod of lastmods) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(lastmod)) fail(`sitemap: lastmod inválido (${lastmod})`);
  if (lastmod > today) fail(`sitemap: lastmod no futuro (${lastmod})`);
}
for (const page of publicPages) {
  if (!sitemap.includes(`<loc>${canonicalUrl(page.path)}</loc>`)) {
    fail(`sitemap: URL ausente ${page.path}`);
  }
}
const prerenderSource = await readFile(path.join(root, "scripts", "prerender.mjs"), "utf8");
if (prerenderSource.includes("<lastmod>2026-08-02</lastmod>")) {
  fail("sitemap: data fixa ainda está no gerador");
}

const robots = await readFile(path.join(dist, "robots.txt"), "utf8");
if (!robots.includes("Sitemap: https://geradordepmoc.com.br/sitemap.xml")) {
  fail("robots.txt: sitemap ausente");
}
if (!/^User-agent:\s*\*\s*\nAllow:\s*\/\s*$/m.test(robots)) {
  fail("robots.txt: precisa continuar liberando todos os user-agents");
}
if (!robots.includes("https://geradordepmoc.com.br/llms.txt")) {
  fail("robots.txt: link para llms.txt ausente");
}

const appShell = await readFile(path.join(dist, "__app.html"), "utf8");
if (!appShell.includes('name="robots" content="noindex,nofollow"')) {
  fail("app-shell: noindex ausente");
}
if (/<h1\b/.test(appShell)) fail("app-shell: conteúdo público indevido");

const notFound = await readFile(path.join(dist, "404.html"), "utf8");
if (!notFound.includes('name="robots" content="noindex,nofollow"')) {
  fail("404: noindex ausente");
}
if (/<script type="module"/.test(notFound)) fail("404: JavaScript do app não deve carregar");

const vercel = JSON.parse(await readFile(path.join(root, "vercel.json"), "utf8"));
if (vercel.rewrites?.some((rewrite) => rewrite.source === "/(.*)")) {
  fail("vercel.json: catch-all reintroduz soft 404");
}
for (const file of ["/llms.txt", "/llms-full.txt", "/robots.txt", "/sitemap.xml"]) {
  if (vercel.rewrites?.some((rewrite) => rewrite.source === file)) {
    fail(`vercel.json: rewrite engole ${file}`);
  }
}
for (const file of ["/llms.txt", "/llms-full.txt"]) {
  const header = vercel.headers?.find((entry) => entry.source === file);
  const contentType = header?.headers?.find((item) => item.key === "Content-Type")?.value;
  if (contentType !== "text/plain; charset=utf-8") {
    fail(`vercel.json: ${file} precisa de Content-Type text/plain; charset=utf-8`);
  }
}
if (vercel.rewrites?.some((rewrite) => rewrite.destination !== "/__app")) {
  fail("vercel.json: rotas privadas devem apontar para /__app com cleanUrls ativo");
}
if (!vercel.redirects?.some((redirect) => redirect.source === "/LandingPage")) {
  fail("vercel.json: redirect da antiga /LandingPage ausente");
}

for (const download of [
  "modelo-ordem-servico-ar-condicionado.doc",
  "modelo-ordem-servico-ar-condicionado.html",
  "checklist-manutencao-preventiva-ar-condicionado.csv",
  "checklist-manutencao-preventiva-ar-condicionado.html",
]) {
  const downloadPath = path.join(dist, "downloads", download);
  const info = await stat(downloadPath);
  const content = await readFile(downloadPath, "utf8");
  if (info.size < 300) fail(`download vazio ou incompleto: ${download}`);
  if (hasEncodingCorruption(content)) fail(`download com encoding corrompido: ${download}`);
}

const homeHtml = await readFile(fileFor("/"), "utf8");
const homeSchema = structuredDataFor(publicPages.find((page) => page.path === "/"));
const software = homeSchema["@graph"]?.find((node) => node["@type"] === "SoftwareApplication");
const homeTypes = homeSchema["@graph"]?.map((node) => node["@type"]) ?? [];
if (!homeTypes.includes("Organization") || !homeTypes.includes("WebSite")) {
  fail("home: JSON-LD perdeu Organization ou WebSite");
}
if (!software) fail("home: SoftwareApplication ausente");
if (software?.name !== "ClimaPro") fail("home: SoftwareApplication com nome errado");
if (software?.applicationCategory !== "BusinessApplication") {
  fail("home: applicationCategory incorreta");
}
if (software?.operatingSystem !== "Web") fail("home: operatingSystem precisa ser Web");
if (software?.url !== "https://geradordepmoc.com.br") fail("home: url do software incorreta");
if (software?.inLanguage !== "pt-BR") fail("home: inLanguage precisa ser pt-BR");
if (software?.provider?.["@type"] !== "Organization" || software?.provider?.name !== "ClimaPro") {
  fail("home: provider precisa ser a Organization ClimaPro");
}
if (!Array.isArray(software?.offers) || software.offers.length < PLANOS.length) {
  fail("home: ofertas do software incompletas");
}
for (const offer of software?.offers ?? []) {
  if (offer.priceCurrency !== "BRL") fail(`home: oferta ${offer.name} fora do BRL`);
  if (!/^\d+\.\d{2}$/.test(offer.price)) fail(`home: preço inválido em ${offer.name}`);
}
const freeOffer = software?.offers?.find((offer) => offer.name === "Free");
if (freeOffer?.price !== "0.00") fail("home: plano Free precisa custar 0.00");
for (const plano of PLANOS.filter((item) => item.valor > 0)) {
  const mensal = software?.offers?.find((offer) => offer.name === `${plano.nome} mensal`);
  const anual = software?.offers?.find((offer) => offer.name === `${plano.nome} anual`);
  if (!mensal || !anual) fail(`home: oferta mensal/anual ausente para ${plano.nome}`);
  if (mensal?.description && !plano.inclui.every((item) => mensal.description.includes(item))) {
    fail(`home: oferta ${plano.nome} sem os itens do plano`);
  }
}
if (software && !homeHtml.includes(JSON.stringify(software).replaceAll("<", "\\u003c"))) {
  fail("home: HTML pré-renderizado sem o SoftwareApplication");
}

const free = PLANOS.find((plano) => plano.id === "free");
const homeText = homeHtml
  .replace(/<script[\s\S]*?<\/script>/g, " ")
  .replace(/<[^>]+>/g, " ");
for (const item of free.inclui) {
  if (!homeText.includes(item)) fail(`home: texto público sem “${item}”`);
}

const tecnicoHtml = await readFile(fileFor("/para/tecnico-autonomo"), "utf8");
const tecnicoText = tecnicoHtml
  .replace(/<script[\s\S]*?<\/script>/g, " ")
  .replace(/<[^>]+>/g, " ");
if (/até 5 chamados|cinco chamados|agenda básica|\b1 cliente\b|\bum cliente\b/i.test(tecnicoText)) {
  fail("técnico autônomo: descrição do Free ainda diverge de planos.js");
}
if (!tecnicoText.includes(`${free.inclui[0]}`) || !tecnicoText.includes("10 clientes")) {
  fail("técnico autônomo: teto do Free ausente no HTML");
}

for (const [name, render] of [
  ["llms.txt", llmsTxt],
  ["llms-full.txt", llmsFullTxt],
]) {
  const distText = await readFile(path.join(dist, name), "utf8");
  const publicText = await readFile(path.join(root, "public", name), "utf8");
  const expected = render();
  if (distText !== expected || publicText !== expected) {
    fail(`${name}: build divergiu do gerador`);
  }
  if (!/aplicativo polonês chamado Clima Pro/i.test(distText)) {
    fail(`${name}: falta deixar claro que não é o app polonês`);
  }
  if (!/dados climáticos ou ambientais/i.test(distText)) {
    fail(`${name}: falta deixar claro que não é produto de dados climáticos`);
  }
  for (const page of publicPages) {
    if (!distText.includes(canonicalUrl(page.path))) fail(`${name}: falta ${page.path}`);
  }
  for (const plano of PLANOS) {
    for (const item of plano.inclui) {
      if (!distText.includes(item)) fail(`${name}: falta item do ${plano.nome}: ${item}`);
    }
    if (plano.valor && !distText.includes(plano.preco)) {
      fail(`${name}: falta o preço de ${plano.nome}`);
    }
    if (plano.valorAnualMes) {
      const anual = (Math.round(plano.valorAnualMes * 100) / 100).toFixed(2).replace(".", ",");
      if (!distText.includes(anual)) fail(`${name}: falta o preço anual de ${plano.nome}`);
    }
  }
  if (!distText.includes(`No plano Free o teto é de ${LIMITE_CHAMADOS_FREE} chamados por mês e ${LIMITE_CLIENTES_FREE} clientes`)) {
    fail(`${name}: teto do Free ausente`);
  }
  for (const download of [
    "/downloads/modelo-ordem-servico-ar-condicionado.doc",
    "/downloads/modelo-ordem-servico-ar-condicionado.html",
    "/downloads/checklist-manutencao-preventiva-ar-condicionado.csv",
    "/downloads/checklist-manutencao-preventiva-ar-condicionado.html",
  ]) {
    if (!distText.includes(`https://geradordepmoc.com.br${download}`)) {
      fail(`${name}: falta ${download}`);
    }
  }
}

if (errors.length) {
  console.error("Validação SEO falhou:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log(
  `SEO validado: ${publicPages.length} páginas únicas, sitemap, robots, llms.txt, 404, app-shell e 4 downloads.`,
);
