Deno.test('optional Deno tooling is available when run directly', () => {
  if (typeof Deno.version.deno !== 'string' || Deno.version.deno.length === 0) {
    throw new Error('Expected a Deno runtime version.');
  }
});
