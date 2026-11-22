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
  decodeWireInput,
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
import {
  clearStoredAliases,
  getStoredAliases,
  setStoredAlias,
} from '../lib/solana/alias-storage'
import { solscanAccountUrl } from '../lib/solana/solscan'
import { bindingColor } from '../lib/ifx/binding-color'
import {
  buildBindingRefIndex,
  refsForDef,
  type BindingLoc,
} from '../lib/ifx/binding-refs'
import {
  aliasKey,
  collectFrameViews,
  type FrameView,
} from '../lib/ifx/frame-bindings'

const DATA_ENCODINGS: DataEncoding[] = ['hex', 'base58', 'base64']
const AUTO_DECODE_MS = 280

export function ExplorerWorkspace() {
  const { t } = useApp()
  const inputId = useId()
  const rpcId = useId()
  const abortRef = useRef<AbortController | null>(null)
  const decodeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const ingressRef = useRef<HTMLFormElement | null>(null)

  const [input, setInput] = useState(() => getStoredWire())
  const [rpcDraft, setRpcDraft] = useState(() => getStoredRpcUrl())
  const [result, setResult] = useState<ExploredTransaction | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [rpcError, setRpcError] = useState<string | null>(null)
  const [resolving, setResolving] = useState(false)
  /** Collapses on successful decode; outside click also collapses when result exists. */
  const [ingressExpanded, setIngressExpanded] = useState(true)

  const applyResult = useCallback((explored: ExploredTransaction) => {
    setResult(explored)
    setIngressExpanded(false)
  }, [])

  const clearResult = useCallback(() => {
    setResult(null)
    setError(null)
    setRpcError(null)
    setIngressExpanded(true)
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

  useEffect(() => {
    if (!result || !ingressExpanded) return
    function onPointerDown(e: PointerEvent) {
      const root = ingressRef.current
      if (!root) return
      const target = e.target
      if (!(target instanceof Node)) return
      if (root.contains(target)) return
      setIngressExpanded(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [result, ingressExpanded])

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
    clearStoredAliases(input)
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
  const canCollapseIngress = Boolean(result)
  const ingressCollapsed = canCollapseIngress && !ingressExpanded
  const wireTrimmed = input.trim()
  const wirePreviewHead = wireTrimmed.slice(0, 14)
  const wirePreviewTail =
    wireTrimmed.length > 28 ? wireTrimmed.slice(-14) : ''
  const wireBytes = useMemo(() => {
    if (!result || !wireTrimmed) return null
    try {
      return decodeWireInput(wireTrimmed).bytes
    } catch {
      return null
    }
  }, [result, wireTrimmed])

  return (
    <div className="workspace">
      <form
        ref={ingressRef}
        className={['ingress', ingressCollapsed ? 'is-collapsed' : ''].join(
          ' ',
        )}
        onSubmit={onSubmit}
      >
        <div className="ingress-head">
          <label className="field-label" htmlFor={inputId}>
            {t.inputLabel}
          </label>
          <div className="ingress-head-actions">
            {wireBytes && <CopyBytesButtons bytes={wireBytes} />}
            {canCollapseIngress && (
              <button
                type="button"
                className="ghost tiny"
                onClick={() => setIngressExpanded((v) => !v)}
              >
                {ingressExpanded ? t.collapseIngress : t.expandIngress}
              </button>
            )}
            <button
              type="button"
              className="ghost tiny"
              disabled={!hasInput && !result && !error}
              onClick={onClear}
            >
              {t.clear}
            </button>
          </div>
        </div>
        {ingressCollapsed ? (
          <button
            type="button"
            className="ingress-preview"
            title={t.expandIngress}
            onClick={() => setIngressExpanded(true)}
          >
            {wireTrimmed ? (
              <code className="ingress-preview-wire" aria-label={t.inputLabel}>
                <span className="ingress-preview-head">{wirePreviewHead}</span>
                <span className="ingress-preview-mid" aria-hidden="true" />
                {wirePreviewTail ? (
                  <span className="ingress-preview-tail">{wirePreviewTail}</span>
                ) : null}
              </code>
            ) : (
              <code>—</code>
            )}
          </button>
        ) : (
          <>
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
              {wireBytes && <CopyBytesButtons bytes={wireBytes} />}
              <span className="kbd-hint">⌘/Ctrl + Enter</span>
            </div>
            {!showAltRpc && <p className="offline-note">{t.offlineNote}</p>}
          </>
        )}
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
            <InstructionList
              instructions={result.instructions}
              wireKey={input.trim()}
            />
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

function CopyBytesButtons({ bytes }: { bytes: Uint8Array }) {
  const { t } = useApp()
  const [copied, setCopied] = useState<DataEncoding | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [])

  async function copy(enc: DataEncoding) {
    const text = formatBytes(bytes, enc)
    if (!text) return
    try {
      await navigator.clipboard.writeText(text)
      setCopied(enc)
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(() => setCopied(null), 1200)
    } catch {
      /* ignore */
    }
  }

  if (bytes.byteLength === 0) return null

  return (
    <div className="copy-bytes" role="group" aria-label={t.copyAs}>
      <span className="copy-bytes-label">{t.copyAs}</span>
      {DATA_ENCODINGS.map((enc) => (
        <button
          key={enc}
          type="button"
          className={[
            'ghost tiny copy-bytes-btn',
            copied === enc ? 'is-copied' : '',
          ].join(' ')}
          title={t.copyFormat(enc)}
          onClick={() => void copy(enc)}
        >
          {copied === enc ? t.addressCopied : enc}
        </button>
      ))}
    </div>
  )
}

function MetaRow({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <div className="meta-row">
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  )
}

function PacketPanel({ result }: { result: ExploredTransaction }) {
  const { t } = useApp()
  const { packet } = result
  const versionLabel =
    packet.version === 'legacy' ? 'legacy' : `v${packet.version}`
  const v1 = packet.v1Header

  return (
    <section className="panel packet-panel">
      <h2>{t.packet}</h2>
      <dl className="meta-grid">
        <MetaRow label={t.version}>
          <span className={`ver-pill ver-${versionLabel}`}>{versionLabel}</span>
        </MetaRow>
        <MetaRow label={t.encoding}>
          <code>{result.encoding}</code>
        </MetaRow>
        <MetaRow label={t.wireBytes}>
          <code>{packet.wireBytes.toLocaleString()} B</code>
        </MetaRow>
        <MetaRow label={t.messageBytes}>
          <code>
            {packet.messageBytes
              ? `${packet.messageBytes.toLocaleString()} B`
              : '—'}
          </code>
        </MetaRow>
        <MetaRow label={t.staticAccounts}>
          <code>{packet.staticAccountCount}</code>
        </MetaRow>
        <MetaRow label={t.packetInstructionCount}>
          <code>{packet.instructionCount}</code>
        </MetaRow>
        <MetaRow label={t.lookupTables}>
          {packet.altCount === 0 ? (
            <span className="muted">—</span>
          ) : (
            <div className="meta-stack">
              <div className="meta-stack-head">
                <code>{packet.altCount}</code>
                {result.needsAltRpc && (
                  <span className="meta-tag is-warn">{t.altUnresolved}</span>
                )}
                {result.altResolved && (
                  <span className="meta-tag is-ok">{t.altResolved}</span>
                )}
              </div>
              <ul className="meta-addr-list">
                {packet.altAddresses.map((a) => (
                  <li key={a}>
                    <code title={a}>{shortenAddress(a, 6, 6)}</code>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </MetaRow>
      </dl>

      {v1 && (
        <>
          <h3 className="meta-section-title">{t.v1Header}</h3>
          <dl className="meta-grid">
            <MetaRow label={t.computeUnitLimit}>
              <code>
                {v1.computeUnitLimit !== undefined
                  ? v1.computeUnitLimit.toLocaleString()
                  : t.valueUnset}
              </code>
            </MetaRow>
            <MetaRow label={t.loadedDataSizeLimit}>
              <code>
                {v1.loadedAccountsDataSizeLimit !== undefined
                  ? `${v1.loadedAccountsDataSizeLimit.toLocaleString()} B`
                  : t.valueUnset}
              </code>
            </MetaRow>
            <MetaRow label={t.heapSize}>
              <code>
                {v1.heapSize !== undefined
                  ? `${v1.heapSize.toLocaleString()} B`
                  : t.valueUnset}
              </code>
            </MetaRow>
            <MetaRow label={t.priorityFee}>
              <code>
                {v1.priorityFeeLamports !== undefined
                  ? `${v1.priorityFeeLamports} lamports`
                  : t.valueUnset}
              </code>
            </MetaRow>
          </dl>
        </>
      )}
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

function defaultExpanded(_instructions: ExploredInstruction[]): Set<number> {
  return new Set()
}

type RefsModalState = {
  bindingIndex: number
  refs: BindingLoc[]
}

function InstructionList({
  instructions,
  wireKey,
}: {
  instructions: ExploredInstruction[]
  wireKey: string
}) {
  const { t } = useApp()
  const resultKey = useMemo(
    () =>
      instructions
        .map((ix) => `${ix.index}:${ix.programId}:${ix.dataLen}`)
        .join('|'),
    [instructions],
  )
  const refIndex = useMemo(
    () => buildBindingRefIndex(instructions),
    [instructions],
  )
  const frames = useMemo(
    () => collectFrameViews(instructions),
    [instructions],
  )
  const [expanded, setExpanded] = useState(() => defaultExpanded(instructions))
  const [flashLine, setFlashLine] = useState<BindingDef | null>(null)
  const [refsModal, setRefsModal] = useState<RefsModalState | null>(null)
  const [renameModal, setRenameModal] = useState<
    | { kind: 'binding'; frame: string; index: number }
    | { kind: 'address'; address: string }
    | null
  >(null)
  const [clearAllNamesOpen, setClearAllNamesOpen] = useState(false)
  const [aliases, setAliases] = useState<Record<string, string>>(() =>
    getStoredAliases(wireKey),
  )
  const flashLineTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setExpanded(defaultExpanded(instructions))
    setFlashLine(null)
    setRefsModal(null)
    setRenameModal(null)
    setClearAllNamesOpen(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resultKey])

  useEffect(() => {
    setAliases(getStoredAliases(wireKey))
  }, [wireKey, resultKey])

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

  useEffect(() => {
    if (!refsModal) return
    function onKey(e: globalThis.KeyboardEvent) {
      if (e.key === 'Escape') setRefsModal(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [refsModal])

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

  const focusLine = useCallback((loc: BindingDef) => {
    setRefsModal(null)
    setExpanded((prev) => {
      if (prev.has(loc.ixIndex)) return prev
      const next = new Set(prev)
      next.add(loc.ixIndex)
      return next
    })
    setFlashLine(loc)
    if (flashLineTimer.current) clearTimeout(flashLineTimer.current)
    flashLineTimer.current = setTimeout(() => setFlashLine(null), 1300)
  }, [])

  const focusBinding = useCallback(
    (fromIxIndex: number, bindingIndex: number) => {
      const def = resolveBindingDef(instructions, fromIxIndex, bindingIndex)
      if (!def) return
      focusLine(def)
    },
    [focusLine, instructions],
  )

  const onFindRefs = useCallback(
    (bindingIndex: number, defIx: number, defLine: number) => {
      const refs = refsForDef(refIndex, defIx, defLine)
      if (refs.length === 0) return
      if (refs.length === 1) {
        focusLine(refs[0]!)
        return
      }
      setRefsModal({ bindingIndex, refs })
    },
    [focusLine, refIndex],
  )

  const refreshAliases = useCallback(() => {
    setAliases(getStoredAliases(wireKey))
  }, [wireKey])

  const openRenameBinding = useCallback((frame: string, index: number) => {
    setRenameModal({ kind: 'binding', frame, index })
  }, [])

  const openRenameAddress = useCallback((address: string) => {
    setRenameModal({ kind: 'address', address })
  }, [])

  const saveRename = useCallback(
    (key: string, name: string) => {
      setStoredAlias(wireKey, key, name)
      refreshAliases()
      setRenameModal(null)
    },
    [refreshAliases, wireKey],
  )

  const clearAliasKey = useCallback(
    (key: string) => {
      setStoredAlias(wireKey, key, '')
      refreshAliases()
      setRenameModal(null)
    },
    [refreshAliases, wireKey],
  )

  const clearBindingName = useCallback(
    (frame: string, index: number) => {
      clearAliasKey(aliasKey(frame, index))
    },
    [clearAliasKey],
  )

  const clearAllBindingNames = useCallback(() => {
    const current = getStoredAliases(wireKey)
    let changed = false
    for (const key of Object.keys(current)) {
      // Binding keys look like `<framePubkey>:<index>`
      if (/:\d+$/.test(key)) {
        setStoredAlias(wireKey, key, '')
        changed = true
      }
    }
    if (!changed && Object.keys(current).length === 0) {
      clearStoredAliases(wireKey)
    }
    refreshAliases()
    setClearAllNamesOpen(false)
  }, [refreshAliases, wireKey])

  const labelFor = useCallback(
    (frame: string | undefined, index: number) => {
      if (!frame) return `$${index}`
      return aliases[aliasKey(frame, index)] || `$${index}`
    },
    [aliases],
  )

  const bindingAliasCount = Object.keys(aliases).filter((k) =>
    /:\d+$/.test(k),
  ).length

  return (
    <div className="instructions-column">
      {frames.length > 0 && (
        <section className="panel frame-panel">
          <div className="panel-head">
            <h2>{t.frameStrip}</h2>
            {bindingAliasCount > 0 && (
              <button
                type="button"
                className="ghost tiny"
                onClick={() => setClearAllNamesOpen(true)}
              >
                {t.frameClearAllNames}
              </button>
            )}
          </div>
          <FrameStrips
            frames={frames}
            aliases={aliases}
            onRename={openRenameBinding}
            onClearName={clearBindingName}
            onJumpDef={(defIx) => {
              setExpanded((prev) => {
                const next = new Set(prev)
                next.add(defIx)
                return next
              })
              document
                .getElementById(`ix-row-${defIx}`)
                ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
            }}
          />
        </section>
      )}
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
          const frameAddr = ix.isIfx ? ix.accounts[0]?.address : undefined
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
                <span className="ix-sum">
                  <BindingColoredText
                    text={ix.summary}
                    labelFor={(n) => labelFor(frameAddr, n)}
                  />
                </span>
              </button>
              {open && (
                <InstructionBody
                  ix={ix}
                  flashLine={
                    flashLine?.ixIndex === ix.index ? flashLine.lineIndex : null
                  }
                  refIndex={refIndex}
                  aliases={aliases}
                  labelFor={(n) => labelFor(frameAddr, n)}
                  onValueClick={(bindingIndex) =>
                    focusBinding(ix.index, bindingIndex)
                  }
                  onFindRefs={onFindRefs}
                  onRenameAddress={openRenameAddress}
                  onClearAddress={(address) => clearAliasKey(address)}
                />
              )}
            </li>
          )
        })}
        </ol>
      </section>
      {refsModal && (
        <RefsModal
          bindingIndex={refsModal.bindingIndex}
          refs={refsModal.refs}
          labelFor={(n) => {
            const frame =
              frames.length === 1
                ? frames[0]!.address
                : instructions.find((ix) =>
                    ix.l1?.lines.some((line) => line.includes(`$${n}`)),
                  )?.accounts[0]?.address
            return labelFor(frame, n)
          }}
          onClose={() => setRefsModal(null)}
          onPick={focusLine}
        />
      )}
      {renameModal?.kind === 'binding' && (
        <AliasEditModal
          title={
            <>
              {t.frameRenameTitle}{' '}
              <span style={{ color: bindingColor(renameModal.index) }}>
                ${renameModal.index}
              </span>
            </>
          }
          prompt={t.frameRenamePrompt}
          initialName={
            aliases[aliasKey(renameModal.frame, renameModal.index)] ?? ''
          }
          placeholder={`$${renameModal.index}`}
          meta={shortenAddress(renameModal.frame, 6, 6)}
          metaTitle={renameModal.frame}
          onSave={(name) =>
            saveRename(
              aliasKey(renameModal.frame, renameModal.index),
              name,
            )
          }
          onClear={() =>
            clearBindingName(renameModal.frame, renameModal.index)
          }
          onClose={() => setRenameModal(null)}
        />
      )}
      {renameModal?.kind === 'address' && (
        <AliasEditModal
          title={t.addressRenameTitle}
          prompt={t.addressRenamePrompt}
          initialName={aliases[renameModal.address] ?? ''}
          placeholder={shortenAddress(renameModal.address, 8, 8)}
          meta={shortenAddress(renameModal.address, 8, 8)}
          metaTitle={renameModal.address}
          onSave={(name) => saveRename(renameModal.address, name)}
          onClear={() => clearAliasKey(renameModal.address)}
          onClose={() => setRenameModal(null)}
        />
      )}
      {clearAllNamesOpen && (
        <ConfirmModal
          title={t.frameClearAllNamesConfirmTitle}
          body={t.frameClearAllNamesConfirmBody}
          confirmLabel={t.frameClearAllNamesConfirm}
          cancelLabel={t.frameRenameCancel}
          danger
          onConfirm={clearAllBindingNames}
          onClose={() => setClearAllNamesOpen(false)}
        />
      )}
    </div>
  )
}

function ConfirmModal({
  title,
  body,
  confirmLabel,
  cancelLabel,
  danger,
  onConfirm,
  onClose,
}: {
  title: string
  body: string
  confirmLabel: string
  cancelLabel: string
  danger?: boolean
  onConfirm: () => void
  onClose: () => void
}) {
  const confirmRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    confirmRef.current?.focus()
  }, [])

  useEffect(() => {
    function onKey(e: globalThis.KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="refs-modal-backdrop"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="refs-modal rename-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="refs-modal-head">
          <h3 id="confirm-modal-title">{title}</h3>
          <button type="button" className="ghost tiny" onClick={onClose}>
            {cancelLabel}
          </button>
        </div>
        <div className="rename-modal-body">
          <p className="confirm-modal-body">{body}</p>
          <div className="rename-modal-actions">
            <button type="button" className="ghost" onClick={onClose}>
              {cancelLabel}
            </button>
            <button
              ref={confirmRef}
              type="button"
              className={danger ? 'danger' : 'primary'}
              onClick={onConfirm}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function AliasEditModal({
  title,
  prompt,
  initialName,
  placeholder,
  meta,
  metaTitle,
  onSave,
  onClear,
  onClose,
}: {
  title: ReactNode
  prompt: string
  initialName: string
  placeholder: string
  meta?: string
  metaTitle?: string
  onSave: (name: string) => void
  onClear: () => void
  onClose: () => void
}) {
  const { t } = useApp()
  const [draft, setDraft] = useState(initialName)
  const inputRef = useRef<HTMLInputElement>(null)
  const inputId = useId()

  useEffect(() => {
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [])

  useEffect(() => {
    function onKey(e: globalThis.KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  function submit(e: FormEvent) {
    e.preventDefault()
    onSave(draft)
  }

  return (
    <div
      className="refs-modal-backdrop"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="refs-modal rename-modal"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="refs-modal-head">
          <h3>{title}</h3>
          <button type="button" className="ghost tiny" onClick={onClose}>
            {t.frameRenameCancel}
          </button>
        </div>
        <form className="rename-modal-body" onSubmit={submit}>
          <label className="rename-modal-label" htmlFor={inputId}>
            {prompt}
          </label>
          <input
            id={inputId}
            ref={inputRef}
            className="rename-modal-input"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={placeholder}
            spellCheck={false}
            autoComplete="off"
          />
          {meta ? (
            <p className="rename-modal-meta muted">
              <code title={metaTitle}>{meta}</code>
            </p>
          ) : null}
          <div className="rename-modal-actions">
            <button
              type="button"
              className="ghost"
              disabled={!initialName}
              onClick={onClear}
            >
              {t.frameClearName}
            </button>
            <button type="submit" className="primary">
              {t.frameRenameSave}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function AddressDisplay({
  address,
  aliases,
  cluster,
  onRename,
  onClear,
}: {
  address: string
  aliases: Record<string, string>
  cluster?: string
  onRename: (address: string) => void
  onClear: (address: string) => void
}) {
  const { t } = useApp()
  const [copied, setCopied] = useState(false)
  const alias = aliases[address]
  const label = alias || address

  async function copy() {
    try {
      await navigator.clipboard.writeText(address)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1200)
    } catch {
      /* ignore */
    }
  }

  return (
    <span className="addr-display">
      <a
        className="addr-link break"
        href={solscanAccountUrl(address, cluster)}
        target="_blank"
        rel="noreferrer"
        title={`${t.addressOpenSolscan}\n${address}`}
      >
        {alias ? (
          <>
            <span className="addr-alias">{alias}</span>
            <span className="addr-full muted">{shortenAddress(address, 4, 4)}</span>
          </>
        ) : (
          label
        )}
      </a>
      <button
        type="button"
        className="addr-action"
        title={t.addressAlias}
        onClick={() => onRename(address)}
      >
        {t.addressAlias}
      </button>
      <button
        type="button"
        className="addr-action"
        title={t.addressCopy}
        onClick={() => void copy()}
      >
        {copied ? t.addressCopied : t.addressCopy}
      </button>
      {alias ? (
        <button
          type="button"
          className="addr-action"
          title={t.frameClearName}
          onClick={() => onClear(address)}
        >
          ×
        </button>
      ) : null}
    </span>
  )
}

function FrameStrips({
  frames,
  aliases,
  onRename,
  onClearName,
  onJumpDef,
}: {
  frames: FrameView[]
  aliases: Record<string, string>
  onRename: (frame: string, index: number) => void
  onClearName: (frame: string, index: number) => void
  onJumpDef: (defIx: number) => void
}) {
  const { t } = useApp()
  const multi = frames.length > 1
  return (
    <div className="frame-strips">
      {frames.map((frame) => (
        <div key={frame.address} className="frame-strip">
          {multi && (
            <div className="frame-strip-label" title={frame.address}>
              <code>{shortenAddress(frame.address, 4, 4)}</code>
            </div>
          )}
          <div className="frame-strip-vars" role="list">
            {frame.vars.map((v) => {
              const key = aliasKey(frame.address, v.index)
              const name = aliases[key]
              const color = bindingColor(v.index)
              return (
                <div
                  key={v.index}
                  role="listitem"
                  className="frame-var"
                  style={{
                    borderColor: color,
                    background: `color-mix(in srgb, ${color} 16%, transparent)`,
                    color,
                  }}
                >
                  <button
                    type="button"
                    className="frame-var-main"
                    title={`${name ? `${name} · ` : ''}$${v.index} · ${v.ty} · ${v.kind}\n${t.frameRenameTitle}`}
                    onClick={() => onRename(frame.address, v.index)}
                    onDoubleClick={(e) => {
                      e.preventDefault()
                      onJumpDef(v.defIx)
                    }}
                  >
                    <span className="frame-var-id">${v.index}</span>
                    {name ? (
                      <span className="frame-var-name">{name}</span>
                    ) : null}
                    <span className="frame-var-ty">{v.ty}</span>
                  </button>
                  {name ? (
                    <button
                      type="button"
                      className="frame-var-clear"
                      title={t.frameClearName}
                      aria-label={t.frameClearName}
                      onClick={(e) => {
                        e.stopPropagation()
                        onClearName(frame.address, v.index)
                      }}
                    >
                      ×
                    </button>
                  ) : null}
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

function RefsModal({
  bindingIndex,
  refs,
  labelFor,
  onClose,
  onPick,
}: {
  bindingIndex: number
  refs: BindingLoc[]
  labelFor: (index: number) => string
  onClose: () => void
  onPick: (loc: BindingLoc) => void
}) {
  const { t } = useApp()
  const label = labelFor(bindingIndex)
  return (
    <div
      className="refs-modal-backdrop"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="refs-modal"
        role="dialog"
        aria-modal="true"
        aria-label={t.refsModalTitle(label)}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="refs-modal-head">
          <h3>
            {t.refsModalTitle(label)}{' '}
            <span style={{ color: bindingColor(bindingIndex) }}>{label}</span>
          </h3>
          <button type="button" className="ghost tiny" onClick={onClose}>
            {t.refsModalClose}
          </button>
        </div>
        <ul className="refs-modal-list">
          {refs.map((ref, i) => (
            <li key={`${ref.ixIndex}-${ref.lineIndex}-${i}`}>
              <button
                type="button"
                className="refs-modal-row"
                onClick={() => onPick(ref)}
              >
                <code className="refs-modal-line">
                  <BindingColoredText
                    text={ref.line.trim()}
                    labelFor={labelFor}
                  />
                </code>
                <span className="refs-modal-ix">
                  {t.refsIxLabel} {ref.ixIndex}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function InstructionBody({
  ix,
  flashLine,
  refIndex,
  aliases,
  labelFor,
  onValueClick,
  onFindRefs,
  onRenameAddress,
  onClearAddress,
}: {
  ix: ExploredInstruction
  flashLine: number | null
  refIndex: Map<string, BindingLoc[]>
  aliases: Record<string, string>
  labelFor: (index: number) => string
  onValueClick: (bindingIndex: number) => void
  onFindRefs: (
    bindingIndex: number,
    defIx: number,
    defLine: number,
  ) => void
  onRenameAddress: (address: string) => void
  onClearAddress: (address: string) => void
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
            {ix.programLabel ? <strong>{ix.programLabel}</strong> : null}
            <AddressDisplay
              address={ix.programId}
              aliases={aliases}
              cluster={ix.ifxCluster}
              onRename={onRenameAddress}
              onClear={onClearAddress}
            />
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
              <AddressDisplay
                address={a.address}
                aliases={aliases}
                cluster={ix.ifxCluster}
                onRename={onRenameAddress}
                onClear={onClearAddress}
              />
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
            {ix.l1.lines.map((line, i) => {
              const defHead = /^\$(\d+)\s*←/.exec(line)
              const bindingIndex = defHead ? Number(defHead[1]) : null
              const refs =
                bindingIndex !== null
                  ? refsForDef(refIndex, ix.index, i)
                  : []
              return (
                <li
                  key={i}
                  id={`ix-l1-${ix.index}-${i}`}
                  className={flashLine === i ? 'is-flash' : undefined}
                >
                  <div className="l1-line-row">
                    <L1LineWithLinks
                      line={line}
                      labelFor={labelFor}
                      addressLabelFor={(addr) => aliases[addr] || addr}
                      onAcctClick={focusRemainingAccount}
                      onRangeClick={focusRemainingRange}
                      onValueClick={onValueClick}
                      onAddressClick={(addr) =>
                        window.open(
                          solscanAccountUrl(addr, ix.ifxCluster),
                          '_blank',
                          'noopener,noreferrer',
                        )
                      }
                      onAddressRename={onRenameAddress}
                    />
                    {bindingIndex !== null && (
                      <button
                        type="button"
                        className={[
                          'refs-btn',
                          refs.length === 0 ? 'is-empty' : '',
                        ].join(' ')}
                        disabled={refs.length === 0}
                        title={
                          refs.length === 0
                            ? t.noRefs
                            : t.findRefs(refs.length)
                        }
                        onClick={(e) => {
                          e.stopPropagation()
                          onFindRefs(bindingIndex, ix.index, i)
                        }}
                      >
                        {refs.length === 0
                          ? t.noRefs
                          : t.findRefs(refs.length)}
                      </button>
                    )}
                  </div>
                </li>
              )
            })}
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
        {ix.dataLen > 0 && <CopyBytesButtons bytes={ix.data} />}
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
  labelFor,
  addressLabelFor,
  onAcctClick,
  onRangeClick,
  onValueClick,
  onAddressClick,
  onAddressRename,
}: {
  line: string
  labelFor: (index: number) => string
  addressLabelFor: (address: string) => string
  onAcctClick: (index: number) => void
  onRangeClick: (start: number, len: number) => void
  onValueClick: (bindingIndex: number) => void
  onAddressClick: (address: string) => void
  onAddressRename: (address: string) => void
}) {
  const { t } = useApp()
  const nodes: ReactNode[] = []
  const re =
    /accts\[(\d+)\.\.\+(\d+)\]|\$(\d+)|#(\d+)|([1-9A-HJ-NP-Za-km-z]{32,44})/g
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
      const label = labelFor(idx)
      nodes.push(
        <button
          key={key++}
          type="button"
          className="value-ref"
          title={`$${idx}`}
          style={{ color: bindingColor(idx) }}
          onClick={(e) => {
            e.stopPropagation()
            onValueClick(idx)
          }}
        >
          {label}
        </button>,
      )
    } else if (m[4] !== undefined) {
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
    } else {
      const addr = m[5]!
      const label = addressLabelFor(addr)
      nodes.push(
        <span key={key++} className="addr-inline">
          <button
            type="button"
            className="addr-inline-link"
            title={`${t.addressOpenSolscan}\n${addr}`}
            onClick={(e) => {
              e.stopPropagation()
              onAddressClick(addr)
            }}
          >
            {label === addr ? shortenAddress(addr, 6, 6) : label}
          </button>
          <button
            type="button"
            className="addr-inline-alias"
            title={t.addressAlias}
            onClick={(e) => {
              e.stopPropagation()
              onAddressRename(addr)
            }}
          >
            ✎
          </button>
        </span>,
      )
    }
    last = m.index + m[0].length
  }
  if (last < line.length) {
    nodes.push(<span key={key++}>{line.slice(last)}</span>)
  }
  return <code className="l1-line-code">{nodes}</code>
}

/** Color `$N` in plain summary / non-interactive text; honor aliases. */
function BindingColoredText({
  text,
  labelFor,
}: {
  text: string
  labelFor?: (index: number) => string
}) {
  const nodes: ReactNode[] = []
  const re = /\$(\d+)/g
  let last = 0
  let m: RegExpExecArray | null
  let key = 0
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) {
      nodes.push(<span key={key++}>{text.slice(last, m.index)}</span>)
    }
    const idx = Number(m[1])
    nodes.push(
      <span
        key={key++}
        className="value-swatch"
        style={{ color: bindingColor(idx) }}
        title={`$${idx}`}
      >
        {labelFor?.(idx) ?? `$${idx}`}
      </span>,
    )
    last = m.index + m[0].length
  }
  if (nodes.length === 0) return <>{text}</>
  if (last < text.length) {
    nodes.push(<span key={key++}>{text.slice(last)}</span>)
  }
  return <>{nodes}</>
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
