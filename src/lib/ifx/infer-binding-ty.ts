import type { DecodedExpr } from './decode-expr'
import type { DecodedLetBinding } from './decode-let'
import type { ValueTypeName } from './variants'

/** Best-effort static type for a let binding given prior binding types in-session. */
export function inferLetBindingTy(
  b: DecodedLetBinding,
  env: ReadonlyMap<number, string>,
): string {
  switch (b.kind) {
    case 'accountDataSlice':
      return b.ty
    case 'constPubkey':
      return 'Pubkey'
    case 'sysvarRentMinimumBalance':
      return 'U64'
    case 'eval':
      return inferExprTy(b.expr, env) ?? 'Expr'
    case 'accountLamports':
    case 'accountDataLen':
    case 'accountRentEpoch':
    case 'splTokenAccountAmount':
    case 'splTokenAccountDelegatedAmount':
    case 'splMintSupply':
    case 'splToken2022AccountAmount':
    case 'splToken2022AccountDelegatedAmount':
    case 'splToken2022MintSupply':
    case 'splToken2022AccountTransferFeeWithheld':
    case 'splToken2022MintTransferFeeMaximum':
    case 'splToken2022MintWithheldAmount':
    case 'stakeDelegationStake':
    case 'stakeDelegationActivationEpoch':
    case 'stakeDelegationDeactivationEpoch':
    case 'stakeLockupUnixTimestamp':
    case 'stakeLockupEpoch':
    case 'stakeRentExemptReserve':
    case 'stakeCreditsObserved':
    case 'sysvarClockSlot':
    case 'sysvarClockEpochStartTimestamp':
    case 'sysvarClockEpoch':
    case 'sysvarClockLeaderScheduleEpoch':
    case 'sysvarClockUnixTimestamp':
    case 'frameGeneration':
      return 'U64'
    case 'frameIndexCount':
      return 'U16'
    case 'splMintDecimals':
    case 'splToken2022MintDecimals':
    case 'splTokenAccountState':
    case 'splToken2022AccountState':
    case 'splToken2022MintDefaultAccountState':
    case 'splToken2022MintTransferFeeBasisPoints':
    case 'stakeAccountState':
    case 'stakeStakeFlags':
    case 'upgradeableProgramDataTag':
      return 'U8'
    case 'accountIsSigner':
    case 'accountIsWritable':
    case 'accountExecutable':
    case 'splMintIsInitialized':
    case 'splToken2022MintIsInitialized':
    case 'splTokenAccountIsNative':
    case 'splTokenAccountOwnerIsDerived':
    case 'splToken2022AccountIsNative':
    case 'splToken2022AccountOwnerIsDerived':
      return 'Bool'
    case 'accountKey':
    case 'accountProgramOwner':
    case 'splMintMintAuthority':
    case 'splMintFreezeAuthority':
    case 'splToken2022MintMintAuthority':
    case 'splToken2022MintFreezeAuthority':
    case 'splTokenAccountMint':
    case 'splTokenAccountOwner':
    case 'splTokenAccountDelegate':
    case 'splTokenAccountCloseAuthority':
    case 'splToken2022AccountMint':
    case 'splToken2022AccountOwner':
    case 'splToken2022AccountDelegate':
    case 'splToken2022AccountCloseAuthority':
    case 'stakeAuthorizedStaker':
    case 'stakeAuthorizedWithdrawer':
    case 'stakeDelegationVoter':
    case 'stakeLockupCustodian':
    case 'upgradeableProgramDataUpgradeAuthority':
    case 'upgradeableProgramProgramDataAddress':
      return 'Pubkey'
    default:
      return 'Unknown'
  }
}

function inferExprTy(
  e: DecodedExpr,
  env: ReadonlyMap<number, string>,
): string | null {
  switch (e.op) {
    case 'value':
      return env.get(e.index) ?? null
    case 'constBool':
      return 'Bool'
    case 'constU8':
      return 'U8'
    case 'constU16':
      return 'U16'
    case 'constU32':
      return 'U32'
    case 'constU64':
      return 'U64'
    case 'constU128':
      return 'U128'
    case 'constI8':
      return 'I8'
    case 'constI16':
      return 'I16'
    case 'constI32':
      return 'I32'
    case 'constI64':
      return 'I64'
    case 'constI128':
      return 'I128'
    case 'constF32':
      return 'F32'
    case 'constF64':
      return 'F64'
    case 'constPubkey':
      return 'Pubkey'
    case 'not':
    case 'isZero':
    case 'nonZero':
    case 'eq':
    case 'ne':
    case 'gt':
    case 'ge':
    case 'lt':
    case 'le':
    case 'and':
    case 'or':
      return 'Bool'
    case 'asU8':
      return 'U8'
    case 'asU16':
      return 'U16'
    case 'asU32':
      return 'U32'
    case 'asU64':
      return 'U64'
    case 'asU128':
      return 'U128'
    case 'asI8':
      return 'I8'
    case 'asI16':
      return 'I16'
    case 'asI32':
      return 'I32'
    case 'asI64':
      return 'I64'
    case 'asI128':
      return 'I128'
    case 'neg':
    case 'add':
    case 'sub':
    case 'mul':
    case 'div':
    case 'divFloor':
    case 'divCeil':
    case 'min':
    case 'max':
    case 'saturatingSub':
    case 'bpsMulFloor':
    case 'bpsMulCeil':
      return inferExprTy(e.args[0], env)
    case 'mulDivFloor':
    case 'mulDivCeil':
    case 'clamp':
      return inferExprTy(e.args[0], env)
    case 'select':
      return (
        inferExprTy(e.args[1], env) ?? inferExprTy(e.args[2], env) ?? null
      )
    default:
      return null
  }
}

export type { ValueTypeName }
