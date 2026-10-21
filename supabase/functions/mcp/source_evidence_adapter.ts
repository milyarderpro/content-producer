// CR-047: the MCP source contract permits omission; the SQL evidence validator
// requires these keys to exist, accepting explicit null for unknown metadata.
// Never manufacture publication dates or alter caller-provided values.
export function materializeMissingSourceNulls<T extends { sources: object[] }>(facts: T[]) {
  return facts.map((fact) => ({
    ...fact,
    sources: fact.sources.map((source) => {
      const completed: Record<string, unknown> = { ...source };
      for (const key of ['published_at', 'updated_at', 'as_of']) {
        if (!Object.hasOwn(completed, key)) completed[key] = null;
      }
      return completed;
    }),
  }));
}
