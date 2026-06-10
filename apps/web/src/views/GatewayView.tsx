import { useCallback, useEffect, useState } from "react";
import {
  ERC20_ABI,
  GATEWAY_ABI,
  PLAN_LABELS,
  claimFreeOnchainos,
  fetchGatewayConfig,
  fetchOnchainosWalletStatus,
  getEthereum,
  hasBrowserWallet,
  publicClient,
  switchToXLayer,
  type GatewayConfig,
  type OnchainosWalletStatus,
} from "../lib/gateway";

const ENDPOINTS = [
  { label: "市场概览", path: "/api/v1/market/overview" },
  { label: "SOL 情报", path: "/api/v1/token/solana/So11111111111111111111111111111111111111112" },
  { label: "Solana 监控", path: "/api/v1/monitor/solana" },
];

const DEV_KEY = "gw-dev-key-001";

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
  const [browserWallet, setBrowserWallet] = useState(false);
  const [onchainos, setOnchainos] = useState<OnchainosWalletStatus | null>(null);

  useEffect(() => {
    fetchGatewayConfig().then(setConfig).catch(() => setConfig(null));
    setBrowserWallet(hasBrowserWallet());
    fetchOnchainosWalletStatus()
      .then((wallet) => {
        setOnchainos(wallet);
        if (wallet.loggedIn && wallet.address && !hasBrowserWallet()) {
          setAddress(wallet.address);
        }
      })
      .catch(() => setOnchainos({ loggedIn: false, address: null, email: null }));
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
    if (address) {
      fetchKey(address, config?.contract);
      return;
    }
    const ethereum = getEthereum() as { request: (a: { method: string }) => Promise<string[]> } | undefined;
    if (!ethereum) return;
    ethereum.request({ method: "eth_accounts" }).then((addrs) => {
      if (addrs[0]) {
        setAddress(addrs[0]);
      }
    }).catch(() => {});
  }, [config?.contract, fetchKey, address]);

  const connect = async () => {
    const ethereum = getEthereum() as { request: (a: { method: string }) => Promise<string[]> } | undefined;
    if (!ethereum) {
      setStatus("未检测到浏览器钱包。你用的是 onchainos Agent 钱包，请用下方「Agent 钱包」方式领取。");
      return;
    }
    setLoading(true);
    setStatus(null);
    try {
      await switchToXLayer();
      const addrs = await ethereum.request({ method: "eth_requestAccounts" });
      setAddress(addrs[0]);
      await fetchKey(addrs[0], config?.contract);
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "连接失败");
    } finally {
      setLoading(false);
    }
  };

  const useOnchainosWallet = () => {
    if (!onchainos?.loggedIn || !onchainos.address) {
      setStatus("onchainos 未登录。在终端运行: onchainos wallet login");
      return;
    }
    setAddress(onchainos.address);
    setStatus(`已绑定 Agent 钱包 ${onchainos.address.slice(0, 6)}…${onchainos.address.slice(-4)}`);
  };

  const claimViaOnchainos = async () => {
    if (!onchainos?.loggedIn || !onchainos.address) {
      setStatus("onchainos 未登录。在终端运行: onchainos wallet login");
      return;
    }
    setLoading(true);
    setStatus(null);
    try {
      const result = await claimFreeOnchainos(onchainos.address);
      setAddress(result.address);
      if (result.txHash) {
        await publicClient.waitForTransactionReceipt({ hash: result.txHash as `0x${string}` });
      }
      await fetchKey(result.address, config?.contract);
      setStatus("Free Key 已领取！钱包地址即为 x-api-key");
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "领取失败");
    } finally {
      setLoading(false);
    }
  };

  const writeContract = async (functionName: "claimFree" | "purchaseWithUSDT" | "purchaseWithUSDG") => {
    const ethereum = getEthereum();
    const contract = config?.contract;
    if (!ethereum || !address || !contract) {
      if (!browserWallet && onchainos?.loggedIn) {
        if (functionName === "claimFree") {
          await claimViaOnchainos();
          return;
        }
        setStatus("购买 Pro 需要浏览器钱包扩展，或联系支持开通");
        return;
      }
      setStatus("合约尚未部署，暂无法链上购买");
      return;
    }

    setLoading(true);
    setStatus(null);
    try {
      const { writeContract } = await import("viem/actions");
      const { createWalletClient, custom, parseUnits } = await import("viem");

      const wc = createWalletClient({
        chain: (await import("viem/chains")).xLayer,
        transport: custom(ethereum as Parameters<typeof custom>[0]),
      });

      if (functionName === "purchaseWithUSDT") {
        const token = config?.tokens.usdt as `0x${string}`;
        const price = parseUnits(config?.pricing.proUsdt || "99", 6);
        const allowance = await publicClient.readContract({
          address: token,
          abi: ERC20_ABI,
          functionName: "allowance",
          args: [address as `0x${string}`, contract as `0x${string}`],
        });
        if (allowance < price) {
          const approveHash = await writeContract(wc, {
            address: token,
            abi: ERC20_ABI,
            functionName: "approve",
            args: [contract as `0x${string}`, price],
            account: address as `0x${string}`,
          });
          setStatus(`授权交易已发送: ${approveHash.slice(0, 10)}…`);
          await publicClient.waitForTransactionReceipt({ hash: approveHash });
        }
      }

      const hash = await writeContract(wc, {
        address: contract as `0x${string}`,
        abi: GATEWAY_ABI,
        functionName,
        account: address as `0x${string}`,
      });
      setStatus(`交易已发送: ${hash.slice(0, 10)}…`);
      await publicClient.waitForTransactionReceipt({ hash });
      await fetchKey(address, contract);
      setStatus("链上 Key 已激活，使用钱包地址作为 x-api-key");
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "交易失败");
    } finally {
      setLoading(false);
    }
  };

  const runPlayground = async () => {
    setPlayLoading(true);
    setPlayResp(null);
    const ep = ENDPOINTS[activeEp];
    const apiKey = address || DEV_KEY;
    const start = Date.now();
    try {
      const res = await fetch(ep.path, { headers: { "x-api-key": apiKey } });
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
  const showAgentWallet = !browserWallet && onchainos?.loggedIn && onchainos.address;

  return (
    <div className="gateway-view">
      <div className="dashboard-hero">
        <div>
          <div className="eyebrow">Gateway Key</div>
          <h2>链上购买 API Key</h2>
          <p className="muted">
            在 X Layer 上领取 Free Key 或用 USDT 购买 Pro。你的钱包地址即为 API Key。
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
          {!address ? (
            <div className="gateway-wallet__empty">
              <h3>连接 X Layer 钱包</h3>
              {browserWallet ? (
                <>
                  <p className="muted">使用 OKX Wallet 或 MetaMask 浏览器扩展</p>
                  <button type="button" className="btn btn--primary" onClick={connect} disabled={loading}>
                    {loading ? "连接中…" : "连接钱包"}
                  </button>
                </>
              ) : showAgentWallet ? (
                <>
                  <p className="muted gateway-wallet__hint">
                    onchainos Agent 钱包不会注入浏览器，因此「连接钱包」不会出现弹窗。
                    你已登录 <strong>{onchainos.email}</strong>，可直接用 Agent 钱包领取。
                  </p>
                  <div className="gateway-wallet__actions">
                    <button type="button" className="btn btn--primary" onClick={useOnchainosWallet} disabled={loading}>
                      使用 Agent 钱包
                    </button>
                    <button type="button" className="btn btn--ghost" onClick={claimViaOnchainos} disabled={loading || !contractDeployed}>
                      {loading ? "领取中…" : "一键领取 Free Key"}
                    </button>
                  </div>
                  <p className="muted gateway-wallet__subhint mono">
                    {onchainos.address}
                  </p>
                </>
              ) : (
                <>
                  <p className="muted gateway-wallet__hint">
                    未检测到浏览器钱包。若你使用 onchainos，请先在终端登录：
                  </p>
                  <pre className="code-panel__body gateway-curl" style={{ textAlign: "left", margin: "12px 0" }}>
                    <code>onchainos wallet login</code>
                  </pre>
                  <p className="muted">或安装 <a href="https://www.okx.com/web3" target="_blank" rel="noreferrer" style={{ color: "var(--accent)" }}>OKX Wallet 扩展</a> 后刷新页面。</p>
                  <button type="button" className="btn btn--ghost" onClick={connect} disabled={loading}>
                    仍要尝试连接
                  </button>
                </>
              )}
            </div>
          ) : hasKey ? (
            <div>
              <div className="gateway-wallet__head">
                <h3>{PLAN_LABELS[Number(plan)]} Key</h3>
                <span className="panel__tag">活跃</span>
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
                <span className="muted">你的 API Key</span>
                <code>{address}</code>
              </div>
            </div>
          ) : (
            <div>
              <div className="gateway-wallet__head">
                <p className="mono muted">{address.slice(0, 6)}…{address.slice(-4)}</p>
              </div>
              <p className="muted" style={{ marginBottom: "16px" }}>你还没有 API Key</p>
              <div className="gateway-plans">
                <button
                  type="button"
                  className="gateway-plan"
                  disabled={loading || !contractDeployed}
                  onClick={() => writeContract("claimFree")}
                >
                  <strong>Free</strong>
                  <span>10 次/分钟</span>
                  <em>{contractDeployed ? "免费领取" : "合约待部署"}</em>
                </button>
                <button
                  type="button"
                  className="gateway-plan gateway-plan--pro"
                  disabled={loading || !contractDeployed || !browserWallet}
                  onClick={() => writeContract("purchaseWithUSDT")}
                >
                  <strong>Pro</strong>
                  <span>60 次/分钟</span>
                  <em>{config?.pricing.proUsdt || "99"} USDT/月</em>
                </button>
              </div>
              {!browserWallet ? (
                <p className="muted gateway-wallet__subhint">Agent 钱包可领 Free；购买 Pro 需浏览器扩展。</p>
              ) : null}
            </div>
          )}
        </section>

        <section className="panel gateway-playground">
          <div className="panel__head">
            <div>
              <h3>API 试调</h3>
              <p className="muted">使用 {address ? "钱包地址" : DEV_KEY} 作为 Key</p>
            </div>
            <button type="button" className="btn btn--ghost" onClick={runPlayground} disabled={playLoading}>
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
            <code>{`curl -H "x-api-key: ${address || DEV_KEY}" \\
  http://localhost:3847${ENDPOINTS[activeEp].path}`}</code>
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
            <p className="muted gateway-hint">选择端点并点击试调，查看真实行情响应</p>
          )}
        </section>
      </div>

      <section className="panel panel--wide gateway-contract">
        <h3>合约状态 · X Layer 主网</h3>
        {contractDeployed ? (
          <p className="muted">
            GatewayKey: <code>{config?.contract}</code>
            {" · "}
            <a
              href={`https://www.okx.com/explorer/xlayer/address/${config?.contract}`}
              target="_blank"
              rel="noreferrer"
              style={{ color: "var(--accent)" }}
            >
              浏览器查看
            </a>
          </p>
        ) : (
          <p className="muted">合约地址加载中…</p>
        )}
      </section>
    </div>
  );
}