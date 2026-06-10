import { Logo } from "./Logo";

export function Footer() {
  return (
    <footer className="footer">
      <div className="container footer__inner">
        <div className="footer__brand">
          <Logo size={28} />
        </div>
        <p>链上行情轨道 · H Rails 演示站点</p>
        <div className="footer__links">
          <a href="#markets">行情</a>
          <a href="#api">API</a>
          <a href="#features">文档</a>
        </div>
      </div>
    </footer>
  );
}