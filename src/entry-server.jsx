import React from "react";
import { renderToString } from "react-dom/server";
import { StaticRouter } from "react-router-dom/server.js";
import MarketingRoutes from "@/marketing/MarketingRoutes";

export function render(url) {
  return renderToString(
    <StaticRouter location={url}>
      <MarketingRoutes />
    </StaticRouter>,
  );
}
