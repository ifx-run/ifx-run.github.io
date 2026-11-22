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
      'General explorers still mishandle Ifx instructions and SIMD-0385 v1 packets. Decode them here; read the design when you build.',
    ctaExplorer: 'Open Explorer',
    ctaDocs: 'Read the docs',
    tagline:
      'On-chain Solana orchestration — explore Ifx instructions that Solscan cannot render.',
    inputLabel: 'Signature or wire',
    inputPlaceholder:
      'Transaction signature, or paste base64 / hex wire (v0 / v1 OK)',
    load: 'Load',
    loading: 'Loading…',
    rpcLabel: 'RPC',
    rpcSave: 'Save',
    rpcReset: 'Default',
    samples: 'Samples',
    emptyTitle: 'Paste a signature or wire',
    emptyBody:
      'Non-Ifx instructions stay dimmed; Ifx is highlighted (L0: program + discriminator).',
    links: 'Links',
    github: 'GitHub',
    npm: 'npm SDK',
    programId: 'Program ID',
    packet: 'Packet',
    instructions: 'Instructions',
    version: 'Version',
    wireBytes: 'Wire bytes',
    alts: 'ALT',
    v1Header: 'v1 header',
    cuLimit: 'CU limit',
    loadedData: 'Loaded accounts data size',
    accounts: 'Accounts',
    data: 'Data',
    docs: 'Docs',
    solscan: 'Solscan',
    solscanNote: 'Solscan often cannot decode Ifx or v1 — use this view for those.',
    errorGeneric: 'Something went wrong.',
    tryWire: 'Paste wire bytes instead.',
    tryRpc: 'Change RPC URL above, then retry.',
    noDocs: 'No docs synced yet. Run npm run sync:docs.',
    docsFootnote: (sha: string) => `docs @ ${sha.slice(0, 7)}`,
    langToggle: '中文',
    argsL0: 'Args (L1 deserialize — coming soon)',
    payloadBytes: 'payload bytes after disc',
  },
  zh: {
    brand: 'Ifx',
    navExplorer: '浏览器',
    navDocs: '文档',
    homeKicker: 'Solana 链上编排',
    homeHeadline:
      '同一笔交易里读状态、分支、CPI——不必为每种胶水逻辑再部署一个 wrapper program。',
    homeSupport:
      '通用浏览器仍解不好 Ifx 指令与 SIMD-0385 v1 包。在这里解码交易；动手前先读设计文档。',
    ctaExplorer: '打开浏览器',
    ctaDocs: '阅读文档',
    tagline:
      'Solana 链上编排 — 查看 Solscan 无法正确渲染的 Ifx 指令。',
    inputLabel: '签名或 wire',
    inputPlaceholder:
      '交易签名，或粘贴 base64 / hex wire（支持 v0 / v1）',
    load: '加载',
    loading: '加载中…',
    rpcLabel: 'RPC',
    rpcSave: '保存',
    rpcReset: '默认',
    samples: '样例',
    emptyTitle: '粘贴签名或 wire',
    emptyBody:
      '非 Ifx 指令灰显；Ifx 高亮（L0：program + discriminator）。',
    links: '链接',
    github: 'GitHub',
    npm: 'npm SDK',
    programId: 'Program ID',
    packet: '包元信息',
    instructions: '指令时间线',
    version: '版本',
    wireBytes: '大致字节',
    alts: 'ALT',
    v1Header: 'v1 header',
    cuLimit: 'CU limit',
    loadedData: 'loaded-accounts-data-size',
    accounts: '账户',
    data: '数据',
    docs: '文档',
    solscan: 'Solscan',
    solscanNote: 'Solscan 通常解不了 Ifx / v1 — 那些部分请在本站查看。',
    errorGeneric: '出错了。',
    tryWire: '可改为粘贴 wire 字节。',
    tryRpc: '请修改上方 RPC 后重试。',
    noDocs: '尚未同步文档。请运行 npm run sync:docs。',
    docsFootnote: (sha: string) => `docs @ ${sha.slice(0, 7)}`,
    langToggle: 'EN',
    argsL0: '参数（L1 反序列化 — 即将支持）',
    payloadBytes: 'discriminator 后的 payload 字节',
  },
} as const

export type Copy = {
  [K in keyof (typeof copy)['en']]: (typeof copy)['en'][K] extends (
    ...args: infer A
  ) => infer R
    ? (...args: A) => R
    : string
}
