import { AccountRole, isSignerRole, isWritableRole } from '@solana/kit'

export type AccountRoleFlags = {
  /** Raw kit enum (0–3). */
  raw: number
  signer: boolean
  writable: boolean
}

/** Normalize kit AccountRole (enum number or name string) into flags. */
export function parseAccountRole(role: unknown): AccountRoleFlags {
  let raw: number
  if (typeof role === 'number' && Number.isFinite(role)) {
    raw = role
  } else if (typeof role === 'string') {
    const asNum = Number(role)
    if (role in AccountRole && Number.isNaN(asNum)) {
      raw = AccountRole[role as keyof typeof AccountRole] as number
    } else if (!Number.isNaN(asNum)) {
      raw = asNum
    } else {
      raw = AccountRole.READONLY
    }
  } else {
    raw = AccountRole.READONLY
  }

  const enumRole = raw as AccountRole
  return {
    raw,
    signer: isSignerRole(enumRole),
    writable: isWritableRole(enumRole),
  }
}
