// Equivalent wire representation: local references only, no dropped constraints.
// SDK union wrappers are closed by enumerating the union of their branch keys.
export function closeUnionWrapper(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(closeUnionWrapper);
  if (!value || typeof value !== 'object') return value;
  const result = Object.fromEntries(Object.entries(value).map(([k, v]) => [k, closeUnionWrapper(v)]));
  if (result.type === 'object' && result.additionalProperties === undefined &&
    Array.isArray(result.anyOf) && result.anyOf.every((b) =>
      b && typeof b === 'object' && b.type === 'object' && b.additionalProperties === false)) {
    result.properties = Object.fromEntries(result.anyOf.flatMap((b) =>
      Object.keys(b.properties ?? {}).map((k) => [k, {}])));
    result.additionalProperties = false;
  }
  return result;
}

export function compactCatalogSchema(value: unknown): unknown {
  const root = closeUnionWrapper(value);
  const counts = new Map<string, number>();
  const visit = (v: unknown) => {
    if (!v || typeof v !== 'object') return;
    if (!Array.isArray(v)) {
      const key = JSON.stringify(v);
      if (key.length >= 60) counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    Object.values(v).forEach(visit);
  };
  visit(root);
  const names = new Map<string, string>();
  const defs: Record<string, unknown> = {};
  const encode = (v: unknown, top = false): unknown => {
    if (!v || typeof v !== 'object') return v;
    if (Array.isArray(v)) return v.map((e) => encode(e));
    const key = JSON.stringify(v);
    if (!top && (counts.get(key) ?? 0) > 1) {
      let name = names.get(key);
      if (!name) {
        name = 's' + names.size;
        names.set(key, name);
        defs[name] = encode(v, true);
      }
      return { $ref: '#/$defs/' + name };
    }
    return Object.fromEntries(Object.entries(v).map(([k, e]) => [k,
      ['properties', '$defs', 'patternProperties', 'dependentSchemas'].includes(k) && e && typeof e === 'object'
        ? Object.fromEntries(Object.entries(e).map(([name, schema]) => [name, encode(schema)]))
        : encode(e)]));
  };
  const result = encode(root, true);
  return Object.keys(defs).length && result && typeof result === 'object'
    ? { ...result, $defs: defs } : result;
}

// Audit helper used to prove factoring preserves the original constraints.
export function expandCatalogSchema(value: unknown): unknown {
  const defs = value && typeof value === 'object'
    ? (value as Record<string, unknown>).$defs as Record<string, unknown> | undefined : undefined;
  const expand = (v: unknown): unknown => {
    if (Array.isArray(v)) return v.map(expand);
    if (!v || typeof v !== 'object') return v;
    const record = v as Record<string, unknown>;
    if (typeof record.$ref === 'string' && record.$ref.startsWith('#/$defs/')) {
      const target = defs?.[record.$ref.slice(8)];
      if (!target) throw new Error('Unresolved local schema reference');
      return expand(target);
    }
    return Object.fromEntries(Object.entries(record).filter(([k]) => k !== '$defs')
      .map(([k, v]) => [k, expand(v)]));
  };
  return expand(value);
}
