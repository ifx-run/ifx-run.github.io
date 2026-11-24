/** On-chain ValueType payload sizes (matches Ifx tape record payload). */
export function valueTypeByteSize(ty: string): number {
  switch (ty.trim().toLowerCase()) {
    case 'bool':
    case 'u8':
    case 'i8':
      return 1
    case 'u16':
    case 'i16':
      return 2
    case 'u32':
    case 'i32':
    case 'f32':
      return 4
    case 'u64':
    case 'i64':
    case 'f64':
      return 8
    case 'u128':
    case 'i128':
      return 16
    case 'pubkey':
      return 32
    default:
      return 8
  }
}
