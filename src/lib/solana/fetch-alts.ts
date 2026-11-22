import {
  createSolanaRpc,
  fetchAddressesForLookupTables,
  type Address,
  type CompiledTransactionMessage,
} from '@solana/kit'

export type LoadedAddresses = {
  writable: readonly Address[]
  readonly: readonly Address[]
}

type AddressTableLookup = {
  lookupTableAddress: Address
  writableIndexes: readonly number[]
  readonlyIndexes: readonly number[]
}

function getLookups(
  compiled: CompiledTransactionMessage,
): readonly AddressTableLookup[] {
  if (
    'addressTableLookups' in compiled &&
    Array.isArray(compiled.addressTableLookups) &&
    compiled.addressTableLookups.length > 0
  ) {
    return compiled.addressTableLookups as readonly AddressTableLookup[]
  }
  return []
}

/** Build `meta.loadedAddresses`-shaped lists from wire lookups + fetched ALT contents. */
export function loadedAddressesFromLookups(
  compiled: CompiledTransactionMessage,
  tables: Record<string, readonly Address[]>,
): LoadedAddresses {
  const lookups = getLookups(compiled)
  const writable: Address[] = []
  const readonlyAddrs: Address[] = []

  for (const lookup of lookups) {
    const key = String(lookup.lookupTableAddress)
    const addresses = tables[key] ?? tables[lookup.lookupTableAddress]
    if (!addresses) {
      throw new Error(`ALT contents missing for ${key}`)
    }
    for (const i of lookup.writableIndexes) {
      if (i >= addresses.length) {
        throw new Error(
          `ALT index ${i} out of range for ${key} (len ${addresses.length})`,
        )
      }
      writable.push(addresses[i]!)
    }
    for (const i of lookup.readonlyIndexes) {
      if (i >= addresses.length) {
        throw new Error(
          `ALT index ${i} out of range for ${key} (len ${addresses.length})`,
        )
      }
      readonlyAddrs.push(addresses[i]!)
    }
  }

  return { writable, readonly: readonlyAddrs }
}

/** Fetch ALT accounts via RPC and return loaded writable/readonly address lists. */
export async function fetchLoadedAddresses(
  compiled: CompiledTransactionMessage,
  rpcUrl: string,
  signal?: AbortSignal,
): Promise<LoadedAddresses> {
  const lookups = getLookups(compiled)
  if (lookups.length === 0) {
    return { writable: [], readonly: [] }
  }

  const rpc = createSolanaRpc(rpcUrl.trim())
  const tableAddrs = lookups.map((l) => l.lookupTableAddress)
  const tables = await fetchAddressesForLookupTables(
    tableAddrs,
    rpc,
    signal ? { abortSignal: signal } : undefined,
  )

  return loadedAddressesFromLookups(
    compiled,
    tables as Record<string, readonly Address[]>,
  )
}
