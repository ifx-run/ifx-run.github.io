import {
  useCallback,
  useId,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import {
  exploreFromWire,
  exploreFromWireResolvingAlts,
  type ExploredInstruction,
  type ExploredTransaction,
} from '../lib/solana/parse-tx'
import { shortenAddress } from '../lib/solana/bytes'
import { getStoredRpcUrl, setStoredRpcUrl } from '../lib/solana/rpc'

export function ExplorerWorkspace() {
  const { t } = useApp()
  const inputId = useId()
  const rpcId = useId()
  const abortRef = useRef<AbortController | null>(null)

  const [input, setInput] = useState('')
  const [rpcDraft, setRpcDraft] = useState(() => getStoredRpcUrl())
  const [result, setResult] = useState<ExploredTransaction | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [rpcError, setRpcError] = useState<string | null>(null)
  const [selected, setSelected] = useState<number | null>(null)
  const [resolving, setResolving] = useState(false)

  const applyResult = useCallback((explored: ExploredTransaction) => {
    setResult(explored)
    const firstIfx = explored.instructions.findIndex((i) => i.isIfx)
    setSelected(firstIfx >= 0 ? firstIfx : explored.instructions.length ? 0 : null)
  }, [])

  const run = useCallback(
    (raw: string) => {
      const value = raw.trim()
      if (!value) return

      abortRef.current?.abort()
      setError(null)
      setRpcError(null)
      setSelected(null)

      try {
        applyResult(exploreFromWire(value))
      } catch (e) {
        setResult(null)
        if (e instanceof Error) {
          setError(e.message)
        } else {
          setError(t.errorGeneric)
        }
      }
    },
    [applyResult, t],
  )

  const resolveAlts = useCallback(async () => {
    const value = input.trim()
    const rpc = rpcDraft.trim()
    if (!value || !rpc) return

    abortRef.current?.abort()
    const ac = new AbortController()
    abortRef.current = ac

    setStoredRpcUrl(rpc)
    setResolving(true)
    setRpcError(null)

    try {
      const explored = await exploreFromWireResolvingAlts(value, rpc, ac.signal)
      if (!ac.signal.aborted) applyResult(explored)
    } catch (e) {
      if (ac.signal.aborted) return
      if (e instanceof Error) {
        setRpcError(e.message)
      } else {
        setRpcError(t.errorGeneric)
      }
    } finally {
      if (!ac.signal.aborted) setResolving(false)
    }
  }, [applyResult, input, rpcDraft, t])

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    run(input)
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault()
      run(input)
    }
  }

  const showAltRpc = Boolean(result?.needsAltRpc)

  return (
    <div className="workspace">
      <form className="ingress" onSubmit={onSubmit}>
        <label className="field-label" htmlFor={inputId}>
          {t.inputLabel}
        </label>
        <textarea
          id={inputId}
          className="ingress-input"
          rows={5}
          spellCheck={false}
          placeholder={t.inputPlaceholder}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
        />
        <div className="ingress-actions">
          <button type="submit" className="primary" disabled={!input.trim()}>
            {t.load}
          </button>
          <span className="kbd-hint">⌘/Ctrl + Enter</span>
        </div>
        {!showAltRpc && <p className="offline-note">{t.offlineNote}</p>}
      </form>

      {error && (
        <div className="banner error" role="alert">
          <p>{error}</p>
          <p className="banner-hint">{t.tryWire}</p>
        </div>
      )}

      {!result && !error && <EmptyState />}

      {result && (
        <div className="result-grid">
          <PacketPanel result={result} />

          {showAltRpc && (
            <section className="panel alt-rpc-panel" aria-live="polite">
              <h2>{t.altRpcTitle}</h2>
              <p className="alt-rpc-why">{t.altRpcWhy}</p>
              <div className="alt-rpc-row">
                <label htmlFor={rpcId}>{t.rpcLabel}</label>
                <input
                  id={rpcId}
                  className="rpc-input"
                  value={rpcDraft}
                  onChange={(e) => setRpcDraft(e.target.value)}
                  spellCheck={false}
                  placeholder="https://…"
                  disabled={resolving}
                />
                <button
                  type="button"
                  className="primary"
                  disabled={resolving || !rpcDraft.trim()}
                  onClick={() => void resolveAlts()}
                >
                  {resolving ? t.altRpcLoading : t.altRpcResolve}
                </button>
              </div>
              {rpcError && (
                <p className="alt-rpc-error" role="alert">
                  {rpcError}
                </p>
              )}
            </section>
          )}

          {result.altResolved && result.instructions.length > 0 && (
            <>
              <InstructionTimeline
                instructions={result.instructions}
                selected={selected}
                onSelect={setSelected}
              />
              {selected !== null && result.instructions[selected] && (
                <InstructionDetail ix={result.instructions[selected]!} />
              )}
            </>
          )}

          {showAltRpc && (
            <p className="decoder-note">{t.altRpcPendingNote}</p>
          )}
          {!showAltRpc && (
            <p className="decoder-note">{result.decoderNote}</p>
          )}
        </div>
      )}
    </div>
  )
}

function EmptyState() {
  const { t } = useApp()
  return (
    <section className="empty">
      <h2>{t.emptyTitle}</h2>
      <p>{t.emptyBody}</p>
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
          <dt>{t.encoding}</dt>
          <dd>
            <code>{result.encoding}</code>
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
            {result.needsAltRpc && (
              <span className="muted"> · {t.altUnresolved}</span>
            )}
            {result.altResolved && packet.altCount > 0 && (
              <span className="muted"> · {t.altResolved}</span>
            )}
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
      </dl>
    </section>
  )
}

function InstructionTimeline({
  instructions,
  selected,
  onSelect,
}: {
  instructions: ExploredInstruction[]
  selected: number | null
  onSelect: (i: number) => void
}) {
  const { t } = useApp()
  return (
    <section className="panel timeline-panel">
      <div className="panel-head">
        <h2>{t.instructions}</h2>
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
    </section>
  )
}

function InstructionDetail({ ix }: { ix: ExploredInstruction }) {
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
      </div>
    </section>
  )
}
