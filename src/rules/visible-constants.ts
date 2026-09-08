/** @module visible-constants Indexes lexical string constants while preserving declaration preference and temporal visibility. */

import { isTransparentExpression } from "../ast.js";
import type { TSESLint, TSESTree } from "@typescript-eslint/utils";

type Scope = TSESLint.Scope.Scope;
interface Candidate { name: string; end: number; }


/**
 * Builds a file-local lookup; no AST or scope data survives the rule instance.
 * @param sourceCode - ESLint source and completed scope graph.
 * @param ignoredNames - Names excluded from suggestions, not from shadowing.
 * @returns Lookup of a visible preceding string constant by node and value.
 */
export function createVisibleConstantLookup(sourceCode: TSESLint.SourceCode, ignoredNames: Set<string>) {
  const scopeIndexes = new Map<Scope, Map<string, Candidate[]>>();
  const visibleIndexes = new Map<Scope, Map<string, Candidate[]>>();

  /**
   * Indexes eligible definitions once, preserving scope variable and definition order.
   * @param scope - Scope whose own variables are indexed.
   * @returns Constant candidates grouped by string value.
   */
  function indexScope(scope: Scope): Map<string, Candidate[]> {
    if (scopeIndexes.has(scope)) return scopeIndexes.get(scope)!;
    const values = new Map<string, Candidate[]>();
    for (const variable of scope.variables) {
      if (ignoredNames.has(variable.name)) continue;
      for (const definition of variable.defs) {
        if (definition.type !== "Variable") continue;
        const declaration = definition.node;
        if (definition.type !== "Variable" || definition.parent?.kind !== "const" || declaration.id?.type !== "Identifier" || !declaration.init) continue;
        let initializer: TSESTree.Node = declaration.init;
        while (isTransparentExpression(initializer)) initializer = initializer.expression;
        const value = initializer.type === "Literal" ? initializer.value :
          initializer.type === "TemplateLiteral" && initializer.expressions.length === 0 ? initializer.quasis[0]?.value.cooked : null;
        if (typeof value !== "string") continue;
        if (!values.has(value)) values.set(value, []);
        values.get(value)!.push({ name: variable.name, end: declaration.range[1] });
      }
    }
    scopeIndexes.set(scope, values);
    return values;
  }

  /**
   * Caches visible candidates and compresses candidates that can never be preferred.
   * @param startingScope - Scope containing the lookup expression.
   * @param value - Static string contract.
   * @returns Preferred candidates with strictly decreasing declaration ends.
   */
  function visibleCandidates(startingScope: Scope, value: string): Candidate[] {
    if (!visibleIndexes.has(startingScope)) visibleIndexes.set(startingScope, new Map());
    const cache = visibleIndexes.get(startingScope)!;
    if (cache.has(value)) return cache.get(value)!;
    const candidates: Candidate[] = [];
    const innerScopes: Scope[] = [];
    let earliestEnd = Infinity;
    for (let scope: Scope | null = startingScope; scope; scope = scope.upper) {
      // Dynamic object environments cannot prove which outer identifier will resolve.
      if (scope.type === "with") break;
      for (const candidate of indexScope(scope).get(value) ?? []) {
        // All bindings shadow, including parameters, let, imports, and later consts.
        if (innerScopes.some((inner) => inner.set.has(candidate.name))) continue;
        if (candidate.end < earliestEnd) {
          candidates.push(candidate);
          earliestEnd = candidate.end;
        }
      }
      innerScopes.push(scope);
      // Hoisted functions can run before outer constants initialize. Keep local
      // candidates, but do not claim outer values are available at invocation time.
      if (scope.type === "function" && scope.block.type === "FunctionDeclaration") break;
    }
    cache.set(value, candidates);
    return candidates;
  }

  /**
   * Finds the first preferred declaration available at this exact source position.
   * @param node - Inline string expression.
   * @param value - Evaluated string value.
   * @returns Visible name or null when no eligible declaration precedes it.
   */
  return function findVisibleConstant(node: TSESTree.Node, value: string): string | null {
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
