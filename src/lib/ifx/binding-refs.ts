export type BindingLoc = {
  ixIndex: number
  lineIndex: number
  line: string
}

type IxL1Slice = {
  index: number
  l1?: { args: { kind: string }; lines: string[] }
}

function defKey(ixIndex: number, lineIndex: number): string {
  return `${ixIndex}:${lineIndex}`
}

/**
 * For each `$N ←` definition, collect later uses of `$N` in the same
 * Frame session (until create/reset). Self head `$N` on the def line is skipped.
 */
export function buildBindingRefIndex(
  instructions: readonly IxL1Slice[],
): Map<string, BindingLoc[]> {
  const refsByDef = new Map<string, BindingLoc[]>()
  /** bindingIndex → defining location in current session */
  const liveDefs = new Map<number, BindingLoc>()

  for (const ix of instructions) {
    const kind = ix.l1?.args.kind
    if (kind === 'create_frame' || kind === 'reset_frame') {
      liveDefs.clear()
      continue
    }
    if (!ix.l1) continue

    for (let lineIndex = 0; lineIndex < ix.l1.lines.length; lineIndex++) {
      const line = ix.l1.lines[lineIndex]!
      const head = /^\$(\d+)\s*←/.exec(line)
      let definedHere: number | null = null
      if (head) {
        definedHere = Number(head[1])
        const loc: BindingLoc = { ixIndex: ix.index, lineIndex, line }
        liveDefs.set(definedHere, loc)
        if (!refsByDef.has(defKey(ix.index, lineIndex))) {
          refsByDef.set(defKey(ix.index, lineIndex), [])
        }
      }

      const re = /\$(\d+)/g
      let m: RegExpExecArray | null
      while ((m = re.exec(line)) !== null) {
        const n = Number(m[1])
        if (definedHere !== null && n === definedHere && m.index === 0) {
          continue
        }
        const def = liveDefs.get(n)
        if (!def) continue
        const list = refsByDef.get(defKey(def.ixIndex, def.lineIndex))
        if (!list) continue
        list.push({ ixIndex: ix.index, lineIndex, line })
      }
    }
  }

  return refsByDef
}

export function refsForDef(
  index: Map<string, BindingLoc[]>,
  ixIndex: number,
  lineIndex: number,
): BindingLoc[] {
  return index.get(defKey(ixIndex, lineIndex)) ?? []
}
