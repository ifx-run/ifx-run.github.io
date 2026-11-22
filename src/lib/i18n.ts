export type Lang = 'en' | 'zh'

const STORAGE_KEY = 'ifx.run.lang'

export function getStoredLang(): Lang {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    if (v === 'zh' || v === 'en') return v
  } catch {
    /* ignore */
  }
  return navigator.language.toLowerCase().startsWith('zh') ? 'zh' : 'en'
}

export function setStoredLang(lang: Lang): void {
  localStorage.setItem(STORAGE_KEY, lang)
}

export const copy = {
  en: {
    brand: 'Ifx',
    navExplorer: 'Explorer',
    navDocs: 'Docs',
    homeKicker: 'Solana on-chain orchestration',
    homeHeadline:
      'Read, branch, and CPI inside one transaction — without a new wrapper program each time.',
    homeSupport:
      'Paste transaction wire (base58 / base64) and decode Ifx + SIMD-0385 v1 offline. No RPC. Read the design when you build.',
    ctaExplorer: 'Open Explorer',
    ctaDocs: 'Read the docs',
    tagline:
      'On-chain Solana orchestration — explore Ifx instructions offline from wire bytes.',
    inputLabel: 'Transaction wire',
    inputPlaceholder: 'Paste base58 or base64 wire (legacy / v0 / v1). No network.',
    load: 'Decode',
    clear: 'Clear',
    loading: 'Decoding…',
    offlineNote: 'Offline only — nothing is sent to an RPC or third party.',
    encoding: 'Encoding',
    emptyTitle: 'Paste wire bytes',
    emptyBody:
      'Base58 or base64 of the full transaction. Non-Ifx instructions stay dimmed; Ifx is highlighted (L0: program + discriminator).',
    links: 'Links',
    github: 'GitHub',
    npm: 'npm SDK',
    programId: 'Program ID',
    packet: 'Packet',
    instructions: 'Instructions',
    expandAll: 'Expand all',
    collapseAll: 'Collapse all',
    version: 'Version',
    wireBytes: 'Wire bytes',
    alts: 'ALT',
    altUnresolved: 'unresolved',
    altResolved: 'resolved',
    altRpcTitle: 'RPC needed for ALT',
    altRpcWhy:
      'This transaction loads accounts from Address Lookup Tables. Wire only stores ALT pubkeys and indexes — the actual addresses live in those on-chain ALT accounts. Provide an RPC URL so we can fetch them and finish resolving instruction accounts. Without this, packet meta is still available offline.',
    rpcLabel: 'RPC URL',
    altRpcResolve: 'Resolve ALT',
    altRpcLoading: 'Fetching ALT…',
    altRpcPendingNote:
      'Instructions stay hidden until ALT accounts are resolved.',
    v1Header: 'v1 header',
    cuLimit: 'CU limit',
    loadedData: 'Loaded accounts data size',
    accounts: 'Accounts',
    accountIndex: 'Index',
    accountFrame: 'frame',
    accountRemainingHint: 'remaining index (after frame)',
    accountRoleSigner: 'signer',
    accountRoleWritable: 'writable',
    program: 'Program',
    instruction: 'Instruction',
    data: 'Data',
    dataEncoding: 'Encoding',
    docs: 'Docs',
    errorGeneric: 'Something went wrong.',
    tryWire: 'Check that the paste is full transaction wire in base58 or base64.',
    noDocs: 'No docs synced yet. Run npm run sync:docs.',
    docsFootnote: (sha: string) => `docs @ ${sha.slice(0, 7)}`,
    langToggle: '中文',
    argsL1: 'Ifx instruction decode',
    argsKnown: 'Decoded fields',
    argsRaw: 'Raw args (JSON)',
    payloadBytes: 'payload bytes after disc',
    missingFrameResetWarn:
      'No create_frame / reset_frame before this let in the transaction. Binding indexes are shown from $0 — they may continue from an earlier tx in the same bundle.',
    findRefs: (n: number) => `refs · ${n}`,
    noRefs: 'no refs',
    refsModalTitle: (binding: string) => `References to ${binding}`,
    refsModalClose: 'Close',
    refsIxLabel: 'ix',
  },
  zh: {
    brand: 'Ifx',
    navExplorer: '浏览器',
    navDocs: '文档',
    homeKicker: 'Solana 链上编排',
    homeHeadline:
      '同一笔交易里读状态、分支、CPI——不必为每种胶水逻辑再部署一个 wrapper program。',
    homeSupport:
      '粘贴交易序列化数据（base58 / base64），离线解码 Ifx 与 SIMD-0385 v1。默认不访问 RPC。动手前先读设计文档。',
    ctaExplorer: '打开浏览器',
    ctaDocs: '阅读文档',
    tagline: 'Solana 链上编排 — 离线解析交易数据中的 Ifx 指令。',
    inputLabel: '交易数据',
    inputPlaceholder:
      '粘贴整笔交易的序列化数据（base58 或 base64；legacy / v0 / v1）。默认不访问网络。',
    load: '解码',
    clear: '清空',
    loading: '解码中…',
    offlineNote: '纯离线 — 不会请求 RPC，也不会把数据发给第三方。',
    encoding: '编码',
    emptyTitle: '粘贴交易数据',
    emptyBody:
      '把整笔交易的序列化字节以 base58 或 base64 贴进来即可。非 Ifx 指令灰显；Ifx 高亮（L0：program + discriminator）。',
    links: '链接',
    github: 'GitHub',
    npm: 'npm SDK',
    programId: 'Program ID',
    packet: '包元信息',
    instructions: '指令',
    expandAll: '展开全部',
    collapseAll: '收起全部',
    version: '版本',
    wireBytes: '数据大小',
    alts: 'ALT',
    altUnresolved: '未解析',
    altResolved: '已解析',
    altRpcTitle: '需要 RPC 以解析 ALT',
    altRpcWhy:
      '这笔交易通过 Address Lookup Table 加载账户。序列化数据里只有 ALT 公钥与下标，真实地址存在链上 ALT 账户中。填写 RPC 后我们才会拉取 ALT 并补全指令账户；不填也能离线看到包元信息。',
    rpcLabel: 'RPC 地址',
    altRpcResolve: '解析 ALT',
    altRpcLoading: '正在拉取 ALT…',
    altRpcPendingNote: '指令列表在 ALT 解析完成前暂不展示。',
    v1Header: 'v1 header',
    cuLimit: 'CU limit',
    loadedData: 'loaded-accounts-data-size',
    accounts: '账户',
    accountIndex: '索引',
    accountFrame: 'frame',
    accountRemainingHint: 'remaining 下标（frame 之后）',
    accountRoleSigner: '签名',
    accountRoleWritable: '可写',
    program: '程序',
    instruction: '指令',
    data: '数据',
    dataEncoding: '编码',
    docs: '文档',
    errorGeneric: '出错了。',
    tryWire: '请确认粘贴的是完整交易序列化数据，且为 base58 或 base64。',
    noDocs: '尚未同步文档。请运行 npm run sync:docs。',
    docsFootnote: (sha: string) => `docs @ ${sha.slice(0, 7)}`,
    langToggle: 'EN',
    argsL1: 'Ifx 指令解释',
    argsKnown: '已解码字段',
    argsRaw: '原始参数（JSON）',
    payloadBytes: 'discriminator 后的 payload 字节',
    missingFrameResetWarn:
      '本交易在此 let 之前没有 create_frame / reset_frame。绑定下标按 $0 起算展示 — 若与同 bundle 前一笔交易衔接，实际下标可能不是从 0 开始。',
    findRefs: (n: number) => `引用 · ${n}`,
    noRefs: '无引用',
    refsModalTitle: (binding: string) => `${binding} 的引用`,
    refsModalClose: '关闭',
    refsIxLabel: '指令',
  },
} as const

export type Copy = {
  [K in keyof (typeof copy)['en']]: (typeof copy)['en'][K] extends (
    ...args: infer A
  ) => infer R
    ? (...args: A) => R
    : string
}
