// Read the registered constant arrays without importing Deno/npm runtime modules.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import ts from 'typescript';
function source(path: string) {
  return ts.createSourceFile(
    path,
    readFileSync(path, 'utf8'),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
}
export function activeMcpToolNames(root = process.cwd()): string[] {
  const directory = join(root, 'supabase/functions/mcp');
  const registry = source(join(directory, 'registry.ts'));
  const groups = new Map<string, string[]>();
  let countExpression: ts.Expression | undefined;
  for (const statement of registry.statements) {
    if (ts.isVariableStatement(statement))
      for (const d of statement.declarationList.declarations)
        if (ts.isIdentifier(d.name) && d.name.text === 'MCP_TOOL_COUNT')
          countExpression = d.initializer;
    if (
      !ts.isImportDeclaration(statement) ||
      !ts.isStringLiteral(statement.moduleSpecifier) ||
      !statement.importClause?.namedBindings ||
      !ts.isNamedImports(statement.importClause.namedBindings)
    )
      continue;
    for (const element of statement.importClause.namedBindings.elements) {
      const name = element.name.text;
      if (!name.endsWith('_TOOL_NAMES')) continue;
      const file = source(join(directory, statement.moduleSpecifier.text));
      let values: string[] | undefined;
      for (const declaration of file.statements)
        if (ts.isVariableStatement(declaration))
          for (const d of declaration.declarationList.declarations) {
            if (!ts.isIdentifier(d.name) || d.name.text !== name || !d.initializer) continue;
            const array = ts.isAsExpression(d.initializer)
              ? d.initializer.expression
              : d.initializer;
            if (
              !ts.isArrayLiteralExpression(array) ||
              array.elements.some((e) => !ts.isStringLiteral(e))
            )
              throw new Error('MCP_NON_LITERAL_INVENTORY');
            values = array.elements.map((e) => (e as ts.StringLiteral).text);
          }
      if (!values || groups.has(name)) throw new Error('MCP_GROUP_INVENTORY_DRIFT');
      groups.set(name, values);
    }
  }
  const used: string[] = [];
  const count = (x: ts.Expression): void => {
    if (ts.isBinaryExpression(x) && x.operatorToken.kind === ts.SyntaxKind.PlusToken) {
      count(x.left);
      count(x.right);
      return;
    }
    if (
      !ts.isPropertyAccessExpression(x) ||
      x.name.text !== 'length' ||
      !ts.isIdentifier(x.expression) ||
      !groups.has(x.expression.text)
    )
      throw new Error('MCP_COUNT_EXPRESSION_DRIFT');
    used.push(x.expression.text);
  };
  if (!countExpression) throw new Error('MCP_COUNT_MISSING');
  count(countExpression);
  if (used.length !== groups.size || new Set(used).size !== groups.size)
    throw new Error('MCP_GROUP_COUNT_DRIFT');
  const names = used.flatMap((name) => groups.get(name)!);
  if (new Set(names).size !== names.length) throw new Error('MCP_DUPLICATE_NAME');
  return names.sort();
}
export function mcpTestCaseCount(paths: string[], root = process.cwd()): number {
  let count = 0;
  for (const path of paths) {
    const visit = (node: ts.Node): void => {
      if (
        ts.isCallExpression(node) &&
        ts.isPropertyAccessExpression(node.expression) &&
        ts.isIdentifier(node.expression.expression) &&
        node.expression.expression.text === 'Deno' &&
        node.expression.name.text === 'test'
      ) {
        let multiplier = 1;
        let parent: ts.Node | undefined = node.parent;
        while (parent) {
          if (ts.isForOfStatement(parent)) {
            if (
              path.endsWith('/diagnostics_test.ts') &&
              ts.isIdentifier(parent.expression) &&
              parent.expression.text === 'tools'
            )
              multiplier *= activeMcpToolNames(root).length;
            else throw new Error('MCP_TEST_DYNAMIC_INVENTORY_UNSUPPORTED');
          }
          parent = parent.parent;
        }
        count += multiplier;
      }
      ts.forEachChild(node, visit);
    };
    visit(source(join(root, path)));
  }
  return count;
}
