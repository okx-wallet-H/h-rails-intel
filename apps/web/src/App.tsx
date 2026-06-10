import { useCallback, useEffect, useState } from "react";
import { fetchDashboard } from "./api";
import { FeatureSection } from "./components/FeatureSection";
import { Footer } from "./components/Footer";
import { Hero } from "./components/Hero";
import { Navbar, type AppView } from "./components/Navbar";
import { TickerBar } from "./components/TickerBar";
import type { DashboardPayload } from "./types";
import { DashboardView } from "./views/DashboardView";
import { DeveloperView } from "./views/DeveloperView";
import { GatewayView } from "./views/GatewayView";
import { MonitorView } from "./views/MonitorView";

const REFRESH_MS = 30_000;

function viewFromHash(): AppView | null {
  const hash = window.location.hash.replace(/^#/, "");
  if (hash === "gateway") return "gateway";
  if (hash === "dashboard") return "dashboard";
  if (hash === "developer") return "developer";
  if (hash === "monitor") return "monitor";
  return null;
}

export default function App() {
  const [view, setView] = useState<AppView>(() => viewFromHash() || "landing");
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState("SOL");

  const load = useCallback(async () => {
    try {
      setError(null);
      const next = await fetchDashboard();
      setData(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const timer = window.setInterval(load, REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [load]);

  useEffect(() => {
    const onHash = () => {
      const next = viewFromHash();
      if (next) setView(next);
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const navigate = useCallback((next: AppView) => {
    setView(next);
    if (next === "landing") {
      history.replaceState(null, "", window.location.pathname + window.location.search);
    } else {
      history.replaceState(null, "", `${window.location.pathname}${window.location.search}#${next}`);
    }
  }, []);

  return (
    <div className="app">
      <Navbar view={view} onNavigate={navigate} />

      {view === "landing" && (
        <>
          <Hero
            summary={data?.market.summary}
            loading={loading}
            onEnterDashboard={() => navigate("dashboard")}
            onEnterDeveloper={() => navigate("developer")}
            onEnterGateway={() => navigate("gateway")}
          />
          {data?.market.tokens.length ? <TickerBar tokens={data.market.tokens} /> : null}
          <FeatureSection />
        </>
      )}

      {error ? (
        <div className="container"><div className="error-banner">{error}</div></div>
      ) : null}

      {view === "dashboard" && data && (
        <DashboardView
          data={data}
          loading={loading}
          selected={selected}
          onSelect={setSelected}
        />
      )}

      {view === "monitor" && data && <MonitorView feed={data.monitor} />}
      {view === "developer" && <DeveloperView />}
      {view === "gateway" && <GatewayView />}

      <Footer />
    </div>
  );
}