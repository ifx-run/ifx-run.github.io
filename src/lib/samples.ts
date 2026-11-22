/** Mainnet v1 reference txs from ifx-run/ifx README (demo stacks). */
export type SampleTx = {
  id: string
  signature: string
  labelEn: string
  labelZh: string
  wireBytes: number
}

export const SAMPLE_TXS: SampleTx[] = [
  {
    id: 'sponsored-two-hop',
    signature:
      '5x7KCD2J3GycZxEqS768Nz8JXNKvpANhJ153jGfShHAjyq4ChbwwwVyU4HA5eRheYBHWmFu7g8ixQ7uXSRn5bprb',
    labelEn: 'Sponsored two-hop (1629 B v1)',
    labelZh: '赞助两跳 (1629 B v1)',
    wireBytes: 1629,
  },
  {
    id: 'pump-sell-close',
    signature:
      '5ZwiWKhr8MVhxnUGiWeyLJtnEjsFHABW51thhn3JYoq2SJV7ymASZg91CYZyCqfuXXPB8pdzJYczQKNAWSbMEW8T',
    labelEn: 'Pump SellV2 + ATA close (1193 B v1)',
    labelZh: 'Pump SellV2 + ATA close (1193 B v1)',
    wireBytes: 1193,
  },
  {
    id: 'meteora-sponsor',
    signature:
      '3twe8HVa9MqJ5uMW2NLsxVWKiXMzYGAmee67Tf2RYmvCeDHCfWBYGrirJCmFN2KmAdyjeBC2QRssdZpevsV3QLmi',
    labelEn: 'Meteora DAMM + sponsor (981 B v1)',
    labelZh: 'Meteora DAMM + 赞助 (981 B v1)',
    wireBytes: 981,
  },
  {
    id: 'raydium-cpmm',
    signature:
      '5nWjCgEAKXjwzR3BFdFbM8rCNuPwBvXeorkcP1Nx7rsNV6s9AY5XXERVED8SNc6Lg6dh596ok9Cgm5jdR3o5Tdia',
    labelEn: 'Raydium CPMM + smart close (856 B v1)',
    labelZh: 'Raydium CPMM + 智能 close (856 B v1)',
    wireBytes: 856,
  },
]
