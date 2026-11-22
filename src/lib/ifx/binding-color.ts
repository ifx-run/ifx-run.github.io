/**
 * Stable color for Frame binding index `$N`.
 *
 * Uses the golden-angle hue walk (~137.508°): consecutive indexes land far
 * apart on the wheel, so adjacent `$0/$1/$2…` stay easy to tell apart.
 * 256 slots fit fine in continuous HSL — exact uniqueness isn't required;
 * near-collisions only show up after many wraps, and light S/L wobble helps.
 */
const GOLDEN_ANGLE_DEG = 137.508

export function bindingColor(index: number): string {
  const i = Math.max(0, Math.floor(index)) % 256
  const hue = (i * GOLDEN_ANGLE_DEG) % 360
  const sat = 66 + (i % 3) * 7
  const lit = 60 + ((i * 5) % 4) * 4
  return `hsl(${hue.toFixed(2)} ${sat}% ${lit}%)`
}
