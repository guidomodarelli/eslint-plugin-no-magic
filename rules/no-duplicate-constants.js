/** @module no-duplicate-constants Detects repeated primitive definitions within a lexical scope without inferring domain equivalence. */

/** Transparent TypeScript assertions preserve primitive initializer values. */
const WRAPPERS = new Set(["TSAsExpression", "TSSatisfiesExpression", "TSTypeAssertion", "TSNonNullExpression"]);
/** Common mechanical values are not actionable extraction candidates. */
const TRIVIAL_VALUES = new Set(["", true, false, 0, 1, -1]);

/**
 * Reads simple primitive initializers without executing code or following imports.
 * @param {object} node - Initializer expression.
 * @returns {*} Statically known string or number, otherwise undefined.
 */
function primitive(node) {
  while (node && WRAPPERS.has(node.type)) node = node.expression;
  if (node?.type === "Literal" && ["string", "number"].includes(typeof node.value)) return node.value;
  if (node?.type === "UnaryExpression" && node.operator === "-" && typeof node.argument.value === "number") return -node.argument.value;
  if (node?.type === "TemplateLiteral" && node.expressions.length === 0) return node.quasis[0].value.cooked;
  return undefined;
}

/** Optional heuristic: equal values can have different meanings, so no fix is offered. */
export default {
  meta: {
    type: "suggestion",
    docs: { description: "Identify primitive constants with equal values in the same lexical scope" },
    schema: [{ type: "object", properties: { ignoreConstantNames: { type: "array", items: { type: "string" }, uniqueItems: true }, ignoreValues: { type: "array", items: { type: ["string", "number"] } } }, additionalProperties: false }],
    messages: { duplicateConstant: "Constant {{name}} repeats the value of {{firstName}} at {{location}}. Share one definition only if both represent the same concept." },
  },
  /**
   * Creates file-local maps keyed by lexical scope and primitive identity.
   * @param {object} context - ESLint rule context.
   * @returns {object} Variable declaration visitor.
   */
  create(context) {
    const scopes = new Map();
    const ignored = new Set(context.options[0]?.ignoreValues ?? []);
    const ignoredNames = new Set(context.options[0]?.ignoreConstantNames ?? []);
    return {
      /**
       * Reports later primitive const definitions within the same scope.
       * @param {object} node - Variable declarator.
       * @returns {void} Reports an advisory diagnostic when a value repeats.
       */
      VariableDeclarator(node) {
        if (node.parent.kind !== "const" || node.id.type !== "Identifier" || ignoredNames.has(node.id.name)) return;
        const value = primitive(node.init);
        if (value === undefined || value === null || TRIVIAL_VALUES.has(value) || ignored.has(value)) return;
        const scope = context.sourceCode.getScope(node);
        if (!scopes.has(scope)) scopes.set(scope, new Map());
        const values = scopes.get(scope);
        const first = values.get(value);
        if (!first) values.set(value, node);
        else context.report({ node: node.init, messageId: "duplicateConstant", data: {
          name: node.id.name, firstName: first.id.name,
          location: `${first.id.loc.start.line}:${first.id.loc.start.column + 1}`,
        } });
      },
    };
  },
};
