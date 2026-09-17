import type {
  AnalyticsOverviewDto,
  AuditLogDto,
  ChallengeSummaryDto,
  EventSummaryDto,
  SystemServiceKey,
  SystemStatusDto,
  TeamAdminDto,
  UserAdminDto,
} from "@ctf/shared";
import { useEffect, useRef, useState } from "react";

import type { Session } from "../adminApi";
import * as adminApi from "../adminApi";
import WorldMap, { placeParticipants } from "../components/WorldMap";
import { Icon } from "../icons";

/* ---------------- reference sample data (fallback / decorative) ---------------- */
const STATS: Array<[string, string, string, string, string, string, number[]]> = [
  ["Total Users", "1,284", "12%", "users", "#8b5cf6", "#a855f7", [8, 12, 10, 16, 14, 20, 18, 26, 24, 30]],
  ["Total Teams", "186", "8%", "usercog", "#22d3ee", "#22d3ee", [10, 9, 13, 12, 17, 15, 20, 19, 24, 27]],
  ["Total Challenges", "48", "4%", "box", "#6366f1", "#818cf8", [6, 9, 8, 12, 11, 15, 14, 18, 17, 22]],
  ["Total Solves", "8,492", "23%", "flag", "#ec4899", "#f472b6", [5, 8, 7, 12, 16, 14, 20, 25, 23, 31]],
  ["Points Awarded", "642,350", "18%", "crown", "#f5a524", "#fbbf24", [7, 10, 9, 14, 13, 18, 22, 20, 27, 30]],
  ["Active Users", "183", "online", "chart", "#22c55e", "#4ade80", [12, 15, 13, 18, 17, 21, 19, 25, 23, 28]],
];

const FEED: Array<[string, string, string, string, string, string]> = [
  ["10:24", "flag", "#f43f5e", "Team ShadowBreak solved SQL Injection", "+500 pts", "#4ade80"],
  ["10:22", "user", "#22d3ee", "New user arjun_ctf registered", "", ""],
  ["10:20", "crown", "#f5a524", 'Challenge "Vault" first blood by n0va', "+1,000 pts", "#f5a524"],
  ["10:18", "users", "#8b5cf6", "Team cyber_arj joined the event", "", ""],
  ["10:15", "close", "#f43f5e", "Failed submission (k4l1x) - Wrong flag", "", ""],
  ["10:12", "box", "#f5a524", "Sandbox spawned for user testuser", "", ""],
  ["10:10", "mega", "#6366f1", "Announcement updated by admin", "", ""],
  ["10:08", "award", "#f5a524", 'Challenge "Forensic Trail" solved by shiro', "+300 pts", "#4ade80"],
];

const LABELS = ["Sep 10", "Sep 11", "Sep 12", "Sep 13", "Sep 14", "Sep 15", "Sep 16", "Sep 17"];
const SOLVES = [62, 74, 58, 96, 88, 118, 104, 138, 126, 152, 184, 166, 198, 190, 205];
const ATTEMPT = [96, 118, 104, 152, 142, 186, 168, 214, 198, 232, 268, 246, 290, 278, 300];

const CH: Array<[number, string, string, number, string, string]> = [
  [1, "SQL Injection", "Web", 324, "162,000", "medium"],
  [2, "Vault", "Reverse", 298, "298,000", "hard"],
  [3, "XOR Marks", "Crypto", 276, "138,000", "easy"],
  [4, "Forensic Trail", "Forensics", 243, "121,500", "medium"],
  [5, "CryptoPass", "Crypto", 198, "99,000", "hard"],
];

const BDG: Array<[string, string]> = [
  ["#f5a524", "G"],
  ["#c0c4d4", "S"],
  ["#cd7f32", "B"],
];

const COLORS = ["#f5a524", "#a855f7", "#22d3ee", "#6366f1", "#ec4899"];

const SV: Array<[number, string, string, string, number, number]> = [
  [1, "n0va", "#f5a524", "12,450", 48, 2],
  [2, "k4l1x", "#a855f7", "11,230", 41, 2],
  [3, "cyber_ari", "#22d3ee", "9,870", 38, 2],
  [4, "rootedev", "#6366f1", "8,430", 32, 1],
  [5, "shiro", "#ec4899", "7,210", 28, 2],
];

const TM: Array<[number, string, string, number, string, string]> = [
  [1, "ShadowBreak", "#a855f7", 5, "12,340", "10:12 AM"],
  [2, "BinaryBeasts", "#22d3ee", 4, "9,870", "09:48 AM"],
  [3, "NullPwn", "#6366f1", 3, "7,650", "09:21 AM"],
  [4, "0xStudents", "#f5a524", 6, "6,210", "08:55 AM"],
  [5, "CyberSapiens", "#ec4899", 4, "5,980", "08:32 AM"],
];

const STATUS_DEF: Array<{
  key: SystemServiceKey;
  name: string;
  icon: string;
  color: string;
}> = [
  { key: "api", name: "API Server", icon: "server", color: "#22d3ee" },
  { key: "database", name: "Database", icon: "db", color: "#a855f7" },
  { key: "redis", name: "Redis", icon: "redis", color: "#f43f5e" },
  { key: "docker", name: "Docker", icon: "docker", color: "#6366f1" },
  { key: "fileStorage", name: "File Storage", icon: "hdd", color: "#22c55e" },
  { key: "sandbox", name: "Sandbox", icon: "sandbox", color: "#f5a524" },
  { key: "proxy", name: "Proxy Service", icon: "proxy", color: "#ec4899" },
  { key: "mail", name: "Mail Service", icon: "mail", color: "#22d3ee" },
];

const QA: Array<[string, string, string]> = [
  ["Create Challenge", "plusflag", "#a855f7"],
  ["Create Event", "calendar", "#ec4899"],
  ["Send Announcement", "mega", "#f43f5e"],
  ["Manage Users", "usercog", "#22d3ee"],
  ["Spawn Sandbox", "spawn", "#6366f1"],
  ["View Submissions", "eye", "#f5a524"],
  ["Export Reports", "export", "#22c55e"],
  ["System Settings", "gear", "#8b5cf6"],
];

const COUNTRIES: Array<[string, string, number]> = [
  ["🇮🇳", "India", 428],
  ["🇺🇸", "USA", 186],
  ["🇩🇪", "Germany", 92],
  ["🇬🇧", "UK", 64],
  ["🇸🇬", "Singapore", 50],
];

function sparkPath(vals: number[], w: number, h: number) {
  const max = Math.max(...vals);
  const min = Math.min(...vals);
  const sx = w / (vals.length - 1);
  const sy = (h - 4) / (max - min || 1);
  return vals
    .map((v, i) => `${i ? "L" : "M"}${(i * sx).toFixed(1)},${(h - 2 - (v - min) * sy).toFixed(1)}`)
    .join(" ");
}

function feedStyle(action: string): [string, string] {
  const a = action.toLowerCase();
  if (a.includes("delet") || a.includes("fail")) return ["close", "#f43f5e"];
  if (a.includes("creat")) return ["plusflag", "#22d3ee"];
  if (a.includes("login") || a.includes("register")) return ["user", "#22d3ee"];
  if (a.includes("updat")) return ["gear", "#6366f1"];
  if (a.includes("publish")) return ["flag", "#a855f7"];
  if (a.includes("solve")) return ["flag", "#4ade80"];
  if (a.includes("announce")) return ["mega", "#6366f1"];
  return ["bolt", "#8b5cf6"];
}

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

interface Dash {
  o: AnalyticsOverviewDto | null;
  ev: EventSummaryDto[];
  ch: ChallengeSummaryDto[];
  us: UserAdminDto[];
  tm: TeamAdminDto[];
  cc: AuditLogDto[];
  lg: AuditLogDto[];
}

function dateKey(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${dd}`;
}

function cumulativeByDay(dates: string[], days: number): number[] {
  const end = new Date();
  end.setHours(0, 0, 0, 0);
  const start = new Date(end.getTime() - (days - 1) * 86400000);
  const counts = new Map<string, number>();
  for (let t = new Date(start); t <= end; t.setDate(t.getDate() + 1)) {
    counts.set(dateKey(t), 0);
  }
  for (const iso of dates) {
    const k = dateKey(new Date(iso));
    if (counts.has(k)) counts.set(k, counts.get(k)! + 1);
  }
  const out: number[] = [];
  let cum = 0;
  for (const k of counts.keys()) {
    cum += counts.get(k)!;
    out.push(cum);
  }
  return out;
}

function fmtGB(bytes: number): string {
  return (bytes / 1e9).toFixed(bytes < 1e9 ? 2 : 1);
}

export function DashboardView({
  session,
  onNavigate,
}: {
  session: Session;
  onNavigate: (view: string) => void;
}) {
  const [d, setD] = useState<Dash>({ o: null, ev: [], ch: [], us: [], tm: [], cc: [], lg: [] });
  const [range, setRange] = useState<"7D" | "30D" | "ALL">("ALL");
  const [modal, setModal] = useState<null | "challenges" | "solvers" | "teams" | "map">(null);
  const [sys, setSys] = useState<SystemStatusDto | null>(null);
  const [latMs, setLatMs] = useState<number | null>(null);

  const starsRef = useRef<SVGSVGElement>(null);
  const chartSvgRef = useRef<SVGSVGElement>(null);
  const chartWrapRef = useRef<HTMLDivElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<SVGSVGElement>(null);
  const donutRef = useRef<SVGSVGElement>(null);
  const legendRef = useRef<HTMLDivElement>(null);
  const stackRef = useRef<HTMLDivElement>(null);
  const pctRef = useRef<HTMLDivElement>(null);
  const usedRef = useRef<HTMLSpanElement>(null);
  const capRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    let on = true;
    Promise.allSettled([
      adminApi.getAnalyticsOverview(session),
      adminApi.listAdminEvents(session),
      adminApi.listAdminChallenges(session).then((r) => r.items),
      adminApi.listAdminUsers(session).then((r) => r.items),
      adminApi.listAdminTeams(session).then((r) => r.items),
      adminApi.listAuditLog(session, { action: "challenge.create", limit: 100 }).then((r) => r.items),
      adminApi.listAuditLog(session, { limit: 8 }).then((r) => r.items),
    ]).then(([o, e, c, u, t, cc, l]) => {
      if (!on) return;
      setD({
        o: o.status === "fulfilled" ? o.value : null,
        ev: e.status === "fulfilled" ? e.value : [],
        ch: c.status === "fulfilled" ? c.value : [],
        us: u.status === "fulfilled" ? u.value : [],
        tm: t.status === "fulfilled" ? t.value : [],
        cc: cc.status === "fulfilled" ? cc.value : [],
        lg: l.status === "fulfilled" ? l.value : [],
      });
    });
    return () => {
      on = false;
    };
  }, [session]);

  useEffect(() => {
    let on = true;
    let timer: number | undefined;
    const poll = () => {
      const t0 = performance.now();
      adminApi
        .getSystemStatus(session)
        .then((s) => {
          if (!on) return;
          setSys(s);
          setLatMs(Math.round(performance.now() - t0));
        })
        .catch(() => {
          if (on) {
            setSys(null);
            setLatMs(null);
          }
        });
    };
    poll();
    timer = window.setInterval(poll, 30000);
    return () => {
      on = false;
      if (timer !== undefined) window.clearInterval(timer);
    };
  }, [session]);

  /* hero stars */
  useEffect(() => {
    const el = starsRef.current;
    if (!el) return;
    let s = "";
    for (let i = 0; i < 70; i++) {
      const x = Math.random() * 100;
      const y = Math.random() * 100;
      const r = Math.random() * 1.1 + 0.3;
      const o = Math.random() * 0.7 + 0.2;
      s += `<circle cx="${x}%" cy="${y}%" r="${r}" fill="#fff" opacity="${o.toFixed(2)}"/>`;
    }
    el.innerHTML = s;
  }, []);

  /* solve statistics chart — real submissionsByDay data, live 7D/30D/ALL tabs */
  useEffect(() => {
    const svg = chartSvgRef.current;
    const wrap = chartWrapRef.current;
    const tip = tipRef.current;
    if (!svg || !wrap || !tip) return;

    const dayData = d.o?.submissionsByDay ?? [];
    let solves: number[];
    let attempts: number[];
    let labels: string[];
    if (dayData.length >= 2) {
      let cut = dayData;
      if (range === "7D") cut = dayData.slice(-7);
      else if (range === "30D") cut = dayData.slice(-30);
      if (cut.length < 2) cut = dayData;
      solves = cut.map((p) => p.solves);
      attempts = cut.map((p) => p.attempts);
      labels = cut.map((p) => {
        const dd = new Date(p.date);
        return Number.isNaN(dd.getTime())
          ? p.date
          : dd.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      });
    } else {
      solves = SOLVES;
      attempts = ATTEMPT;
      labels = LABELS;
    }

    const W = 520, H = 180, padL = 30, padR = 8, padT = 8, padB = 22;
    const n = solves.length;
    const niceMax = (v: number) => {
      if (v <= 0) return 100;
      const p = Math.pow(10, Math.floor(Math.log10(v)));
      const m = v / p;
      return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10) * p;
    };
    const maxY = niceMax(Math.max(...attempts, ...solves));
    const x = (i: number) => padL + (i * (W - padL - padR)) / (n - 1);
    const y = (v: number) => H - padB - (v / maxY) * (H - padT - padB);
    const smooth = (arr: number[]) => {
      let path = `M${x(0)},${y(arr[0]!)}`;
      for (let i = 0; i < arr.length - 1; i++) {
        const x0 = x(i), y0 = y(arr[i]!), x1 = x(i + 1), y1 = y(arr[i + 1]!), cx = (x0 + x1) / 2;
        path += ` C${cx},${y0} ${cx},${y1} ${x1},${y1}`;
      }
      return path;
    };
    let g = "";
    for (let i = 0; i <= 5; i++) {
      const v = Math.round((maxY / 5) * i);
      g += `<line x1="${padL}" y1="${y(v)}" x2="${W - padR}" y2="${y(v)}" stroke="#241d44" stroke-width="1" stroke-dasharray="3 4"/>`;
      g += `<text x="${padL - 6}" y="${y(v) + 3}" fill="#6f6a90" font-size="8.5" text-anchor="end" font-family="Inter">${v}</text>`;
    }
    labels.forEach((l, i) => {
      const idx = Math.round((i * (n - 1)) / (labels.length - 1));
      g += `<text x="${x(idx)}" y="${H - 7}" fill="#6f6a90" font-size="8.5" text-anchor="middle" font-family="Inter">${l}</text>`;
    });
    g =
      `<defs>
       <linearGradient id="gs" x1="0" y1="0" x2="0" y2="1">
         <stop offset="0" stop-color="#a855f7" stop-opacity=".35"/><stop offset="1" stop-color="#a855f7" stop-opacity="0"/>
       </linearGradient>
       <linearGradient id="ga" x1="0" y1="0" x2="0" y2="1">
         <stop offset="0" stop-color="#22d3ee" stop-opacity=".18"/><stop offset="1" stop-color="#22d3ee" stop-opacity="0"/>
       </linearGradient>
      </defs>` + g;
    g += `<path d="${smooth(attempts)} L${x(n - 1)},${y(0)} L${x(0)},${y(0)} Z" fill="url(#ga)"/>`;
    g += `<path d="${smooth(solves)} L${x(n - 1)},${y(0)} L${x(0)},${y(0)} Z" fill="url(#gs)"/>`;
    g += `<path d="${smooth(attempts)}" fill="none" stroke="#22d3ee" stroke-width="1.8" stroke-linecap="round"/>`;
    g += `<path d="${smooth(solves)}" fill="none" stroke="#a855f7" stroke-width="2" stroke-linecap="round"/>`;
    g += `<line id="cross" x1="0" y1="${padT}" x2="0" y2="${H - padB}" stroke="#a855f7" stroke-width="1" stroke-dasharray="3 3" opacity="0"/>`;
    g += `<circle id="ps" r="3.6" fill="#a855f7" stroke="#150f2e" stroke-width="2" opacity="0"/>`;
    g += `<circle id="pa" r="3.6" fill="#22d3ee" stroke="#150f2e" stroke-width="2" opacity="0"/>`;
    svg.innerHTML = g;

    const cross = svg.querySelector<SVGLineElement>("#cross");
    const ps = svg.querySelector<SVGCircleElement>("#ps");
    const pa = svg.querySelector<SVGCircleElement>("#pa");

    const show = (i: number) => {
      const px = x(i);
      cross?.setAttribute("x1", String(px));
      cross?.setAttribute("x2", String(px));
      cross?.setAttribute("opacity", "0.6");
      ps?.setAttribute("cx", String(px));
      ps?.setAttribute("cy", String(y(solves[i]!)));
      ps?.setAttribute("opacity", "1");
      pa?.setAttribute("cx", String(px));
      pa?.setAttribute("cy", String(y(attempts[i]!)));
      pa?.setAttribute("opacity", "1");
      const dayIdx = Math.min(labels.length - 1, Math.round((i * (labels.length - 1)) / (n - 1)));
      tip.innerHTML = `<b>${labels[dayIdx]!}</b><br><span class="s">${solves[i]!}</span> solves<br><span class="a">${attempts[i]!}</span> attempts`;
      const r = svg.getBoundingClientRect();
      const left = (px / W) * r.width;
      tip.style.opacity = "1";
      tip.style.left = Math.min(Math.max(left - 30, 6), r.width - 96) + "px";
      tip.style.top = Math.max(4, (y(solves[i]!) / H) * r.height - 58) + "px";
    };
    const onMove = (e: MouseEvent) => {
      const r = svg.getBoundingClientRect();
      const rel = ((e.clientX - r.left) / r.width) * W;
      let i = Math.round((rel - padL) / ((W - padL - padR) / (n - 1)));
      i = Math.max(0, Math.min(n - 1, i));
      show(i);
    };
    const onLeave = () => {
      tip.style.opacity = "0";
      cross?.setAttribute("opacity", "0");
      ps?.setAttribute("opacity", "0");
      pa?.setAttribute("opacity", "0");
    };
    wrap.addEventListener("mousemove", onMove);
    wrap.addEventListener("mouseleave", onLeave);
    show(n - 1);
    return () => {
      wrap.removeEventListener("mousemove", onMove);
      wrap.removeEventListener("mouseleave", onLeave);
    };
  }, [range, d.o]);

  /* world map */
  useEffect(() => {
    const el = mapRef.current;
    if (!el) return;
    const bands: Record<string, number[][]> = {
      75: [[-70, -20], [-160, -95], [60, 180]],
      70: [[-160, -62], [-52, -20], [10, 180]],
      65: [[-165, -60], [-50, -20], [5, 180]],
      60: [[-165, -60], [-45, -25], [-10, 180]],
      55: [[-135, -58], [-8, 140]],
      50: [[-130, -58], [-10, 142]],
      45: [[-125, -62], [-5, 145]],
      40: [[-125, -70], [-10, 60], [70, 145]],
      35: [[-120, -75], [-10, 60], [70, 140]],
      30: [[-115, -80], [-10, 60], [65, 125]],
      25: [[-110, -80], [-15, 55], [65, 120]],
      20: [[-105, -85], [-18, 50], [70, 110]],
      15: [[-95, -85], [-18, 50], [73, 105]],
      10: [[-85, -77], [-15, 48], [75, 100], [118, 127]],
      5: [[-80, -72], [-10, 45], [95, 120]],
      0: [[-80, -50], [8, 42], [100, 120]],
      "-5": [[-78, -35], [10, 40], [100, 135]],
      "-10": [[-77, -35], [12, 40], [105, 140]],
      "-15": [[-73, -35], [12, 40], [120, 146]],
      "-20": [[-70, -38], [13, 40], [113, 150]],
      "-25": [[-70, -42], [15, 33], [113, 152]],
      "-30": [[-72, -50], [16, 32], [115, 152]],
      "-35": [[-73, -55], [18, 28], [115, 150]],
      "-40": [[-73, -62], [170, 178]],
      "-45": [[-74, -66]],
      "-50": [[-74, -68]],
    };
    const W = 320, H = 170;
    const px = (lon: number) => ((lon + 180) / 360) * W;
    const py = (lat: number) => ((78 - lat) / 133) * H;
    let s = "";
    Object.keys(bands).forEach((k) => {
      const lat = +k;
      bands[k]!.forEach((pair) => {
        const a = pair[0]!;
        const b = pair[1]!;
        for (let lon = a; lon <= b; lon += 3.6) {
          const X = px(lon).toFixed(1);
          const Y = py(lat).toFixed(1);
          s += `<circle cx="${X}" cy="${Y}" r="1.05" fill="#3a2f6b"/>`;
        }
      });
    });
    const hot: Array<[number, number, string, number]> = [
      [78, 21, "#a855f7", 3.4],
      [-98, 39, "#a855f7", 3],
      [10, 51, "#8b5cf6", 2.6],
      [-2, 54, "#8b5cf6", 2.4],
      [103, 1, "#22d3ee", 2.4],
      [-47, -15, "#ec4899", 2.4],
      [135, -25, "#22d3ee", 2.2],
      [139, 36, "#a855f7", 2.4],
      [31, 30, "#8b5cf6", 2],
      [37, 55, "#8b5cf6", 2.2],
      [-79, 44, "#a855f7", 2],
      [28, -26, "#ec4899", 2],
    ];
    hot.forEach((p) => {
      const lon = p[0]!;
      const lat = p[1]!;
      const c = p[2]!;
      const r = p[3]!;
      s += `<circle cx="${px(lon)}" cy="${py(lat)}" r="${r * 2.6}" fill="${c}" opacity=".13"/>`;
      s += `<circle cx="${px(lon)}" cy="${py(lat)}" r="${r}" fill="${c}"/>`;
    });
    el.innerHTML = s;
  }, []);

  useEffect(() => {
    if (!modal) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setModal(null);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [modal]);

  /* storage donut (real) */
  useEffect(() => {
    const donut = donutRef.current;
    const legend = legendRef.current;
    const stack = stackRef.current;
    const pct = pctRef.current;
    const used = usedRef.current;
    const capel = capRef.current;
    if (!donut || !legend || !stack) return;
    const st = sys?.storage;
    const buckets = st?.buckets ?? [];
    const usedBytes = st?.usedBytes ?? 0;
    const totalBytes = st?.totalBytes ?? 0;
    const R = 40;
    const C = 2 * Math.PI * R;
    let off = 0;
    let s = `<circle cx="50" cy="50" r="${R}" fill="none" stroke="#241d44" stroke-width="11"/>`;
    buckets.forEach((seg) => {
      if (seg.bytes <= 0 || usedBytes <= 0) return;
      const len = (seg.bytes / usedBytes) * C;
      s += `<circle cx="50" cy="50" r="${R}" fill="none" stroke="${seg.color}" stroke-width="11"
           stroke-dasharray="${len - 1.5} ${C - len + 1.5}" stroke-dashoffset="${-off}" stroke-linecap="round"/>`;
      off += len;
    });
    donut.innerHTML = s;
    legend.innerHTML = buckets.length
      ? buckets
          .map(
            (seg) =>
              `<div class="leg"><i style="background:${seg.color}"></i>${seg.name}<em>${fmtGB(seg.bytes)} GB</em></div>`,
          )
          .join("")
      : `<div class="leg" style="color:#6f6a90">No storage data yet</div>`;
    const segUnits = buckets
      .filter((seg) => seg.bytes > 0)
      .map((seg) => ({ c: seg.color, v: seg.bytes }));
    const free = Math.max(totalBytes - usedBytes, 0);
    if (usedBytes > 0) {
      stack.innerHTML =
        segUnits
          .map((seg) => `<i style="background:${seg.c};flex:${Math.max(seg.v / 1e6, 0.1)}"></i>`)
          .join("") + `<i style="background:#241d44;flex:${Math.max(free / 1e6, 0.1)}"></i>`;
    } else {
      stack.innerHTML = `<i style="background:#241d44;flex:1"></i>`;
    }
    if (pct && totalBytes > 0) {
      pct.textContent = `${Math.round((usedBytes / totalBytes) * 100)}%`;
    }
    if (used) used.textContent = `${fmtGB(usedBytes)} GB`;
    if (capel) capel.textContent = `/ ${fmtGB(totalBytes)} GB`;
  }, [sys]);

  /* --- derived rows --- */
  const userTrend = cumulativeByDay(d.us.map((u) => u.createdAt), 14);
  const teamTrend = cumulativeByDay(d.tm.map((t) => t.createdAt), 14);
  const chTrend = cumulativeByDay(d.cc.map((c) => c.createdAt), 14);
  const stats = STATS.map((row, idx) => {
    const [lb, vl0, dl, ic, c1, c2, sp]: [
      string,
      string,
      string,
      string,
      string,
      string,
      number[],
    ] = row;
    const o = d.o;
    let vl = vl0;
    if (o) {
      if (idx === 0) vl = o.totalUsers.toLocaleString();
      if (idx === 1) vl = (d.tm.length || 186).toLocaleString();
      if (idx === 2) vl = o.totalChallenges.toLocaleString();
      if (idx === 3) vl = o.totalSubmissions.toLocaleString();
      if (idx === 4) vl = o.totalPointsAwarded.toLocaleString();
      if (idx === 5) vl = o.activeUsers.toLocaleString();
    }
    let spark = sp;
    if (idx === 0 && userTrend.length >= 2) spark = userTrend;
    if (idx === 1 && teamTrend.length >= 2) spark = teamTrend;
    if (idx === 2 && chTrend.length >= 2) spark = chTrend;
    const dayData = d.o?.submissionsByDay ?? [];
    if (dayData.length >= 2) {
      if (idx === 3) spark = dayData.map((p) => p.solves);
      if (idx === 4) spark = dayData.map((p) => p.points);
      if (idx === 5) spark = dayData.map((p) => p.attempts);
    }
    return { lb, vl, dl, ic, c1, c2, sp: spark, id: "sp" + idx };
  });

  const feedRows = d.lg.length
    ? d.lg.map((e) => {
        const [ic, c] = feedStyle(e.action);
        return {
          t: new Date(e.createdAt).toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
          }),
          ic,
          c,
          txt: `${e.actorUsername ?? "System"} ${e.action.replace(/_/g, " ")} ${e.entityType}`,
          pts: "",
          pc: "",
        };
      })
    : FEED.map(([t, ic, c, txt, pts, pc]) => ({ t, ic, c, txt, pts, pc }));

  const chRows = (() => {
    const real = [...d.ch]
      .filter((c) => c.solvedCount > 0)
      .sort((a, b) => b.solvedCount - a.solvedCount)
      .slice(0, 5)
      .map((c, i) => [
        i + 1,
        c.title,
        c.category?.name ?? "—",
        c.solvedCount.toLocaleString(),
        (c.basePoints * c.solvedCount).toLocaleString(),
        c.difficulty.toLowerCase(),
      ]);
    return real.length ? real : CH;
  })() as unknown as Array<[number, string, string, string, string, string]>;

  const svRows = d.us.some((u) => u.totalScore > 0)
    ? [...d.us]
        .sort((a, b) => b.totalScore - a.totalScore)
        .slice(0, 5)
        .map((u, i) => ({
          r: i + 1,
          n: u.username,
          c: COLORS[i % COLORS.length],
          p: u.totalScore.toLocaleString(),
          s: u.solveCount,
          b: i === 3 ? 1 : 2,
        }))
    : SV.map(([r, n, c, p, s, b]) => ({ r, n, c, p, s, b }));

  const tmRows = d.tm.length
    ? d.tm.slice(0, 5).map((t, i) => ({
        r: i + 1,
        n: t.name,
        c: COLORS[i % COLORS.length],
        m: t.memberCount,
        p: "—",
        j: new Date(t.createdAt).toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        }),
      }))
    : TM.map(([r, n, c, m, p, j]) => ({ r, n, c, m, p, j }));

  const chAll = (() => {
    const items = d.ch.length
      ? [...d.ch].sort((a, b) => b.solvedCount - a.solvedCount)
      : [];
    if (items.length) {
      return items.map((c, i) => [
        i + 1,
        c.title,
        c.category?.name ?? "—",
        c.solvedCount.toLocaleString(),
        (c.basePoints * c.solvedCount).toLocaleString(),
        c.difficulty.toLowerCase(),
      ]);
    }
    return CH;
  })() as unknown as Array<[number, string, string, string, string, string]>;

  const svAll = d.us.length
    ? [...d.us]
        .sort((a, b) => b.totalScore - a.totalScore)
        .map((u, i) => ({
          r: i + 1,
          n: u.username,
          c: COLORS[i % COLORS.length],
          p: u.totalScore.toLocaleString(),
          s: u.solveCount,
          b: i === 3 ? 1 : 2,
        }))
    : SV.map(([r, n, c, p, s, b]) => ({ r, n, c, p, s, b }));

  const tmAll = d.tm.length
    ? d.tm.map((t, i) => ({
        r: i + 1,
        n: t.name,
        c: COLORS[i % COLORS.length],
        m: t.memberCount,
        p: "—",
        j: new Date(t.createdAt).toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        }),
      }))
    : TM.map(([r, n, c, m, p, j]) => ({ r, n, c, m, p, j }));

  const pins = placeParticipants(d.us);

  const modalTitle =
    modal === "challenges"
      ? "All Top Challenges"
      : modal === "solvers"
        ? "All Top Solvers"
        : modal === "teams"
          ? "All Recent Teams"
          : "Global Participants";
  const modalCount =
    modal === "challenges"
      ? chAll.length
      : modal === "solvers"
        ? svAll.length
        : modal === "teams"
          ? tmAll.length
          : pins.length;

  const sysMap = new Map(sys?.services.map((s) => [s.key, s]) ?? []);
  const statusTiles = STATUS_DEF.map((def) => {
    const report = sysMap.get(def.key);
    const ok = def.key === "api" ? !!sys : !!report?.ok;
    const detail =
      def.key === "api"
        ? sys === null
          ? "Offline"
          : `${latMs ?? "–"}ms`
        : report?.detail ?? (sys ? "Unknown" : "Unreachable");
    return { ...def, ok, detail };
  });
  const degraded = statusTiles.filter((t) => !t.ok).length;
  const allOk = !!sys && degraded === 0;

  const countryMap = new Map<string, { flag: string; n: number }>();
  for (const p of pins) {
    const entry = countryMap.get(p.city.country) ?? { flag: p.city.flag, n: 0 };
    entry.n += 1;
    countryMap.set(p.city.country, entry);
  }
  const topCountries = [...countryMap.entries()]
    .sort((a, b) => b[1].n - a[1].n)
    .slice(0, 5)
    .map(([name, v]) => ({ name, flag: v.flag, n: v.n }));
  const ctryRows =
    topCountries.length > 0
      ? topCountries
      : COUNTRIES.map(([flag, name, n]) => ({ name, flag, n }));
  const mini: Array<[string, string, string, string]> = [
    ["globe", "#22d3ee", String(countryMap.size || "-"), "Countries"],
    ["user", "#a855f7", (d.o?.totalUsers ?? 0).toLocaleString(), "Users"],
    ["users", "#6366f1", String(d.tm.length), "Teams"],
    ["flag", "#ec4899", (d.o?.totalSubmissions ?? 0).toLocaleString(), "Solves"],
  ];
  const res = sys?.resources;
  const memPct = res && res.memoryTotalBytes > 0 ? Math.round((res.memoryUsedBytes / res.memoryTotalBytes) * 100) : 0;

  const live =
    d.ev.find((e) => e.status === "RUNNING") ?? d.ev.find((e) => e.status === "SCHEDULED");
  const evTitle = live?.title ?? "Cyferra CTF 2026";
  const evTag = live?.status ?? "RUNNING";
  let evPct = 38;
  let evMeta = "2d 14h 35m left";
  if (live && live.startsAt && live.endsAt) {
    const s = +new Date(live.startsAt);
    const e = +new Date(live.endsAt);
    const now = Date.now();
    if (e > s) {
      evPct = Math.max(0, Math.min(100, Math.round(((now - s) / (e - s)) * 100)));
    }
    const left = Math.max(0, e - now);
    const dd = Math.floor(left / 86400000);
    const hh = Math.floor((left % 86400000) / 3600000);
    const mm = Math.floor((left % 3600000) / 60000);
    evMeta = `${dd}d ${hh}h ${mm}m left`;
  }

  return (
    <>
      <section className="grid r1">
        <div className="hero">
          <div className="hero-bg">
            <div className="neb"></div>
            <svg
              ref={starsRef}
              width="100%"
              height="100%"
              style={{ position: "absolute", inset: 0 }}
            ></svg>
            <svg className="ridge" viewBox="0 0 600 60" preserveAspectRatio="none">
              <path
                d="M0 60 L0 42 L58 22 L110 40 L168 16 L235 44 L300 26 L360 46 L420 30 L470 48 L530 34 L600 52 L600 60 Z"
                fill="#0a0718"
                opacity=".92"
              />
              <path
                d="M300 25 h2 v-7 h-2 z M299 18 a2.2 2.2 0 014 0 a2.2 2.2 0 01-4 0 M300 25 l-3 8 h2 l1.5-4 1.5 4 h2 z"
                fill="#0a0718"
              />
            </svg>
          </div>
          <div className="hero-inner">
            <div className="kicker">Welcome back, Admin 👋</div>
            <h1>Command the Challenge</h1>
            <p>Manage. Monitor. Motivate. Make an Impact.</p>
          </div>
          <div className="hero-quote">
            “A CTF today,
            <br />
            a safer tomorrow.”
          </div>
        </div>

        <div className="card event">
          <div className="event-badge">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M8 4h8v5a4 4 0 01-8 0z" />
              <path d="M8 5H5v2a3 3 0 003 3M16 5h3v2a3 3 0 01-3 3" />
              <path d="M12 13v4M9 20h6l-1-3h-4z" />
            </svg>
          </div>
          <div className="event-body">
            <div className="event-top">
              <span className="lb">Ongoing Event</span>
              <span className="tag-live">
                <i className="dot"></i>
                {evTag}
              </span>
            </div>
            <h3>{evTitle}</h3>
            <div className="bar">
              <i style={{ width: `${evPct}%` }}></i>
            </div>
            <div className="event-meta">{evMeta}</div>
          </div>
          <button className="btn-primary" onClick={() => onNavigate("Events")}>Manage Event</button>
        </div>
      </section>

      <section className="grid r2">
        {stats.map(({ lb, vl, dl, ic, c1, c2, sp, id }) => (
          <div className="card stat" key={lb}>
            <div className="lb">{lb}</div>
            <div className="vl">{vl}</div>
            {dl === "online" ? (
              <div className="delta">
                <i
                  className="dot"
                  style={{ width: 6, height: 6, borderRadius: "50%", background: "#4ade80", boxShadow: "0 0 6px #4ade80" }}
                ></i>
                Online Now
              </div>
            ) : (
              <div className="delta">
                <Icon name="up" />
                {dl}
              </div>
            )}
            <div className="stat-ico" style={{ background: `${c1}1f`, borderColor: `${c1}38`, color: c2 }}>
              <Icon name={ic} />
            </div>
            <svg className="spark" viewBox="0 0 72 26">
              <defs>
                <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor={c2} stopOpacity=".45" />
                  <stop offset="1" stopColor={c2} stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d={`${sparkPath(sp, 72, 22)} L72,26 L0,26 Z`} fill={`url(#${id})`} />
              <path d={sparkPath(sp, 72, 22)} fill="none" stroke={c2} strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
        ))}
      </section>

      <section className="grid r3">
        <div className="card">
          <div className="card-head">
            <span className="card-title">Live Activity Feed</span>
            <span className="tag-live">
              <i className="dot"></i>Live
            </span>
            <span className="select">
              All Activity <Icon name="arrow" />
            </span>
          </div>
          <div className="feed">
            {feedRows.map((row, i) => (
              <div className="feed-row" key={i}>
                <span className="feed-ico" style={{ color: row.c, background: `${row.c}1a` }}>
                  <Icon name={row.ic} />
                </span>
                <span className="feed-time">{row.t}</span>
                <span className="feed-txt">{row.txt}</span>
                <span className="feed-pts" style={{ color: row.pc }}>
                  {row.pts}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <span className="card-title">Solve Statistics</span>
            <div className="seg">
              {(["7D", "30D", "ALL"] as const).map((r) => (
                <button key={r} className={range === r ? "on" : ""} onClick={() => setRange(r)}>
                  {r}
                </button>
              ))}
            </div>
          </div>
          <div className="legend">
            <span>
              <i style={{ background: "#a855f7" }}></i>Solves
            </span>
            <span>
              <i style={{ background: "#22d3ee" }}></i>Attempts
            </span>
          </div>
          <div className="chart-wrap" ref={chartWrapRef}>
            <svg
              ref={chartSvgRef}
              viewBox="0 0 520 180"
              preserveAspectRatio="none"
              style={{ width: "100%", height: 180, display: "block" }}
            ></svg>
            <div className="tip" ref={tipRef} style={{ opacity: 0 }}></div>
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <span className="card-title">Global Participation</span>
            <button className="card-link" onClick={() => setModal("map")}>
              View Map <Icon name="arrow" />
            </button>
          </div>
          <div className="map-grid">
            <div className="map-box">
              <svg ref={mapRef} viewBox="0 0 320 170" style={{ width: "100%", height: "100%", display: "block" }}></svg>
            </div>
            <div>
              <div className="ctry-h">
                Top Countries <Icon name="arrow" />
              </div>
              <div className="countries">
                {ctryRows.map((r) => (
                  <div className="ctry" key={r.name}>
                    <span className="fl">{r.flag}</span>
                    <span className="nm">{r.name}</span>
                    <span className="ct">{r.n}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="mini-row">
            {mini.map(([ic, c, v, l]) => (
              <div className="mini" key={l}>
                <span style={{ color: c }}>
                  <Icon name={ic} />
                </span>
                <b>{v}</b>
                <span>{l}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid r4">
        <div className="card">
          <div className="card-head">
            <span className="card-title">Top Challenges</span>
            <button className="card-link" onClick={() => setModal("challenges")}>
              View All <Icon name="arrow" />
            </button>
          </div>
          <div className="tbl">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Challenge</th>
                  <th>Category</th>
                  <th>Solves</th>
                  <th>Points</th>
                  <th>Difficulty</th>
                </tr>
              </thead>
              <tbody>
                {chRows.map(([r, n, c, s, p, d]) => {
                  const diff = d === "expert" ? "hard" : d;
                  const label = d === "easy" || d === "medium" ? cap(d) : d === "expert" ? "Expert" : "Hard";
                  return (
                    <tr key={r}>
                      <td className="rank">{r}</td>
                      <td style={{ color: "#e9e6f7", fontWeight: 500 }}>{n}</td>
                      <td className="cat">{c}</td>
                      <td className="num">{s}</td>
                      <td className="num">{p}</td>
                      <td>
                        <span className={`chip ${diff}`}>{label}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <span className="card-title">Top Solvers</span>
            <button className="card-link" onClick={() => setModal("solvers")}>
              View All <Icon name="arrow" />
            </button>
          </div>
          <div className="tbl">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>User</th>
                  <th>Points</th>
                  <th>Solves</th>
                  <th>Badges</th>
                </tr>
              </thead>
              <tbody>
                {svRows.map((row) => (
                  <tr key={row.r}>
                    <td className="rank">{row.r}</td>
                    <td>
                      <span className="uname">
                        <span className="uav" style={{ background: `${row.c}2e`, color: row.c }}>
                          <Icon name={row.r === 1 ? "crown" : "user"} />
                        </span>
                        {row.n}
                      </span>
                    </td>
                    <td className="num">{row.p}</td>
                    <td className="num">{row.s}</td>
                    <td>
                      <span className="badges">
                        {BDG.slice(0, row.b).map(([bc, l]) => (
                          <i className="bdg" key={bc} style={{ background: bc }}>
                            {l}
                          </i>
                        ))}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <span className="card-title">Recent Teams</span>
            <button className="card-link" onClick={() => setModal("teams")}>
              View All <Icon name="arrow" />
            </button>
          </div>
          <div className="tbl">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Team</th>
                  <th>Members</th>
                  <th>Points</th>
                  <th>Joined</th>
                </tr>
              </thead>
              <tbody>
                {tmRows.map((row) => (
                  <tr key={row.r}>
                    <td className="rank">{row.r}</td>
                    <td>
                      <span className="uname">
                        <span className="uav" style={{ background: `${row.c}2e`, color: row.c }}>
                          <Icon name="users" />
                        </span>
                        {row.n}
                      </span>
                    </td>
                    <td className="num">{row.m}</td>
                    <td className="num">{row.p}</td>
                    <td className="num" style={{ color: "#8b86a8" }}>
                      {row.j}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="grid r5">
        <div className="card">
          <div className="card-head">
            <span className="card-title">System Status</span>
            <span className={`tag-live ${allOk ? "" : "bad"}`}>
              <i className="dot"></i>
              {allOk
                ? "All Systems Operational"
                : degraded > 0
                  ? `${degraded} Service${degraded === 1 ? "" : "s"} Degraded`
                  : "Checking…"}
            </span>
            <a className="card-link" href="#">
              View Details <Icon name="arrow" />
            </a>
          </div>
          <div className="tiles">
            {statusTiles.map((t) => (
              <div className="tile" key={t.key}>
                <span style={{ color: t.color }}>
                  <Icon name={t.icon} />
                </span>
                <div>
                  <div className="nm">{t.name}</div>
                  <div className="st">
                    <i
                      className="dot"
                      style={{
                        width: 5,
                        height: 5,
                        borderRadius: "50%",
                        background: t.ok ? "#4ade80" : "#f43f5e",
                      }}
                    ></i>
                    {t.ok ? "Online" : "Offline"}
                    <em className="tile-detail">{t.detail}</em>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <span className="card-title">Quick Actions</span>
          </div>
          <div className="tiles actions">
            {QA.map(([n, ic, c]) => (
              <button className="act" key={n}>
                <span style={{ color: c }}>
                  <Icon name={ic} />
                </span>
                <span>{n}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <span className="card-title">Storage &amp; Resources</span>
            <a className="card-link" href="#">
              Manage <Icon name="arrow" />
            </a>
          </div>
          <div className="stor">
            <div className="donut">
              <svg viewBox="0 0 100 100" style={{ width: "100%", height: "100%", transform: "rotate(-90deg)" }} ref={donutRef}></svg>
              <div className="pct" ref={pctRef}>–</div>
            </div>
            <div className="stor-info">
              <div className="tot">
                <span ref={usedRef}>–</span>{" "}
                <span style={{ fontWeight: 500, color: "#6f6a90", fontSize: 11 }} ref={capRef}>
                  / – GB
                </span>
              </div>
              <div className="sub">Used Storage</div>
              <div ref={legendRef}></div>
            </div>
          </div>
          <div className="stack" ref={stackRef}></div>
          <div className="res-row">
            <span>
              <i className="res-dot" style={{ background: "#22d3ee" }}></i>
              CPU
              <b>{res ? `${res.load1.toFixed(2)} · ${res.cpuCount} cores` : "–"}</b>
            </span>
            <span>
              <i className="res-dot" style={{ background: "#a855f7" }}></i>
              Memory
              <b>
                {res ? `${fmtGB(res.memoryUsedBytes)} / ${fmtGB(res.memoryTotalBytes)} GB (${memPct}%)` : "–"}
              </b>
            </span>
            <span>
              <i className="res-dot" style={{ background: "#22c55e" }}></i>
              API Process
              <b>{res ? `${fmtGB(res.processRssBytes)} RSS` : "–"}</b>
            </span>
          </div>
        </div>
      </section>

      {modal ? (
        <div className="overlay" onClick={() => setModal(null)}>
          <div
            className={modal === "map" ? "modal-card map-modal" : "modal-card"}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-head">
              <span className="modal-title">{modalTitle}</span>
              <span className="modal-sub">{modalCount} entries</span>
              <button className="modal-close" onClick={() => setModal(null)} aria-label="Close">
                <Icon name="close" />
              </button>
            </div>
            <div className={`modal-body ${modal === "map" ? "map-body" : ""}`}>
              {modal === "map" ? <WorldMap users={d.us} /> : null}
              {modal === "challenges" ? (
                <table>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Challenge</th>
                      <th>Category</th>
                      <th>Solves</th>
                      <th>Points</th>
                      <th>Difficulty</th>
                    </tr>
                  </thead>
                  <tbody>
                    {chAll.map(([r, n, c, s, p, d]) => {
                      const diff = d === "expert" ? "hard" : d;
                      const label =
                        d === "easy" || d === "medium"
                          ? cap(d)
                          : d === "expert"
                            ? "Expert"
                            : "Hard";
                      return (
                        <tr key={r}>
                          <td className="rank">{r}</td>
                          <td style={{ color: "#e9e6f7", fontWeight: 500 }}>{n}</td>
                          <td className="cat">{c}</td>
                          <td className="num">{s}</td>
                          <td className="num">{p}</td>
                          <td>
                            <span className={`chip ${diff}`}>{label}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : null}
              {modal === "solvers" ? (
                <table>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>User</th>
                      <th>Points</th>
                      <th>Solves</th>
                      <th>Badges</th>
                    </tr>
                  </thead>
                  <tbody>
                    {svAll.map((row) => (
                      <tr key={row.r}>
                        <td className="rank">{row.r}</td>
                        <td>
                          <span className="uname">
                            <span className="uav" style={{ background: `${row.c}2e`, color: row.c }}>
                              <Icon name={row.r === 1 ? "crown" : "user"} />
                            </span>
                            {row.n}
                          </span>
                        </td>
                        <td className="num">{row.p}</td>
                        <td className="num">{row.s}</td>
                        <td>
                          <span className="badges">
                            {BDG.slice(0, row.b).map(([bc, l]) => (
                              <i className="bdg" key={bc} style={{ background: bc }}>
                                {l}
                              </i>
                            ))}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : null}
              {modal === "teams" ? (
                <table>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Team</th>
                      <th>Members</th>
                      <th>Points</th>
                      <th>Joined</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tmAll.map((row) => (
                      <tr key={row.r}>
                        <td className="rank">{row.r}</td>
                        <td>
                          <span className="uname">
                            <span className="uav" style={{ background: `${row.c}2e`, color: row.c }}>
                              <Icon name="users" />
                            </span>
                            {row.n}
                          </span>
                        </td>
                        <td className="num">{row.m}</td>
                        <td className="num">{row.p}</td>
                        <td className="num" style={{ color: "#8b86a8" }}>
                          {row.j}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}