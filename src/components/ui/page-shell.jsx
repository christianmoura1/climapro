import React from "react";
import { AlertCircle, ArrowLeft, SlidersHorizontal } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function PageShell({ children, className = undefined, innerClassName = undefined }) {
  return (
    <div className={cn("app-page", className)}>
      <div className={cn("app-page-inner", innerClassName)}>{children}</div>
    </div>
  );
}

export function PageHeader({ title, description = undefined, backTo = undefined, actions = undefined, eyebrow = undefined, className = undefined }) {
  return (
    <header className={cn("relative mb-6 overflow-hidden rounded-2xl border border-border/80 bg-card px-4 py-5 shadow-sm sm:mb-8 sm:px-6", className)}>
      <div className="absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b from-cyan-500 via-blue-600 to-indigo-600" aria-hidden="true" />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3 sm:items-center sm:gap-4">
          {backTo ? (
            <Button variant="outline" size="icon" asChild className="shrink-0" aria-label="Voltar ao dashboard">
              <Link to={backTo}><ArrowLeft aria-hidden="true" /></Link>
            </Button>
          ) : null}
          <div className="min-w-0">
            {eyebrow ? <p className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-primary">{eyebrow}</p> : null}
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{title}</h1>
            {description ? <p className="mt-1 max-w-3xl text-sm text-muted-foreground sm:text-base">{description}</p> : null}
          </div>
        </div>
        {actions ? <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:justify-end">{actions}</div> : null}
      </div>
    </header>
  );
}

export function InlineLoading({ label = "Carregando dados…", cards = 3, className = undefined }) {
  return (
    <div className={cn("grid gap-4 sm:grid-cols-2 lg:grid-cols-3", className)} role="status" aria-live="polite">
      <span className="sr-only">{label}</span>
      {Array.from({ length: cards }).map((_, index) => (
        <Card key={index} className="shadow-sm">
          <CardContent className="space-y-3 p-5">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-11 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function ErrorState({ title = "Não foi possível carregar os dados", description = undefined, onRetry = undefined, className = undefined }) {
  return (
    <Card className={cn("border-destructive/30 bg-destructive/5 shadow-sm", className)} role="alert">
      <CardContent className="flex flex-col items-center px-5 py-10 text-center">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
          <AlertCircle className="h-6 w-6" aria-hidden="true" />
        </div>
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="mt-1 max-w-md text-sm text-muted-foreground">
          {description || "Verifique sua conexão e tente novamente."}
        </p>
        {onRetry ? <Button onClick={onRetry} className="mt-5">Tentar novamente</Button> : null}
      </CardContent>
    </Card>
  );
}

export function FilterEmptyState({ title = "Nenhum resultado com estes filtros", description = undefined, onClear = undefined, className = undefined }) {
  return (
    <div className={cn("flex flex-col items-center px-5 py-12 text-center", className)}>
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-muted text-muted-foreground">
        <SlidersHorizontal className="h-6 w-6" aria-hidden="true" />
      </div>
      <h2 className="text-base font-semibold">{title}</h2>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description || "Limpe a busca ou ajuste os filtros para ver mais itens."}</p>
      {onClear ? <Button variant="outline" onClick={onClear} className="mt-4">Limpar filtros</Button> : null}
    </div>
  );
}
