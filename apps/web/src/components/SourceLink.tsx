import type { SourceRef } from '@btc/engine';
import { Fragment } from 'react';
import { sourcesById } from '../data';
import { useWorkings } from '../journey/workings';

/** One citation. Nothing at all while the workings are put away. */
export function SourceLink({ ref: sourceRef }: { ref: SourceRef }) {
  const workings = useWorkings();
  if (!workings) return null;
  const doc = sourcesById.get(sourceRef.sourceId);
  if (!doc) return <span className="source">{sourceRef.sourceId}</span>;
  const where = [
    sourceRef.table,
    sourceRef.paragraph ? `para ${sourceRef.paragraph}` : undefined,
    sourceRef.page ? `p. ${sourceRef.page}` : undefined,
  ]
    .filter(Boolean)
    .join(', ');
  return (
    <span className="source">
      <a href={doc.landingUrl ?? doc.url} rel="noreferrer">
        {doc.org}, {doc.title}
      </a>
      {where ? ` (${where})` : ''}
      {sourceRef.quote ? <> &mdash; &ldquo;{sourceRef.quote}&rdquo;</> : null}
    </span>
  );
}

/**
 * A row of citations under a line of text, or nothing at all: no empty row is left behind when
 * the workings are put away, and nothing is rendered for a line that cites nothing.
 */
export function SourceList({
  refs,
  as: Tag = 'p',
  className = 'spoken__sources',
}: {
  refs: readonly SourceRef[];
  /** The wrapper element: a paragraph by default, a span inside running text. */
  as?: 'p' | 'span' | 'div';
  className?: string;
}) {
  const workings = useWorkings();
  if (!workings || refs.length === 0) return null;
  return (
    <Tag className={className}>
      {refs.map((s, i) => (
        <Fragment key={i}>
          {i > 0 ? ' ' : ''}
          <SourceLink ref={s} />
        </Fragment>
      ))}
    </Tag>
  );
}
