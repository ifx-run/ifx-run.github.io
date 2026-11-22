/** Cluster program IDs — keep in sync with ifx-run/ifx SDK constants. */
export const IFX_MAINNET_PROGRAM_ID =
  'ifxmwWVVZDmXN2DUVf7wtJYCXTRY4QsL5rzmNkXzxbj'
export const IFX_DEVNET_PROGRAM_ID =
  'ifxdR1RBRCsyXy7eRXGMxc2KEYWhoHSYvpP18yJ5vTc'
export const IFX_LOCALNET_PROGRAM_ID =
  'ifxLDKXy8Z5Hk4C9rDTnMStFXzRmpGQkGUCHfYWv5zD'

export const DEFAULT_IFX_PROGRAM_ID = IFX_MAINNET_PROGRAM_ID

export type IfxCluster = 'mainnet' | 'devnet' | 'localnet'

const BY_ID: ReadonlyMap<string, IfxCluster> = new Map([
  [IFX_MAINNET_PROGRAM_ID, 'mainnet'],
  [IFX_DEVNET_PROGRAM_ID, 'devnet'],
  [IFX_LOCALNET_PROGRAM_ID, 'localnet'],
])

export function identifyIfxProgram(
  programId: string,
): { cluster: IfxCluster } | null {
  const cluster = BY_ID.get(programId)
  return cluster ? { cluster } : null
}

export function isIfxProgramId(programId: string): boolean {
  return BY_ID.has(programId)
}
