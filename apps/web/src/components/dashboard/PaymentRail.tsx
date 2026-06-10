import { useState } from "react";
import { runX402Demo } from "../../api";

const STEPS = [
  { id: 1, title: "请求 API", desc: "行情接口返回 HTTP 402" },
  { id: 2, title: "X Layer 签名", desc: "EIP-3009 链下授权，无需 Gas" },
  { id: 3, title: "自动重放", desc: "携带 PAYMENT-SIGNATURE 获取数据" },
];

export function PaymentRail({ perCall }: { perCall: string }) {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [activeStep, setActiveStep] = useState(0);

  const demo = async () => {
    setRunning(true);
    setResult(null);
    setActiveStep(1);
    try {
      const timer = window.setInterval(() => {
        setActiveStep((s) => (s < 3 ? s + 1 : s));
      }, 800);
      const data = await runX402Demo();
      window.clearInterval(timer);
      setActiveStep(3);
      setResult(data);
    } catch (e) {
      setResult({ error: e instanceof Error ? e.message : "失败" });
    } finally {
      setRunning(false);
    }
  };

  return (
    <section className="panel panel--payment" id="payment">
      <div className="panel__head">
        <div>
          <h3>Agent Payments Protocol</h3>
          <p className="muted">支付发生在 X Layer · x402 协议 · 每次约 {perCall} USDT</p>
        </div>
        <button type="button" className="btn btn--primary" onClick={demo} disabled={running}>
          {running ? "支付中…" : "一键演示 402 支付"}
        </button>
      </div>

      <div className="rail-steps">
        {STEPS.map((s) => (
          <div key={s.id} className={`rail-step ${activeStep >= s.id ? "is-active" : ""}`}>
            <div className="rail-step__node">{s.id}</div>
            <div>
              <strong>{s.title}</strong>
              <p className="muted">{s.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {result ? (
        <pre className="rail-result mono">
          {JSON.stringify(result, null, 2).slice(0, 1200)}
        </pre>
      ) : null}
    </section>
  );
}