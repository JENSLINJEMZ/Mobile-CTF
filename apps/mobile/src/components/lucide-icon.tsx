import Svg, { Circle, Path, Rect } from "react-native-svg";

type SvgNode =
  | { tag: "path"; d: string; transform?: string }
  | { tag: "circle"; cx: number; cy: number; r: number }
  | { tag: "rect"; x: number; y: number; width: number; height: number; rx: number; transform?: string };

const ICON_PATHS: Record<string, string> = {
  shield:
    '<path d="M12 2.5 4.5 5.8v5.9c0 4.9 3.2 9 7.5 10.3 4.3-1.3 7.5-5.4 7.5-10.3V5.8z"/><path d="m9 12 2.2 2.2L15.5 10"/>',
  calendar:
    '<rect x="3.2" y="5" width="17.6" height="16" rx="3.2"/><path d="M8 3v4M16 3v4M3.2 10h17.6"/>',
  terminal:
    '<rect x="2.6" y="4.2" width="18.8" height="15.6" rx="3.2"/><path d="m7 10 2.4 2.4L7 14.8"/><path d="M12.6 15h4"/>',
  briefcase:
    '<rect x="2.8" y="7.4" width="18.4" height="12.4" rx="3"/><path d="M9 7.4V5.6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v1.8"/><path d="M2.8 12.4h18.4"/>',
  users:
    '<path d="M16 20.5v-1.8a3.6 3.6 0 0 0-3.6-3.6H6.6A3.6 3.6 0 0 0 3 18.7v1.8"/><circle cx="9.5" cy="8" r="3.4"/><path d="M21 20.5v-1.8a3.6 3.6 0 0 0-2.7-3.5"/><path d="M15.5 4.7a3.6 3.6 0 0 1 0 6.7"/>',
  bars: '<path d="M6 20v-6.5M12 20V5M18 20v-9.5"/>',
  cube: '<path d="m12 2.6 8.4 4.7v9.4L12 21.4 3.6 16.7V7.3z"/><path d="m3.6 7.3 8.4 4.7 8.4-4.7M12 12v9.4"/>',
  lock: '<rect x="4.5" y="10.5" width="15" height="10.5" rx="2.6"/><path d="M8 10.5V7.6a4 4 0 0 1 8 0v2.9"/><circle cx="12" cy="15.6" r="1.2"/>',
  file: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M9 13h6M9 16.5h4"/>',
  bug: '<path d="M6.5 10.5h11v6.2a2.3 2.3 0 0 1-2.3 2.3H8.8a2.3 2.3 0 0 1-2.3-2.3z"/><path d="M9.6 7.4 8.2 5.2M14.4 7.4l1.4-2.2"/><circle cx="9.6" cy="9" r="1.1"/><circle cx="14.4" cy="9" r="1.1"/><path d="M6.5 12.5H4.4a1.6 1.6 0 0 0 0 3.2h2.1M17.5 12.5h2.1a1.6 1.6 0 0 1 0 3.2h-2.1"/>',
  globe: '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.4 2.4 3.6 5.3 3.6 8.5s-1.2 6.1-3.6 8.5c-2.4-2.4-3.6-5.3-3.6-8.5s1.2-6.1 3.6-8.5z"/>',
  cpu: '<rect x="7" y="7" width="10" height="10" rx="2.4"/><path d="M10 3.5V7M14 3.5V7M10 17v3.5M14 17v3.5M3.5 10H7M3.5 14H7M17 10h3.5M17 14h3.5"/>',
  activity: '<path d="M3 12h4.5l2-5 3.2 10 2.3-5H21"/>',
  logic: '<rect x="3" y="8" width="6" height="8" rx="1.6"/><rect x="15" y="8" width="6" height="8" rx="1.6"/><path d="M9 12h6"/>',
  trophy:
    '<path d="M7.5 4.2h9v4.6a4.5 4.5 0 0 1-9 0z"/><path d="M7.5 5.6H5.2a1.9 1.9 0 0 0 1.9 3.4M16.5 5.6h2.3a1.9 1.9 0 0 1-1.9 3.4"/><path d="M12 13.3V17M9.2 20.2h5.6M10.2 17h3.6"/>',
  flag: '<path d="M6 21V3.8"/><path d="M6 4.4h10.6l-2.1 3.6 2.1 3.6H6z"/>',
  flame: '<path d="M12 21.2a6 6 0 0 0 6-6c0-4-3-5.9-3-9.2 0 0-2.1 1.9-2.1 4.6 0-1.7-1.6-3.2-1.6-3.2-2.4 2.4-5.3 3.6-5.3 7.8a6 6 0 0 0 6 6z"/>',
  medal:
    '<circle cx="12" cy="15" r="5"/><path d="m8.6 10.6-2.1-6.4h11l-2.1 6.4"/><path d="m12 13.1.9 1.8 2 .3-1.5 1.4.4 2-1.8-1-1.8 1 .4-2-1.5-1.4 2-.3z"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20.5 20.5-3.6-3.6"/>',
  hash: '<path d="M5 9h14M5 15h14M9.5 4 7.5 20M16.5 4l-2 16"/>',
  image:
    '<rect x="3" y="4.5" width="18" height="15" rx="3"/><circle cx="8.8" cy="10" r="1.8"/><path d="m3.5 17 5-4.5 4.5 4 3-2.5 4.5 4"/>',
  doc: '<path d="M13.5 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8.5z"/><path d="M13.5 3v5.5H19"/>',
  home:
    '<path d="M3.5 10.5 12 3.5l8.5 7"/><path d="M5.6 9.6V20a1 1 0 0 0 1 1h3.2v-5.3h4.4V21h3.2a1 1 0 0 0 1-1V9.6"/>',
  user: '<circle cx="12" cy="8" r="3.8"/><path d="M4.5 20.5a7.5 7.5 0 0 1 15 0"/>',
  bell: '<path d="M18 8.5a6 6 0 0 0-12 0c0 6.5-2.5 8.5-2.5 8.5h17S18 15 18 8.5"/><path d="M13.8 20.5a2 2 0 0 1-3.6 0"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7"/>',
  wrench:
    '<path d="M14.7 6.3a4 4 0 0 1 5.3-5.3l-2.9 2.9 1.9 1.9 2.9-2.9a4 4 0 0 1-5.3 5.3l-6.4 6.4a2.1 2.1 0 1 1-3-3z" transform="translate(-1 2) scale(.85)"/><path d="M6.5 4.5 4 7l3.5 3.5L10 8z"/><path d="m9.5 10.5 8 8"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  arrow: '<path d="M5 12h13"/><path d="m13 6 6 6-6 6"/>',
  chevron: '<path d="m9 6 6 6-6 6"/>',
  download:
    '<path d="M12 13v9"/><path d="m8 18 4 4 4-4"/><path d="M20.5 16.5A5 5 0 0 0 18 7.5h-1.3A7 7 0 1 0 4 15"/>',
  star: '<path d="m12 2.5 2.9 5.9 6.6.9-4.8 4.6 1.2 6.5L12 17.4 6.1 20.4l1.2-6.5L2.5 9.3l6.6-.9z"/>',
  heart:
    '<path d="M12 2s5 4.5 5 9a5 5 0 0 1-10 0c0-1.6.6-3 1.4-4.2C9.2 8.4 12 2 12 2z"/><path d="M12 22a6 6 0 0 0 6-6c0-1-.3-2-.8-2.9A6.5 6.5 0 0 1 12 22z" opacity=".7"/>',
  radar: '<circle cx="12" cy="12" r="8.5"/><path d="M4.2 12a7.8 7.8 0 0 1 13.4-5.5L12 12z"/>',
  notes: '<path d="M4 5.5h16M4 12h16M4 18.5h10"/>',
};

function parseNodes(source: string): SvgNode[] {
  const nodes: SvgNode[] = [];
  const re = /<(\w+)\s+([^>]*?)\/?>/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(source))) {
    const tag = match[1] as SvgNode["tag"];
    const raw = match[2];
    const attrs: Record<string, string> = {};
    const attrRe = /([\w-]+)="([^"]*)"/g;
    let attr: RegExpExecArray | null;
    while ((attr = attrRe.exec(raw))) attrs[attr[1]] = attr[2];
    const num = (k: string) => Number(attrs[k] ?? 0);
    if (tag === "path") {
      nodes.push({ tag, d: attrs.d ?? "", transform: attrs.transform });
    } else if (tag === "circle") {
      nodes.push({ tag, cx: num("cx"), cy: num("cy"), r: num("r") });
    } else if (tag === "rect") {
      nodes.push({
        tag,
        x: num("x"),
        y: num("y"),
        width: num("width"),
        height: num("height"),
        rx: num("rx"),
        transform: attrs.transform,
      });
    }
  }
  return nodes;
}

const NODE_CACHE: Record<string, SvgNode[]> = {};

export type LucideName = keyof typeof ICON_PATHS;

export function LucideIcon({
  name,
  size,
  color,
  strokeWidth = 1.8,
}: {
  name: LucideName;
  size: number;
  color: string;
  strokeWidth?: number;
}) {
  const source = ICON_PATHS[name];
  if (!source) return null;
  const nodes = NODE_CACHE[name] ?? (NODE_CACHE[name] = parseNodes(source));
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {nodes.map((node, i) => {
        if (node.tag === "path") {
          return (
            <Path
              key={i}
              d={node.d}
              transform={node.transform}
            />
          );
        }
        if (node.tag === "circle") {
          return <Circle key={i} cx={node.cx} cy={node.cy} r={node.r} />;
        }
        return <Rect key={i} x={node.x} y={node.y} width={node.width} height={node.height} rx={node.rx} />;
      })}
    </Svg>
  );
}

export function renderLucide(name: LucideName, size: number, color: string) {
  return <LucideIcon name={name} size={size} color={color} />;
}