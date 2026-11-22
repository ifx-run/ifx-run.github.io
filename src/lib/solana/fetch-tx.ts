import { createSolanaRpc, signature as toSignature } from '@solana/kit'
import {
  exploreFromRpcResponse,
  type ExploredTransaction,
  type RpcTxEnvelope,
} from './parse-tx'

export async function fetchAndExploreTransaction(
  sig: string,
  rpcUrl: string,
  signal?: AbortSignal,
): Promise<ExploredTransaction> {
  const rpc = createSolanaRpc(rpcUrl)
  const sigBrand = toSignature(sig.trim())

  const pending = rpc
    .getTransaction(sigBrand, {
      commitment: 'confirmed',
      encoding: 'base64',
      maxSupportedTransactionVersion: 1,
    })
    .send()

  const rpcTx = await raceAbort(pending, signal)
  if (!rpcTx) {
    throw new RpcExploreError(
      'not_found',
      'Transaction not found on this RPC. Try another RPC URL, or paste the wire bytes.',
    )
  }

  try {
    return exploreFromRpcResponse(sig.trim(), rpcTx as unknown as RpcTxEnvelope)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    throw new RpcExploreError(
      'decode',
      `RPC returned the transaction but decode failed (${msg}). Paste wire bytes as a fallback.`,
      e,
    )
  }
}

export class RpcExploreError extends Error {
  readonly kind: 'not_found' | 'rpc' | 'decode' | 'abort'
  readonly cause: unknown | undefined

  constructor(
    kind: 'not_found' | 'rpc' | 'decode' | 'abort',
    message: string,
    cause?: unknown,
  ) {
    super(message)
    this.name = 'RpcExploreError'
    this.kind = kind
    this.cause = cause
  }
}

async function raceAbort<T>(p: PromiseLike<T>, signal?: AbortSignal): Promise<T> {
  if (!signal) return await p
  if (signal.aborted) throw new RpcExploreError('abort', 'Aborted')
  return await new Promise<T>((resolve, reject) => {
    const onAbort = () => reject(new RpcExploreError('abort', 'Aborted'))
    signal.addEventListener('abort', onAbort, { once: true })
    Promise.resolve(p).then(
      (v) => {
        signal.removeEventListener('abort', onAbort)
        resolve(v)
      },
      (e) => {
        signal.removeEventListener('abort', onAbort)
        reject(
          new RpcExploreError(
            'rpc',
            `RPC request failed. Check the URL / CORS, or paste wire instead. (${e instanceof Error ? e.message : String(e)})`,
            e,
          ),
        )
      },
    )
  })
}
