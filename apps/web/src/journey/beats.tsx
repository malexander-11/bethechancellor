import { FINAL_STAGE, type JourneyStep } from '@btc/engine';
import {
  Children,
  cloneElement,
  createContext,
  isValidElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';
import { useLocation } from 'react-router-dom';

/**
 * A step arrives in beats: an adviser hands you something, you deal with it, you continue.
 *
 * Two rules keep this from being a wizard. Beats **accumulate** rather than replace, so a
 * briefing's source links stay on the page after you move past it; and the beat index never
 * touches the URL, because the query string means one thing only, a budget.
 */

const STORAGE_KEY = 'btc.beats.v1';

type Progress = Partial<Record<JourneyStep, number>>;

function read(): Progress {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Progress) : {};
  } catch {
    // Private browsing, blocked storage, or nonsense in the key: start from the beginning.
    return {};
  }
}

function write(progress: Progress): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // Not being able to remember where you were is not worth breaking the page over.
  }
}

interface BeatsValue {
  progress: Progress;
  /** True when every beat should be open at once: a shared budget, or the ceremony turned off. */
  openAll: boolean;
  reach: (step: JourneyStep, beat: number) => void;
  ceremony: boolean;
  setCeremony: (on: boolean) => void;
}

const BeatsContext = createContext<BeatsValue | null>(null);

const CEREMONY_KEY = 'btc.ceremony.v1';

/**
 * A link that carries a *finished* Budget opens everything at once. Someone sharing it means
 * "look at this", not "sit through the introduction".
 *
 * A game in progress is different: its URL carries levers from stage 1 onwards, and if that
 * alone opened every beat, a reload after choosing an outlook would spoil the envelope and the
 * reactions. So when the link carries a game (`g=`), only one that has reached the close opens
 * all; otherwise beats follow the stored progress. A link with no game is a sandbox Budget and
 * keeps the old rule.
 */
export function opensEverything(search: string): boolean {
  const params = new URLSearchParams(search);
  const game = params.get('g');
  if (game !== null) {
    const st = game.split('_').find((item) => item.startsWith('st.'));
    return st !== undefined && Number(st.slice(3)) >= FINAL_STAGE;
  }
  return params.has('L') || params.has('M') || params.has('o');
}

/** Forget how far every step got. "Start again" means from the top. */
export function resetProgress(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing stored, nothing to forget.
  }
}

export function BeatsProvider({ children }: { children: ReactNode }) {
  const { search } = useLocation();
  const [progress, setProgress] = useState<Progress>(() => read());
  const [ceremony, setCeremonyState] = useState<boolean>(() => {
    try {
      return window.localStorage.getItem(CEREMONY_KEY) !== 'off';
    } catch {
      return true;
    }
  });
  // Captured once: your own first edit adds levers to the URL, and that must not retro-skip
  // the beats of the step you are standing in.
  const arrived = useRef(opensEverything(search));

  const reach = useCallback((step: JourneyStep, beat: number) => {
    setProgress((prev) => {
      if ((prev[step] ?? 0) >= beat) return prev;
      const next = { ...prev, [step]: beat };
      write(next);
      return next;
    });
  }, []);

  const setCeremony = useCallback((on: boolean) => {
    setCeremonyState(on);
    try {
      window.localStorage.setItem(CEREMONY_KEY, on ? 'on' : 'off');
    } catch {
      // As above.
    }
  }, []);

  const value = useMemo(
    () => ({ progress, openAll: arrived.current || !ceremony, reach, ceremony, setCeremony }),
    [progress, ceremony, reach, setCeremony],
  );
  return <BeatsContext.Provider value={value}>{children}</BeatsContext.Provider>;
}

export function useCeremony(): { ceremony: boolean; setCeremony: (on: boolean) => void } {
  const ctx = useContext(BeatsContext);
  return {
    ceremony: ctx?.ceremony ?? true,
    setCeremony: ctx?.setCeremony ?? (() => undefined),
  };
}

interface BeatProps {
  title: string;
  /** What the button says. "Continue" is the default and the accessible name always contains it. */
  continueLabel?: string;
  /**
   * Fold this beat away once it is behind you. Its contents, and so its citations, stay in the
   * document and one click away; they just stop burying the surface you are working on.
   */
  foldWhenPast?: string;
  children: ReactNode;
  /** Hold the continue button until a choice is made, and say what is missing. */
  continueDisabled?: boolean;
  continueHint?: string;
  /* Supplied by <Beats>; never set these by hand. */
  index?: number;
  live?: boolean;
  advance?: () => void;
  autoFocus?: boolean;
}

export function Beat({
  title,
  continueLabel,
  foldWhenPast,
  children,
  continueDisabled = false,
  continueHint,
  index = 0,
  live = false,
  advance,
  autoFocus = false,
}: BeatProps) {
  const ref = useRef<HTMLElement>(null);
  const headingId = `beat-${index}-heading`;

  useEffect(() => {
    const node = ref.current;
    if (!autoFocus || !node) return;
    // Focus the section rather than a control inside it: the section announces its own name,
    // and landing on the first of fifty sliders tells a screen-reader user nothing.
    node.focus({ preventScroll: true });
    if (typeof node.scrollIntoView !== 'function') return;
    const reduced =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // The CSS reset covers scroll-behavior but not a scroll asked for in JavaScript.
    node.scrollIntoView({ block: 'start', behavior: reduced ? 'auto' : 'smooth' });
  }, [autoFocus]);

  const past = foldWhenPast !== undefined && !live && advance === undefined;
  const body = past ? (
    <details className="beat--past-summary">
      <summary>{foldWhenPast}</summary>
      {children}
    </details>
  ) : (
    children
  );

  return (
    <section
      ref={ref}
      tabIndex={-1}
      aria-labelledby={headingId}
      className={`beat${autoFocus ? ' beat--entering' : ''}`}
    >
      <h2 id={headingId} className="sr-only">
        {title}
      </h2>
      {body}
      {live && advance ? (
        <p className="beat__continue">
          <button
            type="button"
            className="btn btn--primary"
            onClick={advance}
            disabled={continueDisabled}
            aria-describedby={continueDisabled && continueHint ? `${headingId}-hint` : undefined}
          >
            {continueLabel ? `${continueLabel} · Continue` : 'Continue'}
          </button>
          {continueDisabled && continueHint ? (
            <span id={`${headingId}-hint`} className="beat__hint">
              {continueHint}
            </span>
          ) : null}
        </p>
      ) : null}
    </section>
  );
}

/**
 * Wraps a step's beats. Renders beats nought to the live one; anything below is not in the
 * document at all, which is what makes the gate real rather than a CSS trick.
 */
export function Beats({ step, children }: { step: JourneyStep; children: ReactNode }) {
  const ctx = useContext(BeatsContext);
  const items = Children.toArray(children).filter(isValidElement) as ReactElement<BeatProps>[];
  const last = items.length - 1;
  const reached = Math.min(ctx?.progress[step] ?? 0, last);
  const live = ctx?.openAll ? last : reached;
  // Only steal focus for a move the reader asked for, never on first paint.
  const [focusBeat, setFocusBeat] = useState<number | null>(null);

  const advance = useCallback(() => {
    const next = Math.min(reached + 1, last);
    ctx?.reach(step, next);
    setFocusBeat(next);
  }, [ctx, step, reached, last]);

  return (
    <>
      {items.slice(0, live + 1).map((child, i) =>
        cloneElement(child, {
          key: i,
          index: i,
          live: i === live && i < last,
          advance: i === live ? advance : undefined,
          autoFocus: focusBeat === i,
        }),
      )}
    </>
  );
}
