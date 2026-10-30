/**
 * What a promise is called on a tag (Phase 25): "the manifesto" only for the 2024 manifesto's own
 * words, scored as such; "a promise" for a commitment made since, or a strain scored by nobody.
 */
export function promiseWords(r: { manifesto?: boolean; scored?: boolean | undefined }): {
  noun: string;
  label: string;
} {
  const manifesto = r.manifesto !== false && r.scored !== false;
  return manifesto
    ? { noun: 'the manifesto', label: 'Manifesto' }
    : { noun: 'a promise', label: 'Promise' };
}
