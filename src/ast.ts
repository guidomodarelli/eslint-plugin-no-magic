/** @module ast Defines transparent TypeScript expression boundaries shared by rule analysis. */
import type { TSESTree } from "@typescript-eslint/utils";

/** Assertions and non-null expressions preserve their child's runtime value. */
type TransparentExpression = TSESTree.TSAsExpression | TSESTree.TSSatisfiesExpression |
  TSESTree.TSTypeAssertion | TSESTree.TSNonNullExpression;

/**
 * Narrows a node to a wrapper with an expression child, never a boolean flag.
 * @param node - Optional AST node.
 * @returns Whether the node preserves the runtime value of its expression.
 */
export function isTransparentExpression(node: TSESTree.Node | undefined): node is TransparentExpression {
  return node?.type === "TSAsExpression" || node?.type === "TSSatisfiesExpression" ||
    node?.type === "TSTypeAssertion" || node?.type === "TSNonNullExpression";
}
