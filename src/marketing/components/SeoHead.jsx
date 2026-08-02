import React from "react";
import { canonicalUrl, structuredDataFor } from "@/marketing/site-config";

function upsertMeta(selector, attributes) {
  let element = document.head.querySelector(selector);
  if (!element) {
    element = document.createElement("meta");
    document.head.appendChild(element);
  }

  Object.entries(attributes).forEach(([name, value]) => element.setAttribute(name, value));
}

export default function SeoHead({ page }) {
  React.useEffect(() => {
    const canonical = canonicalUrl(page.path);
    document.title = page.title;

    upsertMeta('meta[name="description"]', {
      name: "description",
      content: page.description,
    });
    upsertMeta('meta[name="robots"]', {
      name: "robots",
      content: "index,follow,max-image-preview:large",
    });
    upsertMeta('meta[property="og:type"]', { property: "og:type", content: "website" });
    upsertMeta('meta[property="og:locale"]', { property: "og:locale", content: "pt_BR" });
    upsertMeta('meta[property="og:site_name"]', { property: "og:site_name", content: "ClimaPro" });
    upsertMeta('meta[property="og:title"]', { property: "og:title", content: page.title });
    upsertMeta('meta[property="og:description"]', {
      property: "og:description",
      content: page.description,
    });
    upsertMeta('meta[property="og:url"]', { property: "og:url", content: canonical });
    upsertMeta('meta[name="twitter:card"]', { name: "twitter:card", content: "summary" });
    upsertMeta('meta[name="twitter:title"]', { name: "twitter:title", content: page.title });
    upsertMeta('meta[name="twitter:description"]', {
      name: "twitter:description",
      content: page.description,
    });

    let canonicalLink = document.head.querySelector('link[rel="canonical"]');
    if (!canonicalLink) {
      canonicalLink = document.createElement("link");
      canonicalLink.setAttribute("rel", "canonical");
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.setAttribute("href", canonical);

    let schema = document.head.querySelector('script[data-climapro-schema="true"]');
    if (!schema) {
      schema = document.createElement("script");
      schema.setAttribute("type", "application/ld+json");
      schema.setAttribute("data-climapro-schema", "true");
      document.head.appendChild(schema);
    }
    schema.textContent = JSON.stringify(structuredDataFor(page));
  }, [page]);

  return null;
}
