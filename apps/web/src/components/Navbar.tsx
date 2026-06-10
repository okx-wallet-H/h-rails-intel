import { Logo } from "./Logo";

export type AppView = "landing" | "dashboard" | "monitor" | "developer" | "gateway";

interface Props {
  view: AppView;
  onNavigate: (v: AppView) => void;
}

export function Navbar({ view, onNavigate }: Props) {
  const link = (id: AppView, label: string) => (
    <button
      type="button"
      className={`nav-btn ${view === id ? "is-active" : ""}`}
      onClick={() => onNavigate(id)}
    >
      {label}
    </button>
  );

  return (
    <header className="navbar">
      <div className="navbar__rail" aria-hidden="true" />
      <div className="navbar__inner container">
        <button type="button" className="brand" onClick={() => onNavigate("landing")}>
          <Logo size={34} />
        </button>

        <nav className="nav-links">
          {link("landing", "首页")}
          {link("dashboard", "仪表盘")}
          {link("monitor", "链上监控")}
          {link("developer", "开发者")}
          {link("gateway", "获取 Key")}
        </nav>

        <div className="nav-actions">
          <span className="nav-pill">X Layer · x402</span>
          <button type="button" className="btn btn--primary" onClick={() => onNavigate("dashboard")}>
            进入仪表盘
          </button>
        </div>
      </div>
    </header>
  );
}