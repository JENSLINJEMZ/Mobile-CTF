import { QUOTE_BG } from "./icons";

export function QuoteCard() {
  return (
    <div className="quote-card">
      <div
        className="quote-card-bg"
        aria-hidden="true"
        dangerouslySetInnerHTML={{ __html: QUOTE_BG }}
      />
      <div className="quote-text">&ldquo;Small settings.&rdquo;</div>
      <div className="quote-sub">Big impact.&rdquo;</div>
    </div>
  );
}