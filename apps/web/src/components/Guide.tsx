import { STEP_COUNT, segments, termsFor, type JourneyStep } from '@btc/engine';
import { Fragment } from 'react';
import { glossary, guideFor } from '../data';
import { SourceList } from './SourceLink';

/** A glossary word in running text: the definition on hover, and listed beneath for touch. */
function Term({ id, children }: { id: string; children: string }) {
  const def = glossary.terms[id];
  if (!def) return <>{children}</>;
  return (
    <abbr className="term" title={def.short}>
      {children}
    </abbr>
  );
}

function Marked({ text }: { text: string }) {
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
 * The guide strip at the top of every step: which step this is, what you are doing, why it
 * matters and what to do now, written for someone clever who does not follow politics. It is
 * chrome, like the dateline: no badge, and no figure that is not sourced (guide.test.ts).
 */
export function Guide({ step }: { step: JourneyStep }) {
  const stage = guideFor(step);
  if (!stage) return null;
  const terms = termsFor(glossary, stage);
  return (
    <header className="guide doc">
      <p className="kicker guide__kicker">
        Step {stage.number} of {STEP_COUNT}
      </p>
      <h1 className="page-title">{stage.title}</h1>
      <dl className="guide__lines">
        <div className="guide__line">
          <dt>What you’re doing</dt>
          <dd>
            <Marked text={stage.doing} />
          </dd>
        </div>
        <div className="guide__line">
          <dt>Why it matters</dt>
          <dd>
            <Marked text={stage.why} />
          </dd>
        </div>
        <div className="guide__line guide__line--now">
          <dt>Do now</dt>
          <dd>
            <Marked text={stage.now} />
          </dd>
        </div>
      </dl>
      {terms.length > 0 ? (
        <details className="guide__terms">
          <summary>Words on this page</summary>
          <dl>
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
        </details>
      ) : null}
    </header>
  );
}
