/** Little-endian byte cursor for Ifx wire decode (browser-safe, no Buffer). */

export class WireCursor {
  readonly data: Uint8Array
  offset = 0

  constructor(bytes: Uint8Array) {
    this.data = bytes
  }

  get remaining(): number {
    return this.data.length - this.offset
  }

  private need(n: number): void {
    if (this.offset + n > this.data.length) {
      throw new Error(
        `wire truncated: need ${n} B at ${this.offset}, have ${this.remaining}`,
      )
    }
  }

  u8(): number {
    this.need(1)
    return this.data[this.offset++]!
  }

  i8(): number {
    const v = this.u8()
    return v > 127 ? v - 256 : v
  }

  u16(): number {
    this.need(2)
    const v = this.data[this.offset]! | (this.data[this.offset + 1]! << 8)
    this.offset += 2
    return v
  }

  i16(): number {
    const v = this.u16()
    return v > 0x7fff ? v - 0x10000 : v
  }

  u32(): number {
    this.need(4)
    const view = new DataView(
      this.data.buffer,
      this.data.byteOffset + this.offset,
      4,
    )
    const v = view.getUint32(0, true)
    this.offset += 4
    return v
  }

  i32(): number {
    this.need(4)
    const view = new DataView(
      this.data.buffer,
      this.data.byteOffset + this.offset,
      4,
    )
    const v = view.getInt32(0, true)
    this.offset += 4
    return v
  }

  u64(): bigint {
    this.need(8)
    const view = new DataView(
      this.data.buffer,
      this.data.byteOffset + this.offset,
      8,
    )
    const v = view.getBigUint64(0, true)
    this.offset += 8
    return v
  }

  i64(): bigint {
    this.need(8)
    const view = new DataView(
      this.data.buffer,
      this.data.byteOffset + this.offset,
      8,
    )
    const v = view.getBigInt64(0, true)
    this.offset += 8
    return v
  }

  /** Unsigned 128-bit LE → BigInt. */
  u128(): bigint {
    this.need(16)
    let n = 0n
    for (let i = 15; i >= 0; i--) {
      n = (n << 8n) | BigInt(this.data[this.offset + i]!)
    }
    this.offset += 16
    return n
  }

  /** Signed 128-bit two's complement LE → BigInt. */
  i128(): bigint {
    const u = this.u128()
    const sign = 1n << 127n
    return u >= sign ? u - (1n << 128n) : u
  }

  f32(): number {
    this.need(4)
    const view = new DataView(
      this.data.buffer,
      this.data.byteOffset + this.offset,
      4,
    )
    const v = view.getFloat32(0, true)
    this.offset += 4
    return v
  }

  f64(): number {
    this.need(8)
    const view = new DataView(
      this.data.buffer,
      this.data.byteOffset + this.offset,
      8,
    )
    const v = view.getFloat64(0, true)
    this.offset += 8
    return v
  }

  take(n: number): Uint8Array {
    this.need(n)
    const slice = this.data.subarray(this.offset, this.offset + n)
    this.offset += n
    return slice
  }

  pubkey32(): Uint8Array {
    return this.take(32)
  }
}
