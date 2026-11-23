function clusterQuery(cluster?: string | null): string {
  if (cluster === 'devnet') return '?cluster=devnet'
  if (cluster === 'testnet') return '?cluster=testnet'
  return ''
}

/** Build a Solscan account URL; cluster defaults to mainnet. */
export function solscanAccountUrl(
  address: string,
  cluster?: string | null,
): string {
  return `https://solscan.io/account/${address}${clusterQuery(cluster)}`
}

/** Build a Solscan transaction URL; cluster defaults to mainnet. */
export function solscanTxUrl(
  signature: string,
  cluster?: string | null,
): string {
  return `https://solscan.io/tx/${signature}${clusterQuery(cluster)}`
}
