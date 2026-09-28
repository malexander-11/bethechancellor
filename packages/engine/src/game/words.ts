/** "a, b and c" */
export function inWords(items: readonly string[]): string {
  if (items.length <= 1) return items[0] ?? '';
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

/**
 * Groups by their labels in one phrase (Phase 25): "business and motorists", but "everyone who
 * earns or spends, as well as motorists" when a label is a phrase of its own, so a list never
 * reads as "patients and the NHS and defence".
 */
export function groupsInWords(labels: readonly string[]): string {
  if (labels.length <= 1) return labels[0] ?? '';
  if (labels.every((l) => l.split(/\s+/).length <= 2)) return inWords(labels);
  return `${labels.slice(0, -1).join(', ')}, as well as ${labels[labels.length - 1]}`;
}

export function lowerFirst(text: string): string {
  return text.charAt(0).toLowerCase() + text.slice(1);
}
