import { useCallback, useEffect, useState } from "react";
import {
  ERC20_ABI,
  GATEWAY_ABI,
  PLAN_LABELS,
  fetchGatewayConfig,
  getEthereum,
  publicClient,
  switchToXLayer,
  type GatewayConfig,
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

  useEffect(() => {
    fetchGatewayConfig().then(setConfig).catch(() => setConfig(null));
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
    const ethereum = getEthereum() as { request: (a: { method: string }) => Promise<string[]> } | undefined;
    if (!ethereum) return;
    ethereum.request({ method: "eth_accounts" }).then((addrs) => {
      if (addrs[0]) {
        setAddress(addrs[0]);
        fetchKey(addrs[0], config?.contract);
      }
    }).catch(() => {});
  }, [config?.contract, fetchKey]);

  const connect = async () => {
    const ethereum = getEthereum() as { request: (a: { method: string }) => Promise<string[]> } | undefined;
    if (!ethereum) {
      setStatus("请安装 MetaMask 或 OKX Wallet");
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

  const writeContract = async (functionName: "claimFree" | "purchaseWithUSDT" | "purchaseWithUSDG") => {
    const ethereum = getEthereum();
    const contract = config?.contract;
    if (!ethereum || !address || !contract) {
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
              <p className="muted">领取 Free Key 或购买 Pro 套餐</p>
              <button type="button" className="btn btn--primary" onClick={connect} disabled={loading}>
                {loading ? "连接中…" : "连接钱包"}
              </button>
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
                  disabled={loading || !contractDeployed}
                  onClick={() => writeContract("purchaseWithUSDT")}
                >
                  <strong>Pro</strong>
                  <span>60 次/分钟</span>
                  <em>{config?.pricing.proUsdt || "99"} USDT/月</em>
                </button>
              </div>
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
        <h3>合约状态</h3>
        <p className="muted">
          {contractDeployed
            ? <>GatewayKey 已部署: <code>{config?.contract}</code></>
            : "合约尚未部署。运行 foundry 脚本后设置 GATEWAY_CONTRACT_ADDRESS 即可启用链上 Key。"}
        </p>
        {contractDeployed ? null : (
          <pre className="code-panel__body" style={{ marginTop: "12px" }}>
            <code>{`cd contracts
export DEPLOYER_PRIVATE_KEY=0x...
forge script script/DeployGatewayKey.s.sol --rpc-url https://rpc.xlayer.tech --broadcast`}</code>
          </pre>
        )}
      </section>
    </div>
  );
}