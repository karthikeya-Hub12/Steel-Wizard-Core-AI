import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Outlet, createRootRouteWithContext, HeadContent, Scripts, Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import appCss from "../styles.css?url";
import { AppShell } from "../components/AppShell";
import { Toaster } from "@/components/ui/sonner";
import { useAlertsRealtime } from "@/hooks/useAlertsRealtime";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="text-center">
        <h1 className="text-7xl font-bold">404</h1>
        <p className="mt-2 text-muted-foreground">Asset or page not found.</p>
        <Link to="/" className="inline-flex mt-6 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium">Return to Overview</Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error }: { error: Error }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold">Something went wrong</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Tata Maintenance Wizard — Reliability & Maintenance Intelligence" },
      { name: "description", content: "Industrial-grade decision support platform for steel plant reliability: predictive maintenance, root cause analysis, RUL, and explainable AI." },
      { property: "og:title", content: "Tata Maintenance Wizard — Reliability & Maintenance Intelligence" },
      { name: "twitter:title", content: "Tata Maintenance Wizard — Reliability & Maintenance Intelligence" },
      { property: "og:description", content: "Industrial-grade decision support platform for steel plant reliability: predictive maintenance, root cause analysis, RUL, and explainable AI." },
      { name: "twitter:description", content: "Industrial-grade decision support platform for steel plant reliability: predictive maintenance, root cause analysis, RUL, and explainable AI." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/ed46098d-b63e-4433-8a81-cf11d95282f9/id-preview-ebe4679f--ef93cb9f-3d1e-420a-8d2e-c703b384dc55.lovable.app-1781068577776.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/ed46098d-b63e-4433-8a81-cf11d95282f9/id-preview-ebe4679f--ef93cb9f-3d1e-420a-8d2e-c703b384dc55.lovable.app-1781068577776.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head><HeadContent /></head>
      <body>{children}<Scripts /></body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <RealtimeBridge />
      <AppShell><Outlet /></AppShell>
      <Toaster />
    </QueryClientProvider>
  );
}

function RealtimeBridge() {
  useAlertsRealtime();
  return null;
}
