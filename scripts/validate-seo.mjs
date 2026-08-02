import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { canonicalUrl, publicPages } from "../src/marketing/site-config.js";

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
for (const page of publicPages) {
  if (!sitemap.includes(`<loc>${canonicalUrl(page.path)}</loc>`)) {
    fail(`sitemap: URL ausente ${page.path}`);
  }
}

const robots = await readFile(path.join(dist, "robots.txt"), "utf8");
if (!robots.includes("Sitemap: https://geradordepmoc.com.br/sitemap.xml")) {
  fail("robots.txt: sitemap ausente");
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

if (errors.length) {
  console.error("Validação SEO falhou:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log(
  `SEO validado: ${publicPages.length} páginas únicas, sitemap, robots, 404, app-shell e 4 downloads.`,
);
