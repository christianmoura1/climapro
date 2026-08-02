import { readFile } from "node:fs/promises";
import path from "node:path";
import { publicPages } from "../src/marketing/site-config.js";

const dist = path.join(process.cwd(), "dist");
const publicPaths = new Set(publicPages.map((page) => page.path));
const appEntries = new Set(["/InitialChoice", "/Login"]);
const errors = [];

function fileFor(route) {
  return route === "/"
    ? path.join(dist, "index.html")
    : path.join(dist, `${route.slice(1)}.html`);
}

for (const page of publicPages) {
  const html = await readFile(fileFor(page.path), "utf8");

  for (const match of html.matchAll(/href="([^"]+)"/g)) {
    const href = match[1];
    if (
      href.startsWith("http://") ||
      href.startsWith("https://") ||
      href.startsWith("#") ||
      href.startsWith("/downloads/") ||
      href.startsWith("/assets/") ||
      href === "/favicon.svg" ||
      href === "/manifest.json"
    ) {
      continue;
    }

    const pathname = href.split("#")[0].split("?")[0];
    if (!publicPaths.has(pathname) && !appEntries.has(pathname)) {
      errors.push(`${page.path}: link interno sem destino conhecido (${href})`);
    }
  }
}

if (errors.length) {
  console.error("Valida??o de links falhou:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log(`Links internos validados em ${publicPages.length} p?ginas p?blicas.`);
