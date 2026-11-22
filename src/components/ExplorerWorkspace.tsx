import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
} from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import {
  exploreFromWire,
  exploreFromWireResolvingAlts,
  type ExploredInstruction,
  type ExploredTransaction,
} from '../lib/solana/parse-tx'
import {
  formatBytes,
  shortenAddress,
  type DataEncoding,
} from '../lib/solana/bytes'
import { getStoredRpcUrl, setStoredRpcUrl } from '../lib/solana/rpc'

const DATA_ENCODINGS: DataEncoding[] = ['hex', 'base58', 'base64']

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
                ix.isIfx ? 'is-ifx' : ix.programShort ? 'is-known' : 'is-other',
                selected === ix.index ? 'is-selected' : '',
              ].join(' ')}
              onClick={() => onSelect(ix.index)}
            >
              <span className="ix-idx">{ix.index}</span>
              <span className="ix-name" title={ix.programId}>
                {ix.programShort ?? shortenAddress(ix.programId, 5, 4)}
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
  const [dataEnc, setDataEnc] = useState<DataEncoding>('hex')
  const [flashAcct, setFlashAcct] = useState<number | null>(null)
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setDataEnc('hex')
    setFlashAcct(null)
  }, [ix.index, ix.programId, ix.dataLen])

  useEffect(() => {
    return () => {
      if (flashTimer.current) clearTimeout(flashTimer.current)
    }
  }, [])

  /** L1 `#N` is a remaining_accounts index; frame is always keys[0]. */
  const focusRemainingAccount = useCallback(
    (remainingIndex: number) => {
      const abs = ix.isIfx ? remainingIndex + 1 : remainingIndex
      if (abs < 0 || abs >= ix.accounts.length) return
      const el = document.getElementById(`ix-acct-${ix.index}-${abs}`)
      el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      setFlashAcct(abs)
      if (flashTimer.current) clearTimeout(flashTimer.current)
      flashTimer.current = setTimeout(() => setFlashAcct(null), 1200)
    },
    [ix.accounts.length, ix.index, ix.isIfx],
  )

  const namedTitle =
    ix.programLabel && ix.ixLabel
      ? `${ix.programLabel} · ${ix.ixLabel}`
      : ix.programLabel
        ? ix.programLabel
        : (ix.ifxName ?? null)

  return (
    <section className="panel detail-panel">
      <h2 className="detail-title">
        <span className="detail-title-idx">#{ix.index}</span>{' '}
        {namedTitle ? (
          <span className={ix.isIfx ? 'ifx-badge' : 'known-badge'}>
            {namedTitle}
          </span>
        ) : (
          <code className="break detail-title-addr">{ix.programId}</code>
        )}
      </h2>
      <dl className="ix-meta-dl">
        <div>
          <dt>{t.program}</dt>
          <dd>
            {ix.programLabel ? (
              <>
                <strong>{ix.programLabel}</strong>
                <code className="break">{ix.programId}</code>
              </>
            ) : (
              <code className="break">{ix.programId}</code>
            )}
          </dd>
        </div>
        {(ix.ixLabel || ix.ifxName) && (
          <div>
            <dt>{t.instruction}</dt>
            <dd>
              <code>{ix.ixLabel ?? ix.ifxName}</code>
              {ix.discriminator !== undefined && (
                <span className="muted"> · disc {ix.discriminator}</span>
              )}
            </dd>
          </div>
        )}
        {ix.ifxCluster && (
          <div>
            <dt>cluster</dt>
            <dd>{ix.ifxCluster}</dd>
          </div>
        )}
      </dl>
      <h3>{t.accounts}</h3>
      <ul className="acct-list">
        {ix.accounts.map((a, i) => {
          const idxLabel = ix.isIfx
            ? i === 0
              ? t.accountFrame
              : `#${i - 1}`
            : `#${i}`
          const idxTitle = ix.isIfx
            ? i === 0
              ? t.accountFrame
              : t.accountRemainingHint
            : t.accountIndex
          return (
            <li
              key={`${a.address}-${i}`}
              id={`ix-acct-${ix.index}-${i}`}
              className={flashAcct === i ? 'is-flash' : undefined}
            >
              <span className="acct-idx" title={idxTitle}>
                {idxLabel}
              </span>
              <span className="acct-flags" aria-label={roleAria(a.role, t)}>
                {a.role.signer && (
                  <span className="flag flag-signer">{t.accountRoleSigner}</span>
                )}
                {a.role.writable ? (
                  <span className="flag flag-writable">
                    {t.accountRoleWritable}
                  </span>
                ) : (
                  <span className="flag flag-readonly">
                    {t.accountRoleReadonly}
                  </span>
                )}
              </span>
              <code className="break">{a.address}</code>
            </li>
          )
        })}
        {ix.accounts.length === 0 && <li className="muted">—</li>}
      </ul>
      {ix.l1 && (
        <>
          <h3>{t.argsL1}</h3>
          <ul className="l1-lines">
            {ix.l1.lines.map((line, i) => (
              <li key={i}>
                <L1LineWithAcctLinks
                  line={line}
                  onAcctClick={focusRemainingAccount}
                />
              </li>
            ))}
          </ul>
          <details className="l1-raw">
            <summary>{t.argsRaw}</summary>
            <pre>{JSON.stringify(ix.l1.args, jsonReplacer, 2)}</pre>
          </details>
        </>
      )}
      {ix.known?.args && (
        <>
          <h3>{t.argsKnown}</h3>
          <ul className="l1-lines">
            {Object.entries(ix.known.args).map(([k, v]) => (
              <li key={k}>
                <code>
                  {k} = {String(v)}
                </code>
              </li>
            ))}
          </ul>
        </>
      )}
      <h3>{t.data}</h3>
      <div className="data-enc-row" role="group" aria-label={t.dataEncoding}>
        {DATA_ENCODINGS.map((enc) => (
          <button
            key={enc}
            type="button"
            className={['enc-chip', dataEnc === enc ? 'is-active' : ''].join(
              ' ',
            )}
            onClick={() => setDataEnc(enc)}
          >
            {enc}
          </button>
        ))}
        <span className="muted data-enc-len">{ix.dataLen} B</span>
      </div>
      <pre className="data-blob">
        {ix.dataLen === 0 ? '—' : formatBytes(ix.data, dataEnc)}
      </pre>
      {ix.isIfx && !ix.l1 && (
        <p className="muted">{t.payloadBytes}</p>
      )}
      <div className="detail-links">
        {ix.docsSlug && (
          <Link to={`/docs/${ix.docsSlug}`}>{t.docs}</Link>
        )}
      </div>
    </section>
  )
}

/** Turn `#5` / `lamports(#5)` refs in L1 lines into clickable account links. */
function L1LineWithAcctLinks({
  line,
  onAcctClick,
}: {
  line: string
  onAcctClick: (index: number) => void
}) {
  const nodes: ReactNode[] = []
  const re = /#(\d+)/g
  let last = 0
  let m: RegExpExecArray | null
  let key = 0
  while ((m = re.exec(line)) !== null) {
    if (m.index > last) {
      nodes.push(<span key={key++}>{line.slice(last, m.index)}</span>)
    }
    const idx = Number(m[1])
    nodes.push(
      <button
        key={key++}
        type="button"
        className="acct-ref"
        onClick={() => onAcctClick(idx)}
      >
        #{idx}
      </button>,
    )
    last = m.index + m[0].length
  }
  if (last < line.length) {
    nodes.push(<span key={key++}>{line.slice(last)}</span>)
  }
  return <code className="l1-line-code">{nodes}</code>
}

function roleAria(
  role: ExploredInstruction['accounts'][number]['role'],
  t: ReturnType<typeof useApp>['t'],
): string {
  const parts: string[] = []
  if (role.signer) parts.push(t.accountRoleSigner)
  parts.push(role.writable ? t.accountRoleWritable : t.accountRoleReadonly)
  return parts.join(', ')
}

function jsonReplacer(_key: string, value: unknown): unknown {
  if (typeof value === 'bigint') return value.toString()
  return value
}
