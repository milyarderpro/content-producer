// CR-047: the MCP source contract permits omission; the SQL evidence validator
// requires these keys to exist, accepting explicit null for unknown metadata.
// Never manufacture publication dates or alter caller-provided values.
export function materializeMissingSourceNulls<
  T extends {
    sources: {
      published_at?: string | null;
      updated_at?: string | null;
      as_of?: string | null;
    }[];
  },
>(facts: T[]) {
  return facts.map((fact) => ({
    ...fact,
    sources: fact.sources.map((source) => ({
      ...source,
      ...(!Object.hasOwn(source, 'published_at') ? { published_at: null } : {}),
      ...(!Object.hasOwn(source, 'updated_at') ? { updated_at: null } : {}),
      ...(!Object.hasOwn(source, 'as_of') ? { as_of: null } : {}),
    })),
  }));
}
