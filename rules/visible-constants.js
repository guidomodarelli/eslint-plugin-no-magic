/** @module visible-constants Indexes lexical string constants while preserving declaration preference and temporal visibility. */

/** TypeScript wrappers that preserve a primitive initializer's value. */
const TRANSPARENT_WRAPPERS = new Set(["TSAsExpression", "TSSatisfiesExpression", "TSTypeAssertion", "TSNonNullExpression"]);

/**
 * Builds a file-local lookup; no AST or scope data survives the rule instance.
 * @param {object} sourceCode - ESLint source and completed scope graph.
 * @param {Set<string>} ignoredNames - Names excluded from suggestions, not from shadowing.
 * @returns {Function} Lookup of a visible preceding string constant by node and value.
 */
export function createVisibleConstantLookup(sourceCode, ignoredNames) {
  const scopeIndexes = new Map();
  const visibleIndexes = new Map();

  /**
   * Indexes eligible definitions once, preserving scope variable and definition order.
   * @param {object} scope - Scope whose own variables are indexed.
   * @returns {Map<string, object[]>} Constant candidates grouped by string value.
   */
  function indexScope(scope) {
    if (scopeIndexes.has(scope)) return scopeIndexes.get(scope);
    const values = new Map();
    for (const variable of scope.variables) {
      if (ignoredNames.has(variable.name)) continue;
      for (const definition of variable.defs) {
        const declaration = definition.node;
        if (definition.parent?.kind !== "const" || declaration.id?.type !== "Identifier" || !declaration.init) continue;
        let initializer = declaration.init;
        while (TRANSPARENT_WRAPPERS.has(initializer.type)) initializer = initializer.expression;
        const value = initializer.type === "Literal" ? initializer.value :
          initializer.type === "TemplateLiteral" && initializer.expressions.length === 0 ? initializer.quasis[0]?.value.cooked : null;
        if (typeof value !== "string") continue;
        if (!values.has(value)) values.set(value, []);
        values.get(value).push({ name: variable.name, end: declaration.range[1] });
      }
    }
    scopeIndexes.set(scope, values);
    return values;
  }

  /**
   * Caches visible candidates and compresses candidates that can never be preferred.
   * @param {object} startingScope - Scope containing the lookup expression.
   * @param {string} value - Static string contract.
   * @returns {object[]} Preferred candidates with strictly decreasing declaration ends.
   */
  function visibleCandidates(startingScope, value) {
    if (!visibleIndexes.has(startingScope)) visibleIndexes.set(startingScope, new Map());
    const cache = visibleIndexes.get(startingScope);
    if (cache.has(value)) return cache.get(value);
    const candidates = [];
    const innerScopes = [];
    let earliestEnd = Infinity;
    for (let scope = startingScope; scope; scope = scope.upper) {
      for (const candidate of indexScope(scope).get(value) ?? []) {
        // All bindings shadow, including parameters, let, imports, and later consts.
        if (innerScopes.some((inner) => inner.set.has(candidate.name))) continue;
        if (candidate.end < earliestEnd) {
          candidates.push(candidate);
          earliestEnd = candidate.end;
        }
      }
      innerScopes.push(scope);
    }
    cache.set(value, candidates);
    return candidates;
  }

  /**
   * Finds the first preferred declaration available at this exact source position.
   * @param {object} node - Inline string expression.
   * @param {string} value - Evaluated string value.
   * @returns {string|null} Visible name or null when no eligible declaration precedes it.
   */
  return function findVisibleConstant(node, value) {
    const candidates = visibleCandidates(sourceCode.getScope(node), value);
    let lower = 0;
    let upper = candidates.length;
    while (lower < upper) {
      const middle = Math.floor((lower + upper) / 2);
      if (candidates[middle].end <= node.range[0]) upper = middle;
      else lower = middle + 1;
    }
    return candidates[lower]?.name ?? null;
  };
}
