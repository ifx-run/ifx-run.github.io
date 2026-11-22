import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { DEFAULT_IFX_PROGRAM_ID } from '../lib/ifx/program-ids'
import { SAMPLE_TXS } from '../lib/samples'
import { fetchAndExploreTransaction, RpcExploreError } from '../lib/solana/fetch-tx'
import {
  exploreFromWire,
  type ExploredInstruction,
  type ExploredTransaction,
} from '../lib/solana/parse-tx'
import { shortenAddress } from '../lib/solana/bytes'

function looksLikeSignature(s: string): boolean {
  const t = s.trim()
  return /^[1-9A-HJ-NP-Za-km-z]{64,128}$/.test(t)
}

export function ExplorerWorkspace() {
  const { t, lang, rpcUrl, setRpcUrl, resetRpcUrl } = useApp()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const inputId = useId()
  const rpcId = useId()

  const [input, setInput] = useState(() => params.get('tx') ?? '')
  const [rpcDraft, setRpcDraft] = useState(rpcUrl)
  const [result, setResult] = useState<ExploredTransaction | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [hint, setHint] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<number | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const lastAutoTx = useRef<string | null>(null)

  useEffect(() => {
    setRpcDraft(rpcUrl)
  }, [rpcUrl])

  const run = useCallback(
    async (raw: string, opts?: { fromQuery?: boolean }) => {
      const value = raw.trim()
      if (!value) return

      abortRef.current?.abort()
      const ac = new AbortController()
      abortRef.current = ac

      setLoading(true)
      setError(null)
      setHint(null)
      setSelected(null)

      try {
        let explored: ExploredTransaction
        if (looksLikeSignature(value)) {
          explored = await fetchAndExploreTransaction(value, rpcUrl, ac.signal)
          if (!opts?.fromQuery) {
            navigate(`/?tx=${encodeURIComponent(value)}`, { replace: true })
          }
        } else {
          explored = exploreFromWire(value)
          if (!opts?.fromQuery) {
            navigate('/', { replace: true })
          }
        }
        if (!ac.signal.aborted) {
          setResult(explored)
          const firstIfx = explored.instructions.findIndex((i) => i.isIfx)
          setSelected(firstIfx >= 0 ? firstIfx : 0)
        }
      } catch (e) {
        if (ac.signal.aborted) return
        setResult(null)
        if (e instanceof RpcExploreError) {
          setError(e.message)
          if (e.kind === 'rpc' || e.kind === 'not_found') setHint(t.tryRpc)
          if (e.kind === 'decode' || e.kind === 'not_found') {
            setHint((h) => (h ? `${h} ${t.tryWire}` : t.tryWire))
          }
        } else if (e instanceof Error) {
          setError(e.message)
          setHint(t.tryWire)
        } else {
          setError(t.errorGeneric)
        }
      } finally {
        if (!ac.signal.aborted) setLoading(false)
      }
    },
    [navigate, rpcUrl, t],
  )

  // Deep-link via ?tx=
  useEffect(() => {
    const tx = params.get('tx')
    if (!tx || tx === lastAutoTx.current) return
    lastAutoTx.current = tx
    setInput(tx)
    void run(tx, { fromQuery: true })
  }, [params, run])

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    void run(input)
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault()
      void run(input)
    }
  }

  return (
    <div className="workspace">
      <form className="ingress" onSubmit={onSubmit}>
        <label className="field-label" htmlFor={inputId}>
          {t.inputLabel}
        </label>
        <textarea
          id={inputId}
          className="ingress-input"
          rows={3}
          spellCheck={false}
          placeholder={t.inputPlaceholder}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          disabled={loading}
        />
        <div className="ingress-actions">
          <button type="submit" className="primary" disabled={loading || !input.trim()}>
            {loading ? t.loading : t.load}
          </button>
          <span className="kbd-hint">⌘/Ctrl + Enter</span>
        </div>

        <div className="rpc-row">
          <label htmlFor={rpcId}>{t.rpcLabel}</label>
          <input
            id={rpcId}
            className="rpc-input"
            value={rpcDraft}
            onChange={(e) => setRpcDraft(e.target.value)}
            spellCheck={false}
          />
          <button
            type="button"
            className="ghost"
            onClick={() => setRpcUrl(rpcDraft)}
          >
            {t.rpcSave}
          </button>
          <button type="button" className="ghost" onClick={resetRpcUrl}>
            {t.rpcReset}
          </button>
        </div>

        <div className="samples">
          <span className="samples-label">{t.samples}</span>
          {SAMPLE_TXS.map((s) => (
            <button
              key={s.id}
              type="button"
              className="sample-chip"
              onClick={() => {
                setInput(s.signature)
                void run(s.signature)
              }}
            >
              {lang === 'zh' ? s.labelZh : s.labelEn}
            </button>
          ))}
        </div>
      </form>

      {error && (
        <div className="banner error" role="alert">
          <p>{error}</p>
          {hint && <p className="banner-hint">{hint}</p>}
        </div>
      )}

      {!result && !error && !loading && (
        <EmptyState />
      )}

      {result && (
        <div className="result-grid">
          <PacketPanel result={result} />
          <InstructionTimeline
            instructions={result.instructions}
            selected={selected}
            onSelect={setSelected}
            signature={result.signature}
          />
          {selected !== null && result.instructions[selected] && (
            <InstructionDetail
              ix={result.instructions[selected]!}
              signature={result.signature}
            />
          )}
          <p className="decoder-note">{result.decoderNote}</p>
        </div>
      )}
    </div>
  )
}

function EmptyState() {
  const { t } = useApp()
  return (
    <section className="empty">
      <h1>{t.emptyTitle}</h1>
      <p>{t.emptyBody}</p>
      <ul className="empty-links">
        <li>
          <a href="https://github.com/ifx-run/ifx" target="_blank" rel="noreferrer">
            {t.github}
          </a>
        </li>
        <li>
          <a
            href="https://www.npmjs.com/package/@ifx-run/sdk"
            target="_blank"
            rel="noreferrer"
          >
            {t.npm}
          </a>
        </li>
        <li>
          <span>{t.programId}</span>{' '}
          <code>{DEFAULT_IFX_PROGRAM_ID}</code>
        </li>
      </ul>
    </section>
  )
}

function PacketPanel({ result }: { result: ExploredTransaction }) {
  const { t } = useApp()
  const { packet } = result
  const version =
    packet.version === 'legacy' ? 'legacy' : `v${packet.version}`

  return (
    <section className="panel packet-panel">
      <h2>{t.packet}</h2>
      <dl className="meta-dl">
        <div>
          <dt>{t.version}</dt>
          <dd>
            <span className={`ver-pill ver-${version}`}>{version}</span>
          </dd>
        </div>
        <div>
          <dt>{t.wireBytes}</dt>
          <dd>
            {packet.wireBytes || '—'} B
            {packet.messageBytes ? (
              <span className="muted"> · msg {packet.messageBytes} B</span>
            ) : null}
          </dd>
        </div>
        <div>
          <dt>{t.alts}</dt>
          <dd>
            {packet.altCount === 0
              ? '—'
              : packet.altAddresses.map((a) => shortenAddress(a)).join(', ')}
          </dd>
        </div>
        {packet.v1Header && (
          <div className="v1-block">
            <dt>{t.v1Header}</dt>
            <dd>
              <div>
                {t.cuLimit}:{' '}
                <code>{packet.v1Header.computeUnitLimit ?? 'unset (0)'}</code>
              </div>
              <div>
                {t.loadedData}:{' '}
                <code>
                  {packet.v1Header.loadedAccountsDataSizeLimit ?? 'unset (0)'}
                </code>
              </div>
              {packet.v1Header.priorityFeeLamports !== undefined && (
                <div>
                  priority fee:{' '}
                  <code>{packet.v1Header.priorityFeeLamports} lamports</code>
                </div>
              )}
            </dd>
          </div>
        )}
        {result.signature && (
          <div>
            <dt>sig</dt>
            <dd>
              <code className="break">{result.signature}</code>
            </dd>
          </div>
        )}
        {result.slot != null && (
          <div>
            <dt>slot</dt>
            <dd>{String(result.slot)}</dd>
          </div>
        )}
      </dl>
    </section>
  )
}

function InstructionTimeline({
  instructions,
  selected,
  onSelect,
  signature,
}: {
  instructions: ExploredInstruction[]
  selected: number | null
  onSelect: (i: number) => void
  signature?: string
}) {
  const { t } = useApp()
  return (
    <section className="panel timeline-panel">
      <div className="panel-head">
        <h2>{t.instructions}</h2>
        {signature && (
          <a
            className="ext-link"
            href={`https://solscan.io/tx/${signature}`}
            target="_blank"
            rel="noreferrer"
            title={t.solscanNote}
          >
            {t.solscan} ↗
          </a>
        )}
      </div>
      <ol className="timeline">
        {instructions.map((ix) => (
          <li key={ix.index}>
            <button
              type="button"
              className={[
                'timeline-item',
                ix.isIfx ? 'is-ifx' : 'is-other',
                selected === ix.index ? 'is-selected' : '',
              ].join(' ')}
              onClick={() => onSelect(ix.index)}
            >
              <span className="ix-idx">{ix.index}</span>
              <span className="ix-name">
                {ix.isIfx ? ix.ifxShort ?? 'ifx' : shortenAddress(ix.programId, 5, 4)}
              </span>
              <span className="ix-sum">{ix.summary}</span>
            </button>
          </li>
        ))}
      </ol>
      {signature && <p className="solscan-note">{t.solscanNote}</p>}
    </section>
  )
}

function InstructionDetail({
  ix,
  signature,
}: {
  ix: ExploredInstruction
  signature?: string
}) {
  const { t } = useApp()
  return (
    <section className="panel detail-panel">
      <h2>
        #{ix.index}{' '}
        {ix.isIfx ? (
          <span className="ifx-badge">{ix.ifxName}</span>
        ) : (
          <code>{shortenAddress(ix.programId, 8, 6)}</code>
        )}
      </h2>
      {ix.ifxCluster && (
        <p className="muted">
          cluster: {ix.ifxCluster} · program{' '}
          <code>{shortenAddress(ix.programId, 6, 4)}</code>
        </p>
      )}
      <h3>{t.accounts}</h3>
      <ul className="acct-list">
        {ix.accounts.map((a, i) => (
          <li key={`${a.address}-${i}`}>
            <span className="acct-role">{a.role}</span>
            <code>{a.address}</code>
          </li>
        ))}
        {ix.accounts.length === 0 && <li className="muted">—</li>}
      </ul>
      <h3>{t.data}</h3>
      <p>
        <code>
          {ix.dataLen} B · {ix.dataHex}
        </code>
      </p>
      {ix.isIfx && (
        <p className="muted">
          {t.argsL0} — {t.payloadBytes}
        </p>
      )}
      <div className="detail-links">
        {ix.docsSlug && (
          <Link to={`/docs/${ix.docsSlug}`}>{t.docs}</Link>
        )}
        {signature && (
          <a
            href={`https://solscan.io/tx/${signature}`}
            target="_blank"
            rel="noreferrer"
          >
            {t.solscan}
          </a>
        )}
      </div>
    </section>
  )
}
