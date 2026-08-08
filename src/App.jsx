import React from "react";
import { BrowserRouter as Router, useLocation } from "react-router-dom";
import MarketingRoutes from "@/marketing/MarketingRoutes";
import { isMarketingPath } from "@/marketing/site-config";
import PublicRoutes from "@/public/PublicRoutes";
import { isPublicAppPath } from "@/public/site-config";

const PrivateApplication = React.lazy(() => import("@/PrivateApplication"));

export function RoutedApp() {
  const { pathname } = useLocation();

  if (isPublicAppPath(pathname)) {
    return <PublicRoutes />;
  }

  if (isMarketingPath(pathname)) {
    return <MarketingRoutes />;
  }

  return (
    <React.Suspense
      fallback={
        <div className="fixed inset-0 flex items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-800" />
        </div>
      }
    >
      <PrivateApplication />
    </React.Suspense>
  );
}

function App() {
  return (
    <Router>
      <RoutedApp />
    </Router>
  );
}

export default App;
