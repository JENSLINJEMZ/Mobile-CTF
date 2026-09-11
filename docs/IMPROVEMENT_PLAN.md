# Mobile CTF — Professionalization & Feature Plan

> Companion to `MEMORY.md` (build memory) and `mobile_CTF.md` (architecture spec).
> This is the **design + feature roadmap**. Every phase below is derived from how
> professional consumer apps (WhatsApp, Telegram, HackTheBox) structure their UI,
> theming, and feature surfaces — then translated to this codebase's seams.

---

## 1. Design references (codex)

| App | What we borrow | How it maps here |
| --- | --- | --- |
| **WhatsApp** | Flat, shadowless surfaces; single accent (green) carrying all CTAs; calm restraint; "depth via bg contrast, never elevation"; generous section padding (16/32/56/88px rhythm); no warm colors on interactive elements | Already our solid redesign base. Extend the token discipline: one accent family for actions, semantic colors only for status. |
| **Telegram** | 200+ color properties organized **by UI surface**, not "generic colors"; badge system (unread counts, accent badges on nav); large-title headers; grouped settings screens w/ section headers + footers; bottom sheets / toasts / context menus; segmented controls for tabs-in-a-tab (Calls/Chats/Contacts↔Global/Daily/Weekly) | Mirror: our `theme.ts` becomes surface-scoped (`header.*`, `tabBar.*`, `list.*`, `card.*`, `badge.*`). Add unread badge on the Notifications tab. Converge leaderboard tabs + event status into a shared `SegmentedControl`. |
| **HackTheBox** | Challenge list cards with difficulty dot + points + solves count; dark canvas with lime-green accent; "Machine/Challenge" entry rows; live scoreboard; search filters; "active"/"user-owned" state on every row | Our challenge cards already do this. Add **solve-count on card**, **"first blood" chip**, **points decay on solved**, **owned machine indicator**. |
| **Material/Apple HIG** (baseline) | 48dp touch targets, contrast ≥4.5:1, reduced-motion, focus states, empty-state illustrations | Keep enforcing; gaps flagged below (e.g., tab labels, offline pills). |

**Ground rule (from both CTF platforms + Telegram):**
> Depth is communicated with **background contrast** — never shadows, never elevation,
> never translucency. One accent for action, semantic colors for meaning.

---

## 2. Current state recap (baseline = committed `99dedd4`)

- **Screens (8 tabs):** Challenges (search/category filters/pagination), Terminal (live SSH-ish sessions), Events (list + detail w/ announcement carousel), Leaderboard (global/daily/weekly tabs + empty state), Notes (offline-first), Toolkit (encoding/cyphers/JWT/files), Notifications (auth-gated, push toggle), Profile (stats/achievements/bookmarks/logout). Plus auth login/register, challenge/[id], event/[id], note/[key], teams screen.
- **Design system:** solid flat tokens (dark `#10141c`/accent `#9FEF00`), `Surface`/`Input` primitives, per-screen header bar + hairline separator, 8-tab bar with labels (fixed in UI audit).
- **Backend:** full CTF engine — auth, challenges, solves w/ idempotency, leaderboard socket, events/achievements, notes, terminal w/ sandboxed containers, teams, notifications w/ Expo push, admin.
- **Tests:** 18/18 vitest. tsc/eslint clean.

---

## 3. Phase plan

### Phase 0 — Design system hardening (foundation; do first)
Everything downstream depends on token discipline.

1. **Surface-scoped theme tokens** (Telegram's `PresentationTheme` pattern)
   - Restructure `theme.ts`: keep flat colors but introduce grouped namespaces the components actually consume:
     - `header.bg / .title / .subtitle / .bottomBorder`
     - `tabBar.bg / .iconActive / .iconInactive / .label / .activeIndicator`
     - `list.cellBg / .separator / .groupHeader / .groupFooter`
     - `badge.bg / .fg` (notifications count)
     - `input.bg / .placeholder / .value / .focusBorder`
     - `card.bg / .border / .title / .meta`
   - Migration = mechanical (`useTheme()` returns the flat view still, so screens barely change; components read namespaced tokens).
2. **Component library completion**
   - `SegmentedControl` (leaderboard tabs + events status + notes filter). Telegram-style, animated active pill.
   - `Badge` (unread counter; pill with accent bg).
   - `Toast` (ephemeral, top-stacked under header bar — replaces ad-hoc `Alert.alert` for non-blocking feedback).
   - `BottomSheet` (esp. for "Share this challenge", "Export note", confirm signs-outs).
   - `EmptyState` w/ optional illustration + `CTA` action (WhatsApp/HTB empty states invite an action).
   - `Skeleton` loading rows for lists (professional feel vs. spin).
3. **Spacing & rhythm** — adopt a strict 4px scale (`Spacing` already tokenized); enforce section padding 16/24/32 on `ScreenShell`; verify zero hardcoded hex remains (grep gate in CI).
4. **Motion**
   - Screen transitions (fade/slide) + `useReduceMotion` respected in component lib (press scale already gated).
   - Layout: `LayoutAnimation` on open/close of note editor, expandable challenge rows.

### Phase 1 — Navigation / shell polish
1. **Unread badge on Notifications tab icon** — driven by existing unread store + socket; accent dot with count.
2. **Large-title headers** (Telegram iOS style) on Challenges/Leaderboard/Notes: header collapses to small on scroll.
3. **Header search integration** — challenges search bar moves under a large title; add a global "search" entry in header (challenges, users, teams).
4. **Tab-agnostic "Sign in" interstitial** — a shared `SignInPrompt` surface (used by notifications already) reused consistently across all gated screens (leaderboard currently shows a raw hint; unify).
5. **Sticky contextual action** — e.g. FAB on Challenges ("Scan flag"?), Notes keep existing FAB; standardize FAB component.

### Phase 2 — Challenge experience (HackTheBox parity)
1. **Challenges list**
   - Card body: add `solveCount` ("⌖ 24 solves") + relative-solves %, first-blood crown/star chip.
   - Keep flat card `Surface` but add **left difficulty band** (4px accent strip) instead of the tiny dot — HTB-like row energy without shadows.
   - "Unsolved/Solved" filter chips + "My solved" quick toggle; solved cards dim slightly with ✓.
2. **Challenge detail (`/challenge/[id]`)**
   - Add **flag attempt inline card** with idempotent submit, offline queuing UI ("Will submit when online" pill), cooldown/lockout messaging, "Already solved — score won't change" note.
   - Add **hints section** (progressive hint cost; gated by points).
   - Add **attachments/files list** from API; **related challenges**.
   - Add **author + "Difficulty/⏱ /☁"** meta strip.
3. **Solves read model** — ensure challenge cards show live solves count/rank updates when leaderboard socket emits (single source: solve pipeline → EventLeaderboard).

### Phase 3 — Terminal upgrade
1. **Persistence + history** — session history list on Terminal screen (recent runs with exit code), resume/re-run actions; input history (↑/↓).
2. **Typing affordances** — blinking cursor, monospaced font already (`Fonts.mono`), line wrap, quick-command chips (popular tools), `Ctrl+C` long-press.
3. **Session lifecycle UX** — idle timer countdown before sandbox expiry, "extend", graceful disconnect banner (reconnect w/ reassembly — already built server-side).
4. **Output actions** — tap-to-copy line, "copy last command output", clear button.

### Phase 4 — Social / community (Telegram/HTB spirit)
1. **Teams** — full team screen: roster, invites (accept/reject), team leaderboard view, team per-user score breakdown; entry from Profile + header.
2. **Profile upgrade**
   - User stats header card (rank, score, solves, first-blood count) from leaderboard + achievements read models.
   - Achievements gallery w/ earned/locked states (icons, progress bars).
   - Bookmarks list (exists server-side) as a real sub-screen; **"Share challenge"** via `Share.share()` + link.
   - Activity feed tab (recent solves, "joined", first bloods) — new read model.
3. **Events** — RSVP/attendance on events; live "happening now" pulse on event rows (socket-driven); leaderboard-at-event view.
4. **Notifications** — group by day; deep-link into challenge/event/team on tap (router push instead of static read).

### Phase 5 — Offline-first & reliability (already partially built — harden)
1. **Notes** — full CRUD offline (already), add conflict version, "synced just now" timestamp in toolbar, multiline FAB.
2. **Offline queue visibility** — global banner already exists; add per-screen inline "queued" chips on challenge detail when a submission is pending; show count in Profile.
3. **Cache** — challenge list/categories + events cached in AsyncStorage (read-through), so first paint is instant; `useLoadable` gets `cacheKey` param.
4. **Retry UX** — standardize `ErrorState` w/ retry + "offline" variant everywhere behind `useLoadable`.

### Phase 6 — Admin-ish & power features (if product wants)
1. **Charts** — solve-rate per challenge, user heatmap (Telegram `TelegramChannelStatsGrid` pattern) in Profile/Teams.
2. **Search everywhere** — global search screen (users/teams/challenges/events).
3. **Appearance settings** — in-app theme toggle (system/light/dark) + accent choice (HTB-like presets), persisted — teaches the surface-scoped token system.
4. **i18n** — string table (`PresentationStrings` pattern) so future languages slot in.

---

## 4. Feature backlog (ranked, not yet phased)

| # | Feature | Why | Effort |
| --- | --- | --- | --- |
| 1 | Unread badge on tab | Instant "something happened" (Telegram) | S |
| 2 | Solve count + first-blood chip on challenge cards | Competitive pull (HTB) | S |
| 3 | Segmented control (leaderboard/events/notes filters) | Consistent tab-in-tab pattern | M |
| 4 | Skeleton loader for lists | Polish, perceived perf | S |
| 5 | Toast + BottomSheet components | Replaces Alert spam, professional | M |
| 6 | Large-title collapsible headers | Modern iOS/Telegram feel | M |
| 7 | Challenge detail: hints, attachments, related | Completes the "problem set" | M |
| 8 | Terminal quick-commands + history | Power tool feel | M |
| 9 | Profile activity feed | Social proof | M |
| 10 | Global search screen | Power feature | L |

---

## 5. Non-goals / guardrails (cite in reviews)
- Client NEVER authoritative for scores/flags/ranks — all new read models come from server write-sides (solve pipeline → EventLeaderboard, achievements service).
- No shadows/glows/translucency — stays flat per borrowed design languages.
- Keep the HTTP route as dispatcher; all new logic lands in services, not screens.
- Offline stays provisional until server validates (no double-score: idempotency key already).
- No real exploitation content — benign fictional seed content only.

---

## 6. First execution slice (what to build right after this doc is approved)
Do **Phase 0 (1–2) + the S-effort backlog** first:
1. `Badge` component + unread badge on Notifications tab (S).
2. `SegmentedControl` component; migrate leaderboard Global/Daily/Weekly + events status (M).
3. Solve count + first-blood chip on challenge cards (S; requires solves read model in `listChallenges` DTO — add `solveCount`/`firstBloodUserId` from EventLeaderboard).
4. `Toast` component (S).
5. Skeleton list loader (S).

Verification gate after each: `tsc --noEmit`, `eslint src`, `vitest run` (18 → growing), device screenshot via existing uiautomator/pixel-audit flow, update `MEMORY.md`.