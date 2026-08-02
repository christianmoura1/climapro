import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  canonicalUrl,
  publicPages,
  structuredDataFor,
} from "../src/marketing/site-config.js";

const projectRoot = process.cwd();
const distDir = path.join(projectRoot, "dist");
const templatePath = path.join(distDir, "index.html");
const serverEntry = path.join(projectRoot, "dist-ssr", "entry-server.js");
const template = await readFile(templatePath, "utf8");
const { render } = await import(pathToFileURL(serverEntry).href);

function escapeAttribute(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function publicHead(page) {
  const canonical = canonicalUrl(page.path);
  const schema = JSON.stringify(structuredDataFor(page)).replaceAll("<", "\\u003c");

  return [
    `<meta name="description" content="${escapeAttribute(page.description)}" />`,
    '<meta name="robots" content="index,follow,max-image-preview:large" />',
    `<link rel="canonical" href="${canonical}" />`,
    '<meta property="og:type" content="website" />',
    '<meta property="og:locale" content="pt_BR" />',
    '<meta property="og:site_name" content="ClimaPro" />',
    `<meta property="og:title" content="${escapeAttribute(page.title)}" />`,
    `<meta property="og:description" content="${escapeAttribute(page.description)}" />`,
    `<meta property="og:url" content="${canonical}" />`,
    '<meta name="twitter:card" content="summary" />',
    `<meta name="twitter:title" content="${escapeAttribute(page.title)}" />`,
    `<meta name="twitter:description" content="${escapeAttribute(page.description)}" />`,
    `<script type="application/ld+json" data-climapro-schema="true">${schema}</script>`,
  ].join("\n    ");
}

function fillTemplate({ body = "", title, head }) {
  return template
    .replace("<title>ClimaPro</title>", `<title>${escapeAttribute(title)}</title>`)
    .replace("<!--seo-head-->", head)
    .replace('<div id="root"></div>', `<div id="root">${body}</div>`);
}

function outputPathFor(route) {
  if (route === "/") return path.join(distDir, "index.html");
  return path.join(distDir, `${route.slice(1)}.html`);
}

for (const page of publicPages) {
  const markup = render(page.path);
  const outputPath = outputPathFor(page.path);
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(
    outputPath,
    fillTemplate({
      body: markup,
      title: page.title,
      head: publicHead(page),
    }),
    "utf8",
  );
}

const appShell = fillTemplate({
  title: "ClimaPro ? acesso ao sistema",
  head: [
    '<meta name="description" content="Acesso ao sistema ClimaPro." />',
    '<meta name="robots" content="noindex,nofollow" />',
  ].join("\n    "),
});
await writeFile(path.join(distDir, "__app.html"), appShell, "utf8");

const notFoundBody = `
  <main style="min-height:100vh;display:grid;place-items:center;padding:2rem;font-family:system-ui,sans-serif;background:#f3f7fa;color:#0b1d2a">
    <div style="max-width:560px">
      <p style="font:700 12px ui-monospace,monospace;letter-spacing:.12em;color:#1d5fd1">ERRO 404</p>
      <h1 style="font-size:clamp(2rem,7vw,4rem);line-height:1;margin:.7rem 0 1rem">Esta página não existe</h1>
      <p style="color:#526b78;line-height:1.7">O endereço pode ter mudado ou sido digitado incorretamente.</p>
      <a href="/" style="display:inline-block;margin-top:1rem;padding:.8rem 1rem;background:#1d5fd1;color:#fff;text-decoration:none;font-weight:700;border-radius:.5rem">Voltar para o início</a>
    </div>
  </main>`;
const notFound = fillTemplate({
  body: notFoundBody,
  title: "Página não encontrada | ClimaPro",
  head: '<meta name="robots" content="noindex,nofollow" />',
}).replace(/\s*<script type="module"[^>]*><\/script>/g, "");
await writeFile(path.join(distDir, "404.html"), notFound, "utf8");

const sitemap = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ...publicPages.map(
    (page) =>
      `  <url><loc>${canonicalUrl(page.path)}</loc><lastmod>2026-08-02</lastmod></url>`,
  ),
  "</urlset>",
  "",
].join("\n");
await writeFile(path.join(distDir, "sitemap.xml"), sitemap, "utf8");

console.log(`Pré-render concluído: ${publicPages.length} páginas públicas, app-shell e 404.`);
