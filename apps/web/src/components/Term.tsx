import { glossary } from '../data';

/**
 * A glossary word in running text: the definition on hover, and listed under "Words on this page"
 * for touch and for screen readers, which do not read a tooltip.
 */
export function Term({ id, children }: { id: string; children: string }) {
  const def = glossary.terms[id];
  if (!def) return <>{children}</>;
  return (
    <abbr className="term" title={def.short}>
      {children}
    </abbr>
  );
}
