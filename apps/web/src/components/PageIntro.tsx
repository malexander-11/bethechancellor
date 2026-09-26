import { STEP_COUNT, segments, termsFor, type JourneyStep } from '@btc/engine';
import { Fragment, type ReactNode } from 'react';
import { glossary, guideFor } from '../data';
import { usePageTitle } from '../journey/title';
import type { SubStep } from './Progress';
import { SourceList } from './SourceLink';
import { Term } from './Term';

export function Marked({ text }: { text: string }) {
  return (
    <>
      {segments(text).map((s, i) =>
        s.kind === 'text' ? (
          <Fragment key={i}>{s.text}</Fragment>
        ) : (
          <Term key={i} id={s.id}>
            {s.text}
          </Term>
        ),
      )}
    </>
  );
}

/**
 * The head of every screen: one heading, one line saying what to do, and "Why this matters"
 * folded beneath for anyone who wants the reason and the words. The copy is the guide's
 * (data/journey/guide.json): chrome, with no badge and no figure that is not sourced. A page may
 * put its own heading and line in front of the guide's, when the screen is one of several in a
 * step and has a name of its own.
 */
export function PageIntro({
  step,
  part,
  title,
  lead,
  tabTitle,
  children,
}: {
  step: JourneyStep;
  /** Which screen of a multi-screen step this is; the browser tab names it. */
  part?: SubStep;
  /** The heading, when it is not the guide's title for the step. */
  title?: ReactNode;
  /** The one line under it, when it is not the guide's "do now". */
  lead?: ReactNode;
  /** What the browser tab says, when the heading is a node rather than words. */
  tabTitle?: string;
  /** Anything else that belongs in the head: a sub-step's own note. */
  children?: ReactNode;
}) {
  const stage = guideFor(step);
  const own = tabTitle ?? (typeof title === 'string' ? title : stage?.title);
  const plainTitle = own && part && !tabTitle ? `${own.replace(/\.$/, '')} (${part.label})` : own;
  usePageTitle(
    stage && plainTitle
      ? `${plainTitle.replace(/\.$/, '')} · Step ${stage.number} of ${STEP_COUNT}`
      : plainTitle,
  );
  if (!stage) return null;
  const terms = termsFor(glossary, stage);
  return (
    <header className="intro">
      <h1 className="intro__title">{title ?? stage.title}</h1>
      <p className="intro__lead">{lead ?? <Marked text={stage.now} />}</p>
      {children}
      <details className="more">
        <summary>Why this matters</summary>
        <div className="more__body">
          <p>
            <Marked text={stage.doing} />
          </p>
          <p>
            <Marked text={stage.why} />
          </p>
          {terms.length > 0 ? (
            <dl className="intro__terms">
              {terms.map(({ id, term }) => (
                <div key={id}>
                  <dt>{term.term}</dt>
                  <dd>
                    {term.short}
                    <SourceList as="span" className="briefing__sources" refs={term.sources} />
                  </dd>
                </div>
              ))}
            </dl>
          ) : null}
        </div>
      </details>
    </header>
  );
}
