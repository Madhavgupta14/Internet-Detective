export function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, value));
}

export function roundScore(value: number): number {
  return Math.round(clamp(value));
}

export function weightedScore(parts: Array<[number, number]>): number {
  return roundScore(parts.reduce((sum, [value, weight]) => sum + value * weight, 0));
}
