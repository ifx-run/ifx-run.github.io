import { createSolanaRpc, type Signature } from '@solana/kit'
import { parseSignature } from './signature'

/**
 * Fetch serialized transaction wire (base64) for a signature via JSON-RPC.
 */
export async function fetchWireBySignature(
  signatureRaw: string,
  rpcUrl: string,
  signal?: AbortSignal,
): Promise<{ signature: Signature; wireBase64: string }> {
  const sig = parseSignature(signatureRaw)
  const url = rpcUrl.trim()
  if (!url) throw new Error('RPC URL required')

  const rpc = createSolanaRpc(url)
  const result = await rpc
    .getTransaction(sig, {
      encoding: 'base64',
      maxSupportedTransactionVersion: 1,
    })
    .send({ abortSignal: signal })

  if (!result) {
    throw new Error('transaction not found on this RPC')
  }
  const wireBase64 = result.transaction[0]
  if (typeof wireBase64 !== 'string' || !wireBase64) {
    throw new Error('RPC returned empty transaction wire')
  }
  return { signature: sig, wireBase64 }
}
