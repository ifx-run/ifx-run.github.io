/** Build a Solscan account URL; cluster defaults to mainnet. */
export function solscanAccountUrl(
  address: string,
  cluster?: string | null,
): string {
  const base = `https://solscan.io/account/${address}`
  if (cluster === 'devnet') return `${base}?cluster=devnet`
  if (cluster === 'testnet') return `${base}?cluster=testnet`
  return base
}
