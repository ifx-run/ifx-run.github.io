import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
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
import {
  clearStoredWire,
  getStoredWire,
  setStoredWire,
} from '../lib/solana/wire-storage'

const DATA_ENCODINGS: DataEncoding[] = ['hex', 'base58', 'base64']
const AUTO_DECODE_MS = 280

export function ExplorerWorkspace() {
  const { t } = useApp()
  const inputId = useId()
  const rpcId = useId()
  const abortRef = useRef<AbortController | null>(null)
  const decodeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [input, setInput] = useState(() => getStoredWire())
  const [rpcDraft, setRpcDraft] = useState(() => getStoredRpcUrl())
  const [result, setResult] = useState<ExploredTransaction | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [rpcError, setRpcError] = useState<string | null>(null)
  const [resolving, setResolving] = useState(false)

  const applyResult = useCallback((explored: ExploredTransaction) => {
    setResult(explored)
  }, [])

  const clearResult = useCallback(() => {
    setResult(null)
    setError(null)
    setRpcError(null)
  }, [])

  const run = useCallback(
    (raw: string) => {
      const value = raw.trim()
      if (!value) {
        clearResult()
        return
      }

      abortRef.current?.abort()
      setError(null)
      setRpcError(null)

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
    [applyResult, clearResult, t],
  )

  const scheduleRun = useCallback(
    (raw: string, immediate = false) => {
      if (decodeTimer.current) {
        clearTimeout(decodeTimer.current)
        decodeTimer.current = null
      }
      if (!raw.trim()) {
        clearResult()
        return
      }
      if (immediate) {
        run(raw)
        return
      }
      decodeTimer.current = setTimeout(() => {
        decodeTimer.current = null
        run(raw)
      }, AUTO_DECODE_MS)
    },
    [clearResult, run],
  )

  useEffect(() => {
    const stored = getStoredWire()
    if (stored) run(stored)
    return () => {
      abortRef.current?.abort()
      if (decodeTimer.current) clearTimeout(decodeTimer.current)
    }
    // Restore once on mount; later edits go through onInputChange.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
    scheduleRun(input, true)
  }

  function onClear() {
    abortRef.current?.abort()
    if (decodeTimer.current) {
      clearTimeout(decodeTimer.current)
      decodeTimer.current = null
    }
    clearStoredWire()
    setInput('')
    clearResult()
    setResolving(false)
  }

  function onInputChange(value: string) {
    setInput(value)
    setStoredWire(value)
    scheduleRun(value)
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault()
      scheduleRun(input, true)
    }
  }

  const showAltRpc = Boolean(result?.needsAltRpc)
  const hasInput = Boolean(input.trim())

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
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={onKeyDown}
        />
        <div className="ingress-actions">
          <button type="submit" className="primary" disabled={!hasInput}>
            {t.load}
          </button>
          <button
            type="button"
            className="ghost"
            disabled={!hasInput && !result && !error}
            onClick={onClear}
          >
            {t.clear}
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
            <InstructionList instructions={result.instructions} />
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

type BindingDef = { ixIndex: number; lineIndex: number }

/** Resolve `$N` to its defining let line as of `fromIxIndex` (frame session aware). */
function resolveBindingDef(
  instructions: ExploredInstruction[],
  fromIxIndex: number,
  bindingIndex: number,
): BindingDef | null {
  const defs = new Map<number, BindingDef>()
  for (const ix of instructions) {
    if (ix.index > fromIxIndex) break
    const kind = ix.l1?.args.kind
    if (kind === 'create_frame' || kind === 'reset_frame') {
      defs.clear()
      continue
    }
    if (kind !== 'let' || !ix.l1) continue
    for (let lineIndex = 0; lineIndex < ix.l1.lines.length; lineIndex++) {
      const m = /^\$(\d+)\s*←/.exec(ix.l1.lines[lineIndex]!)
      if (!m) continue
      defs.set(Number(m[1]), { ixIndex: ix.index, lineIndex })
    }
  }
  return defs.get(bindingIndex) ?? null
}

function defaultExpanded(instructions: ExploredInstruction[]): Set<number> {
  const firstIfx = instructions.find((i) => i.isIfx)
  if (firstIfx) return new Set([firstIfx.index])
  if (instructions[0]) return new Set([instructions[0].index])
  return new Set()
}

function InstructionList({
  instructions,
}: {
  instructions: ExploredInstruction[]
}) {
  const { t } = useApp()
  const resultKey = useMemo(
    () =>
      instructions
        .map((ix) => `${ix.index}:${ix.programId}:${ix.dataLen}`)
        .join('|'),
    [instructions],
  )
  const [expanded, setExpanded] = useState(() => defaultExpanded(instructions))
  const [flashLine, setFlashLine] = useState<BindingDef | null>(null)
  const flashLineTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setExpanded(defaultExpanded(instructions))
    setFlashLine(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resultKey])

  useLayoutEffect(() => {
    if (!flashLine) return
    if (!expanded.has(flashLine.ixIndex)) return
    document
      .getElementById(`ix-l1-${flashLine.ixIndex}-${flashLine.lineIndex}`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [flashLine, expanded])

  useEffect(() => {
    return () => {
      if (flashLineTimer.current) clearTimeout(flashLineTimer.current)
    }
  }, [])

  const toggle = useCallback((index: number) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })
  }, [])

  const expandAll = useCallback(() => {
    setExpanded(new Set(instructions.map((ix) => ix.index)))
  }, [instructions])

  const collapseAll = useCallback(() => {
    setExpanded(new Set())
  }, [])

  const focusBinding = useCallback(
    (fromIxIndex: number, bindingIndex: number) => {
      const def = resolveBindingDef(instructions, fromIxIndex, bindingIndex)
      if (!def) return
      setExpanded((prev) => {
        if (prev.has(def.ixIndex)) return prev
        const next = new Set(prev)
        next.add(def.ixIndex)
        return next
      })
      setFlashLine(def)
      if (flashLineTimer.current) clearTimeout(flashLineTimer.current)
      flashLineTimer.current = setTimeout(() => setFlashLine(null), 1300)
    },
    [instructions],
  )

  return (
    <section className="panel timeline-panel">
      <div className="panel-head timeline-toolbar">
        <h2>{t.instructions}</h2>
        <div className="timeline-toolbar-actions">
          <button type="button" className="ghost tiny" onClick={expandAll}>
            {t.expandAll}
          </button>
          <button type="button" className="ghost tiny" onClick={collapseAll}>
            {t.collapseAll}
          </button>
        </div>
      </div>
      <ol className="timeline">
        {instructions.map((ix) => {
          const open = expanded.has(ix.index)
          return (
            <li
              key={ix.index}
              id={`ix-row-${ix.index}`}
              className={['timeline-row', open ? 'is-open' : ''].join(' ')}
            >
              <button
                type="button"
                className={[
                  'timeline-item',
                  ix.isIfx ? 'is-ifx' : ix.programShort ? 'is-known' : 'is-other',
                  open ? 'is-expanded' : '',
                ].join(' ')}
                aria-expanded={open}
                onClick={() => toggle(ix.index)}
              >
                <span className="ix-chevron" aria-hidden>
                  {open ? '▾' : '▸'}
                </span>
                <span className="ix-idx">{ix.index}</span>
                <span className="ix-name" title={ix.programId}>
                  {ix.programLabel ?? shortenAddress(ix.programId, 5, 4)}
                </span>
                <span className="ix-sum">{ix.summary}</span>
              </button>
              {open && (
                <InstructionBody
                  ix={ix}
                  flashLine={
                    flashLine?.ixIndex === ix.index ? flashLine.lineIndex : null
                  }
                  onValueClick={(bindingIndex) =>
                    focusBinding(ix.index, bindingIndex)
                  }
                />
              )}
            </li>
          )
        })}
      </ol>
    </section>
  )
}

function InstructionBody({
  ix,
  flashLine,
  onValueClick,
}: {
  ix: ExploredInstruction
  flashLine: number | null
  onValueClick: (bindingIndex: number) => void
}) {
  const { t } = useApp()
  const [dataEnc, setDataEnc] = useState<DataEncoding>('hex')
  const [flashAccts, setFlashAccts] = useState<number[]>([])
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setDataEnc('hex')
    setFlashAccts([])
  }, [ix.index, ix.programId, ix.dataLen])

  useEffect(() => {
    return () => {
      if (flashTimer.current) clearTimeout(flashTimer.current)
    }
  }, [])

  /**
   * Highlight remaining_accounts slice `[start, start+len)`.
   * Ifx: wire indexes skip frame at keys[0], so abs = remaining + 1.
   */
  const focusRemainingRange = useCallback(
    (start: number, len: number) => {
      if (len <= 0) return
      const absList: number[] = []
      for (let i = 0; i < len; i++) {
        const rem = start + i
        const abs = ix.isIfx ? rem + 1 : rem
        if (abs >= 0 && abs < ix.accounts.length) absList.push(abs)
      }
      if (absList.length === 0) return
      document
        .getElementById(`ix-acct-${ix.index}-${absList[0]}`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      setFlashAccts(absList)
      if (flashTimer.current) clearTimeout(flashTimer.current)
      flashTimer.current = setTimeout(() => setFlashAccts([]), 1200)
    },
    [ix.accounts.length, ix.index, ix.isIfx],
  )

  const focusRemainingAccount = useCallback(
    (remainingIndex: number) => focusRemainingRange(remainingIndex, 1),
    [focusRemainingRange],
  )

  return (
    <div className="ix-body">
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
              className={flashAccts.includes(i) ? 'is-flash' : undefined}
            >
              <span className="acct-idx" title={idxTitle}>
                {idxLabel}
              </span>
              <span className="acct-flags" aria-label={roleAria(a.role, t)}>
                <span
                  className={
                    a.role.signer ? 'flag flag-signer' : 'flag flag-off'
                  }
                >
                  {t.accountRoleSigner}
                </span>
                <span
                  className={
                    a.role.writable ? 'flag flag-writable' : 'flag flag-off'
                  }
                >
                  {t.accountRoleWritable}
                </span>
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
          {ix.l1.missingFrameReset && (
            <p className="l1-warn" role="status">
              {t.missingFrameResetWarn}
            </p>
          )}
          <ul className="l1-lines">
            {ix.l1.lines.map((line, i) => (
              <li
                key={i}
                id={`ix-l1-${ix.index}-${i}`}
                className={flashLine === i ? 'is-flash' : undefined}
              >
                <L1LineWithLinks
                  line={line}
                  onAcctClick={focusRemainingAccount}
                  onRangeClick={focusRemainingRange}
                  onValueClick={onValueClick}
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
      {ix.isIfx && !ix.l1 && <p className="muted">{t.payloadBytes}</p>}
      <div className="detail-links">
        {ix.docsSlug && <Link to={`/docs/${ix.docsSlug}`}>{t.docs}</Link>}
      </div>
    </div>
  )
}

/**
 * Turn `$3`, `#5`, and `accts[0..+3]` in L1 lines into clickable links.
 */
function L1LineWithLinks({
  line,
  onAcctClick,
  onRangeClick,
  onValueClick,
}: {
  line: string
  onAcctClick: (index: number) => void
  onRangeClick: (start: number, len: number) => void
  onValueClick: (bindingIndex: number) => void
}) {
  const nodes: ReactNode[] = []
  const re = /accts\[(\d+)\.\.\+(\d+)\]|\$(\d+)|#(\d+)/g
  let last = 0
  let m: RegExpExecArray | null
  let key = 0
  while ((m = re.exec(line)) !== null) {
    if (m.index > last) {
      nodes.push(<span key={key++}>{line.slice(last, m.index)}</span>)
    }
    if (m[1] !== undefined && m[2] !== undefined) {
      const start = Number(m[1])
      const len = Number(m[2])
      nodes.push(
        <button
          key={key++}
          type="button"
          className="acct-ref acct-ref-range"
          title={`remaining [${start} .. ${start + len})`}
          onClick={(e) => {
            e.stopPropagation()
            onRangeClick(start, len)
          }}
        >
          {m[0]}
        </button>,
      )
    } else if (m[3] !== undefined) {
      const idx = Number(m[3])
      nodes.push(
        <button
          key={key++}
          type="button"
          className="value-ref"
          title={`$${idx}`}
          onClick={(e) => {
            e.stopPropagation()
            onValueClick(idx)
          }}
        >
          ${idx}
        </button>,
      )
    } else {
      const idx = Number(m[4])
      nodes.push(
        <button
          key={key++}
          type="button"
          className="acct-ref"
          onClick={(e) => {
            e.stopPropagation()
            onAcctClick(idx)
          }}
        >
          #{idx}
        </button>,
      )
    }
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
  return [
    `${t.accountRoleSigner}: ${role.signer}`,
    `${t.accountRoleWritable}: ${role.writable}`,
  ].join(', ')
}

function jsonReplacer(_key: string, value: unknown): unknown {
  if (typeof value === 'bigint') return value.toString()
  return value
}
