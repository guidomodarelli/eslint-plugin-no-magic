/** @module require-constants-location Requires static module-level constants to be declared in modules matching configured globs. */
import { relative } from "node:path";
import type { TSESLint, TSESTree } from "@typescript-eslint/utils";
import { isTransparentExpression } from "../ast.js";
import { globToRegExp, toPosixPath } from "../glob.js";
import type { RequireConstantsLocationOptions } from "../types.js";
import {
  CONSTANT_OUTSIDE_CONSTANTS_MODULE_MESSAGE_ID,
  DEFAULT_CONSTANTS_PATTERNS,
  DEFAULT_EXPORTED_ONLY,
  REQUIRE_CONSTANTS_LOCATION_SCHEMA,
} from "../constants/require-constants-location.js";

/**
 * Decides whether an initializer is fully known without executing code or resolving bindings.
 * @param node - Initializer expression.
 * @returns Whether it is a literal, static template, or array/object composed only of them.
 */
function isStaticValue(node: TSESTree.Node | null): boolean {
  while (node && isTransparentExpression(node)) node = node.expression;
  if (!node) return false;
  if (node.type === "Literal") return true;
  if (node.type === "TemplateLiteral") return node.expressions.length === 0;
  if (node.type === "UnaryExpression") return node.operator === "-" && node.argument.type === "Literal" && typeof node.argument.value === "number";
  if (node.type === "ArrayExpression") return node.elements.every((element) => element !== null && element.type !== "SpreadElement" && isStaticValue(element));
  if (node.type === "ObjectExpression") {
    return node.properties.every((property) => property.type === "Property" && property.kind === "init" && !property.method &&
      !property.shorthand && (!property.computed || property.key.type === "Literal") && isStaticValue(property.value));
  }
  return false;
}

/** Opt-in placement policy: static values belong to modules dedicated to constants. */
const rule: TSESLint.RuleModule<"constantOutsideConstantsModule", [RequireConstantsLocationOptions?]> = {
  meta: {
    type: "suggestion",
    docs: { description: "Require static module-level constants to be declared in constants modules" },
    schema: REQUIRE_CONSTANTS_LOCATION_SCHEMA,
    messages: { [CONSTANT_OUTSIDE_CONSTANTS_MODULE_MESSAGE_ID]: "Move static constant {{name}} to a module matching {{patterns}}." },
  },
  /**
   * Skips constants modules and collects static module-level declarations elsewhere.
   * @param context - ESLint rule context.
   * @returns Declaration and export visitors.
   */
  create(context) {
    const options = context.options[0] ?? {};
    const patterns = options.patterns ?? DEFAULT_CONSTANTS_PATTERNS;
    const exportedOnly = options.exportedOnly ?? DEFAULT_EXPORTED_ONLY;
    const ignoredNames = new Set(options.ignoreConstantNames ?? []);
    const path = toPosixPath(relative(context.cwd, context.filename));
    if (patterns.some((pattern) => globToRegExp(pattern).test(path))) return {};
    const candidates: Array<{ id: TSESTree.Identifier; exported: boolean }> = [];
    const exportedNames = new Set<string>();
    return {
      /**
       * Collects module-level static const declarations, directly exported or not.
       * @param node - Variable declaration.
       * @returns No value; records candidates.
       */
      VariableDeclaration(node) {
        const exported = node.parent.type === "ExportNamedDeclaration";
        const container = exported ? node.parent.parent : node.parent;
        if (node.kind !== "const" || container?.type !== "Program") return;
        for (const declarator of node.declarations) {
          if (declarator.id.type === "Identifier" && !ignoredNames.has(declarator.id.name) && isStaticValue(declarator.init)) {
            candidates.push({ id: declarator.id, exported });
          }
        }
      },
      /**
       * Records local names exported through specifiers, such as `export { LIMIT }`.
       * @param node - Named export without a declaration.
       * @returns No value; records exported names.
       */
      ExportNamedDeclaration(node) {
        if (node.source || node.declaration) return;
        for (const specifier of node.specifiers) {
          if (specifier.local.type === "Identifier") exportedNames.add(specifier.local.name);
        }
      },
      /**
       * Reports once every export in the file is known.
       * @returns Emits placement diagnostics.
       */
      "Program:exit"() {
        for (const { id, exported } of candidates) {
          if (exportedOnly && !exported && !exportedNames.has(id.name)) continue;
          context.report({ node: id, messageId: CONSTANT_OUTSIDE_CONSTANTS_MODULE_MESSAGE_ID, data: { name: id.name, patterns: patterns.join(", ") } });
        }
      },
    };
  },
};

export default rule;
