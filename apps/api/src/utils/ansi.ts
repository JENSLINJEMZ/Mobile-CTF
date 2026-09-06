const ANSI_ESCAPE =
  // eslint-disable-next-line no-control-regex
  /[\u001b\u009b][[\]()#;?]*(?:(?:(?:(?:;[-a-zA-Z\d/#&.:=?%@~_]+)*|[a-zA-Z\d]+(?:;[-a-zA-Z\d/#&.:=?%@~_]*)*)?\u0007)|(?:(?:\d{1,4}(?:[;:]\d{0,4})*)?[\dA-PR-TZcf-nq-uy=><~]))/g;

const NON_PRINTABLE =
  // eslint-disable-next-line no-control-regex
  /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g;

/**
 * Strips ANSI escape sequences and stray control characters from shell output
 * before it is relayed to mobile clients (which render plain text only).
 */
export function stripAnsi(input: string, maxLength = Infinity): string {
  const clean = input.replace(ANSI_ESCAPE, "").replace(NON_PRINTABLE, "");
  if (clean.length <= maxLength) return clean;
  return clean.slice(clean.length - maxLength);
}
