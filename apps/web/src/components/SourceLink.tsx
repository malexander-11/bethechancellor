import type { SourceRef } from '@btc/engine';
import { sourcesById } from '../data';

export function SourceLink({ ref: sourceRef }: { ref: SourceRef }) {
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
