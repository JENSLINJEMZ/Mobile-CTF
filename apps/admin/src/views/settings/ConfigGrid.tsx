import {
  BELL_ICON,
  BOX_ICON,
  CARD_ICON,
  CHEVRON_ICON,
  FLAG_ICON,
  SHIELD_ICON,
  SUN_ICON,
  USERS_ICON,
} from "./icons";

type Target = { view: string } | null;

const CARDS: Array<{
  cls: string;
  title: string;
  desc: string;
  icon: string;
  target: Target;
}> = [
  {
    cls: "security",
    title: "Security",
    desc: "Authentication, access control, and security policies.",
    icon: SHIELD_ICON,
    target: { view: "Audit Log" },
  },
  {
    cls: "users",
    title: "Users & Teams",
    desc: "Manage registration, roles, and team settings.",
    icon: USERS_ICON,
    target: { view: "Users" },
  },
  {
    cls: "challenges",
    title: "Challenges",
    desc: "Configure challenge settings, scoring, and categories.",
    icon: FLAG_ICON,
    target: { view: "Challenges" },
  },
  {
    cls: "sandbox",
    title: "Sandbox",
    desc: "Manage container limits, resource allocation, and policies.",
    icon: BOX_ICON,
    target: { view: "Sandbox Manager" },
  },
  {
    cls: "payments",
    title: "Payments",
    desc: "Set up payment gateways, plans, and subscriptions.",
    icon: CARD_ICON,
    target: null,
  },
  {
    cls: "notifications",
    title: "Notifications",
    desc: "Configure email, in-app, and webhook notifications.",
    icon: BELL_ICON,
    target: null,
  },
  {
    cls: "appearance",
    title: "Appearance",
    desc: "Customize themes, colors, branding, and UI.",
    icon: SUN_ICON,
    target: null,
  },
  {
    cls: "advanced",
    title: "Advanced",
    desc: "API keys, integrations, and advanced options.",
    icon: SUN_ICON,
    target: null,
  },
];

export function ConfigGrid({
  onNavigate,
}: {
  onNavigate?: (view: string) => void;
}) {
  return (
    <div className="config-grid">
      {CARDS.map((card) => {
        const target = card.target;
        const wired = target !== null;
        const view = target ? target.view : "";
        return (
          <div
            key={card.title}
            className={`config-card ${card.cls}`}
            role={wired ? "button" : undefined}
            tabIndex={wired ? 0 : undefined}
            title={target ? `Open ${view}` : "Not wired in this build"}
            onClick={() => {
              if (target && onNavigate) onNavigate(view);
            }}
            onKeyDown={(e) => {
              if (target && onNavigate && e.key === "Enter") onNavigate(view);
            }}
          >
            <span className="config-card-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={{ __html: card.icon }} />
            </span>
            <div className="config-card-title">{card.title}</div>
            <div className="config-card-desc">{card.desc}</div>
            <span className="config-card-link">
              {wired ? "Configure" : "Not wired"}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={{ __html: CHEVRON_ICON }} />
            </span>
          </div>
        );
      })}
    </div>
  );
}