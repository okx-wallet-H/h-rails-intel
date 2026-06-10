import { useCallback, useEffect, useState } from "react";
import {
  GATEWAY_ABI,
  PLAN_LABELS,
  claimFreeOnchainos,
  purchaseProOnchainos,
  fetchGatewayConfig,
  fetchOnchainosWalletStatus,
  publicClient,
  type GatewayConfig,
  type OnchainosWalletStatus,
} from "../lib/gateway";

const ENDPOINTS = [
  { label: "市场概览", path: "/api/v1/market/overview" },
  { label: "SOL 情报", path: "/api/v1/token/solana/So11111111111111111111111111111111111111112" },
  { label: "Solana 监控", path: "/api/v1/monitor/solana" },
];

type KeyTuple = readonly [bigint, number, bigint, bigint, boolean];

export function GatewayView() {
  const [config, setConfig] = useState<GatewayConfig | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [keyData, setKeyData] = useState<KeyTuple | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [activeEp, setActiveEp] = useState(0);
  const [playResp, setPlayResp] = useState<{ code: number; ms: number; body: unknown } | null>(null);
  const [playLoading, setPlayLoading] = useState(false);
  const [agent, setAgent] = useState<OnchainosWalletStatus | null>(null);

  useEffect(() => {
    fetchGatewayConfig().then(setConfig).catch(() => setConfig(null));
    fetchOnchainosWalletStatus()
      .then((wallet) => {
        setAgent(wallet);
        if (wallet.loggedIn && wallet.address) setAddress(wallet.address);
      })
      .catch(() => setAgent({ loggedIn: false, address: null, email: null }));
  }, []);

  const fetchKey = useCallback(async (addr: string, contract?: string | null) => {
    const target = contract || config?.contract;
    if (!target) {
      setKeyData(null);
      return;
    }
    try {
      const result = await publicClient.readContract({
        address: target as `0x${string}`,
        abi: GATEWAY_ABI,
        functionName: "getKey",
        args: [addr as `0x${string}`],
      });
      setKeyData(result as KeyTuple);
    } catch {
      setKeyData(null);
    }
  }, [config?.contract]);

  useEffect(() => {
    if (address && config?.contract) fetchKey(address, config.contract);
  }, [address, config?.contract, fetchKey]);

  const upgradeToPro = async () => {
    if (!agent?.loggedIn || !agent.address) {
      setStatus("Agent Wallet 未登录");
      return;
    }
    setLoading(true);
    setStatus(null);
    try {
      const result = await purchaseProOnchainos(agent.address);
      setAddress(result.address);
      await fetchKey(result.address, config?.contract);
      setStatus(`Pro 已激活 · ${result.priceUsdt} USDT/月 · 60 次/分钟`);
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "升级失败");
    } finally {
      setLoading(false);
    }
  };

  const claimViaAgent = async () => {
    if (!agent?.loggedIn || !agent.address) {
      setStatus("Agent Wallet 未登录。终端执行: onchainos wallet login");
      return;
    }
    setLoading(true);
    setStatus(null);
    try {
      const result = await claimFreeOnchainos(agent.address);
      setAddress(result.address);
      if (result.txHash) {
        await publicClient.waitForTransactionReceipt({ hash: result.txHash as `0x${string}` });
      }
      await fetchKey(result.address, config?.contract);
      setStatus("Free Key 已激活。钱包地址即为 x-api-key。");
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "领取失败");
    } finally {
      setLoading(false);
    }
  };

  const runPlayground = async () => {
    if (!address) {
      setStatus("请先登录 onchainos Agent Wallet");
      return;
    }
    setPlayLoading(true);
    setPlayResp(null);
    const ep = ENDPOINTS[activeEp];
    const start = Date.now();
    try {
      const res = await fetch(ep.path, { headers: { "x-api-key": address } });
      const body = await res.json();
      setPlayResp({ code: res.status, ms: Date.now() - start, body });
    } catch (e) {
      setPlayResp({ code: 500, ms: Date.now() - start, body: { error: e instanceof Error ? e.message : "请求失败" } });
    } finally {
      setPlayLoading(false);
    }
  };

  const [tokenId, plan, , expiresAt, active] = keyData || [0n, 0, 0n, 0n, false];
  const hasKey = tokenId > 0n && active;
  const contractDeployed = Boolean(config?.contract);
  const agentReady = Boolean(agent?.loggedIn && agent.address);

  return (
    <div className="gateway-view">
      <div className="dashboard-hero">
        <div>
          <div className="eyebrow">onchainos · Agent Wallet</div>
          <h2>Gateway API Key</h2>
          <p className="muted">
            H Rails 为 Agent 设计。你的 onchainos Agent Wallet 地址就是 API Key，链上领取、TEE 签名、无需浏览器插件。
          </p>
        </div>
        <div className="dashboard-hero__stats">
          <div><span>Free</span><strong>10/min</strong></div>
          <div><span>Pro</span><strong>60/min</strong></div>
          <div><span>Enterprise</span><strong>300/min</strong></div>
        </div>
      </div>

      {status ? <div className="container"><div className="status-banner">{status}</div></div> : null}

      <div className="gateway-grid">
        <section className="panel gateway-wallet">
          {!agentReady ? (
            <div className="gateway-wallet__empty">
              <h3>登录 Agent Wallet</h3>
              <p className="muted gateway-wallet__hint">
                H Rails 使用 onchainos Agent Wallet，不走浏览器钱包弹窗。先在终端登录：
              </p>
              <pre className="code-panel__body gateway-curl" style={{ textAlign: "left", margin: "12px 0" }}>
                <code>onchainos wallet login</code>
              </pre>
              <p className="muted gateway-wallet__subhint">登录后刷新此页面，会自动识别你的 X Layer 地址。</p>
            </div>
          ) : hasKey ? (
            <div>
              <div className="gateway-wallet__head">
                <h3>{PLAN_LABELS[Number(plan)]} Key</h3>
                <span className="panel__tag">Agent · 活跃</span>
              </div>
              <div className="gateway-agent-badge">
                <span>onchainos</span>
                <strong>{agent?.email}</strong>
                <em>{agent?.accountName || "Account"}</em>
              </div>
              <div className="gateway-wallet__meta">
                <div><span>Token ID</span><strong>#{tokenId.toString()}</strong></div>
                <div>
                  <span>过期</span>
                  <strong>
                    {Number(expiresAt) > 1e12
                      ? "永久"
                      : new Date(Number(expiresAt) * 1000).toLocaleDateString("zh-CN")}
                  </strong>
                </div>
              </div>
              <div className="gateway-key-box">
                <span className="muted">x-api-key（你的 Agent 钱包地址）</span>
                <code>{address}</code>
              </div>
              {Number(plan) === 0 ? (
                <div style={{ marginTop: 16 }}>
                  <p className="muted gateway-wallet__subhint">
                    升级 Pro：{config?.pricing.proUsdt || "99"} USDT/月 · 60 次/分钟 · Agent Wallet 签名
                  </p>
                  <button
                    type="button"
                    className="btn btn--ghost"
                    disabled={loading || !contractDeployed}
                    onClick={upgradeToPro}
                  >
                    {loading ? "签名上链中…" : "升级 Pro"}
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
            <div>
              <div className="gateway-wallet__head">
                <h3>Agent Wallet 已连接</h3>
                <span className="panel__tag">待领取</span>
              </div>
              <div className="gateway-agent-badge">
                <span>onchainos</span>
                <strong>{agent?.email}</strong>
              </div>
              <p className="mono muted" style={{ marginBottom: "12px" }}>{address}</p>
              <p className="muted" style={{ marginBottom: "16px" }}>
                在 X Layer 主网领取 Free Key，由 Agent Wallet TEE 签名上链。
              </p>
              <button
                type="button"
                className="btn btn--primary"
                disabled={loading || !contractDeployed}
                onClick={claimViaAgent}
              >
                {loading ? "签名上链中…" : "领取 Free Key"}
              </button>
            </div>
          )}
        </section>

        <section className="panel gateway-playground">
          <div className="panel__head">
            <div>
              <h3>API 试调</h3>
              <p className="muted">
                {address ? "使用 Agent 钱包地址作为 Key" : "登录 Agent Wallet 后试调"}
              </p>
            </div>
            <button type="button" className="btn btn--ghost" onClick={runPlayground} disabled={playLoading || !address}>
              {playLoading ? "请求中…" : "试调"}
            </button>
          </div>
          <div className="gateway-tabs">
            {ENDPOINTS.map((ep, i) => (
              <button
                key={ep.path}
                type="button"
                className={`gateway-tab ${i === activeEp ? "is-active" : ""}`}
                onClick={() => { setActiveEp(i); setPlayResp(null); }}
              >
                {ep.label}
              </button>
            ))}
          </div>
          <pre className="code-panel__body gateway-curl">
            <code>{address
              ? `curl -H "x-api-key: ${address}" \\\n  http://localhost:3847${ENDPOINTS[activeEp].path}`
              : `# 登录 onchainos 后，x-api-key = 你的 Agent 钱包地址\ncurl -H "x-api-key: <你的地址>" \\\n  http://localhost:3847${ENDPOINTS[activeEp].path}`}</code>
          </pre>
          {playResp ? (
            <div className="gateway-response">
              <div className="gateway-response__meta">
                <span className={playResp.code === 200 ? "ok" : "err"}>HTTP {playResp.code}</span>
                <span>{playResp.ms}ms</span>
              </div>
              <pre>{JSON.stringify(playResp.body, null, 2).slice(0, 3000)}</pre>
            </div>
          ) : (
            <p className="muted gateway-hint">选择端点并点击试调</p>
          )}
        </section>
      </div>

      <section className="panel panel--wide gateway-contract">
        <h3>GatewayKey 合约 · X Layer 主网</h3>
        {contractDeployed ? (
          <p className="muted">
            <code>{config?.contract}</code>
            {" · "}
            <a
              href={`https://www.okx.com/explorer/xlayer/address/${config?.contract}`}
              target="_blank"
              rel="noreferrer"
              style={{ color: "var(--accent)" }}
            >
              链上查看
            </a>
          </p>
        ) : (
          <p className="muted">合约地址加载中…</p>
        )}
      </section>
    </div>
  );
}