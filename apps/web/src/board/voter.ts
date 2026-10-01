/**
 * This browser's part in the leaderboard (ADR-0044): a random code, made the first time its owner
 * votes or reports and never before, and the votes and reports it has made, so the pages can show
 * them. It is kept in this browser alone; the server keeps only a hash of the code.
 */
const KEY = 'btc.voter.v1';

interface Saved {
  code: string;
  votes: Record<string, 1 | -1>;
  reports: string[];
}

function read(): Saved | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw) as Partial<Saved>;
    if (typeof saved.code !== 'string' || !/^[A-Za-z0-9_-]{16,64}$/.test(saved.code)) return null;
    return {
      code: saved.code,
      votes: typeof saved.votes === 'object' && saved.votes ? saved.votes : {},
      reports: Array.isArray(saved.reports) ? saved.reports : [],
    };
  } catch {
    return null;
  }
}

function write(saved: Saved): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(saved));
  } catch {
    // Storage blocked: the vote still counts, but this browser will not remember it.
  }
}

/** A new code: 18 random bytes, written safely for a link. */
function newCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(18));
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/** This browser's code, made now if it has none. Only a vote or a report asks for it. */
export function deviceCode(): string {
  const saved = read();
  if (saved) return saved.code;
  const code = newCode();
  write({ code, votes: {}, reports: [] });
  return code;
}

/** How this browser voted on an entry: for, against, or not at all. */
export function myVote(id: string): 1 | -1 | 0 {
  return read()?.votes[id] ?? 0;
}

export function rememberVote(id: string, value: 1 | -1 | 0): void {
  const saved = read();
  if (!saved) return;
  if (value === 0) delete saved.votes[id];
  else saved.votes[id] = value;
  write(saved);
}

export function hasReported(id: string): boolean {
  return read()?.reports.includes(id) ?? false;
}

export function rememberReport(id: string): void {
  const saved = read();
  if (!saved || saved.reports.includes(id)) return;
  write({ ...saved, reports: [...saved.reports, id] });
}
