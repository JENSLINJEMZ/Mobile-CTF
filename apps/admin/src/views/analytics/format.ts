export function numFmt(value: number | undefined | null): string {
  if (value == null || Number.isNaN(value)) return "0";
  return value.toLocaleString();
}

export function compactNum(value: number | undefined | null): string {
  if (value == null || Number.isNaN(value)) return "0";
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return String(value);
}

export function generateSparkline(
  points: number[],
  width = 76,
  height = 26,
  padding = 3,
): { linePath: string; areaPath: string } {
  if (!points || points.length === 0) {
    const mid = height / 2;
    return {
      linePath: `M 0 ${mid} L ${width} ${mid}`,
      areaPath: `M 0 ${mid} L ${width} ${mid} L ${width} ${height} L 0 ${height} Z`,
    };
  }

  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;

  const dx = (width - padding * 2) / Math.max(1, points.length - 1);
  const coords: Array<[number, number]> = points.map((val, idx) => {
    const x = padding + idx * dx;
    const y = height - padding - ((val - min) / range) * (height - padding * 2);
    return [x, y];
  });

  const linePath = coords.reduce(
    (acc, [x, y], idx) => (idx === 0 ? `M ${x.toFixed(1)} ${y.toFixed(1)}` : `${acc} L ${x.toFixed(1)} ${y.toFixed(1)}`),
    "",
  );

  const firstX = coords[0]![0].toFixed(1);
  const lastX = coords[coords.length - 1]![0].toFixed(1);
  const areaPath = `${linePath} L ${lastX} ${height} L ${firstX} ${height} Z`;

  return { linePath, areaPath };
}

const AV_PALETTES = [
  ["#f43f5e", "#4c1d95"],
  ["#8b5cf6", "#4c1d95"],
  ["#a78bfa", "#4c1d95"],
  ["#22d3ee", "#0e7490"],
  ["#f59e0b", "#7c2d12"],
  ["#10b981", "#064e3b"],
  ["#ec4899", "#831843"],
];

export function getAvatarColors(name: string): [string, string] {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  const chosen = AV_PALETTES[hash % AV_PALETTES.length] ?? ["#8b5cf6", "#4c1d95"];
  return [chosen[0]!, chosen[1]!];
}
