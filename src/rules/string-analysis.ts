/**
 * @fileoverview Flags "magic" string literals only when they participate in
 * logic, a protocol, or a business contract whose meaning should be named:
 * equality comparisons, `switch` cases, action types, known behavioral sinks
 * (analytics, storage, feature flags, routes), or string values duplicated
 * across the file. Literals that act as structural names (JSX attributes,
 * object keys, property access, imports, type unions, enum members, directives,
 * extracted constants, visible copy) are ignored by default.
 */

import { isTransparentExpression } from "../ast.js";
import type { TSESTree, TSESLint, JSONSchema } from "@typescript-eslint/utils";
import type { NoMagicContractsOptions, NoDuplicateStringsOptions, PreferExistingConstantOptions, SinkDescriptor } from "../types.js";

/** Per-rule options are schema-validated by ESLint before visitor creation. */
type StringRuleOptions = NoMagicContractsOptions & NoDuplicateStringsOptions & PreferExistingConstantOptions;
type MessageIds = "existingConstant" | "noMagicString" | "duplicateString";
type Detection = "contracts" | "duplicates" | "reuse";
type NormalizedOptions = ReturnType<typeof normalizeOptions>;
type Node = TSESTree.Node;

import { createVisibleConstantLookup } from "./visible-constants.js";
import {
  CONTRACT_REASONS,
  DEFAULT_ACTION_TYPE_CALLEES,
  DEFAULT_ACTION_TYPE_PROPERTY,
  DEFAULT_IGNORE_SYNTAX,
  DEFAULT_MIN_DUPLICATES,
  DEFAULT_SINK_CALLEES,
  DETECTIONS,
  DIAGNOSTIC_PREVIEW_LENGTH,
  EQUALITY_OPERATORS,
  FEATURE_FLAG_CALLEES,
  IGNORE_CONTRACTS_SCHEMA,
  IGNORE_SYNTAX_SCHEMA,
  NAVIGATION_CALLEES,
  RULE_OPTION_PROPERTIES,
  SINGLE_CHARACTER_LENGTH,
  STORAGE_CALLEES,
  STRING_MESSAGE_IDS,
  SVG_ELEMENT_NAMES,
  SVG_ROOT_ELEMENT_NAME,
  TYPEOF_RESULT_LITERALS,
} from "../constants/string-analysis/index.js";
import { IGNORE_CONSTANT_NAMES_SCHEMA } from "../constants/shared-rule-meta.js";

/**
 * Returns the AST parent, or null at the root.
 * @param node - AST node to inspect.
 * @returns The derived value or context match.
 */
function getParent(node: Node): Node | null {
  return node.parent ?? null;
}

/**
 * Narrows literal nodes to nonempty string values.
 * @param node - AST node to inspect.
 * @returns The derived value or context match.
 */
function isNonEmptyStringLiteral(node: TSESTree.Literal): node is TSESTree.StringLiteral {
  return typeof node.value === "string" && node.value.length > 0;
}

/**
 * Checks for nonempty static fragments in a template.
 * @param node - AST node to inspect.
 * @returns The derived value or context match.
 */
function hasStaticTemplateText(node: TSESTree.TemplateLiteral) {
  return node.quasis.some((quasi) => (quasi.value.cooked?.length ?? 0) > 0);
}

/**
 * Reads a template only when it has no runtime interpolation.
 * @param node - AST node to inspect.
 * @returns The derived value or context match.
 */
function getNoSubstitutionTemplateText(node: TSESTree.TemplateLiteral): string | null {
  if (node.expressions.length > 0 || node.quasis.length !== 1) {
    return null;
  }

  return node.quasis[0]?.value.cooked ?? null;
}

/**
 * Resolves a bare or member callee name.
 * @param callee - Called expression.
 * @returns Resolved name or context match.
 */
function getCalleeName(callee: Node): string | null {
  if (callee.type === "Identifier") {
    return callee.name;
  }

  if (callee.type === "MemberExpression") {
    return getStaticPropertyName(callee.property, callee.computed);
  }

  return null;
}

/**
 * Resolves identifier and computed literal property names consistently.
 * @param key - Property key expression.
 * @param computed - Whether bracket notation is used.
 * @returns Statically known property name.
 */
function getStaticPropertyName(key: Node | undefined, computed: boolean): string | null {
  if (!computed && key?.type === "Identifier") return key.name;
  if (key?.type === "Literal" && typeof key.value === "string") return key.value;
  return null;
}

/**
 * Resolves a static object property key.
 * @param property - Object property.
 * @returns Known key or null for dynamic keys.
 */
function getPropertyKeyName(property: TSESTree.Property): string | null {
  return getStaticPropertyName(property.key, property.computed);
}

/**
 * Detects JSX attribute values without crossing callback bodies.
 * @param node - AST node to inspect.
 * @returns The derived value or context match.
 */
function isJsxAttributeValueLiteral(node: Node) {
  let current: Node = node;

  while (current) {
    const parent = getParent(current);

    if (!parent) {
      return false;
    }

    if (
      parent.type === "ArrowFunctionExpression" ||
      parent.type === "FunctionDeclaration" ||
      parent.type === "FunctionExpression"
    ) {
      return false;
    }

    if (parent.type === "JSXAttribute" && parent.value === current) {
      return true;
    }

    current = parent;
  }

  return false;
}

/**
 * Recognizes copy rendered directly or through value branches.
 * @param node - String expression.
 * @returns Resolved name or context match.
 */
function isVisibleJsxCopyLiteral(node: Node) {
  const parent = getParent(getContextNode(node));

  return (
    parent?.type === "JSXExpressionContainer" &&
    parent.parent?.type !== "JSXAttribute"
  );
}

/**
 * Recognizes structural SVG tag names.
 * @param nameNode - AST node to inspect.
 * @returns The derived value or context match.
 */
function isSvgElementName(nameNode: Node | undefined) {
  return nameNode?.type === "JSXIdentifier" && SVG_ELEMENT_NAMES.has(nameNode.name);
}

/**
 * Recognizes an SVG root tag.
 * @param nameNode - AST node to inspect.
 * @returns The derived value or context match.
 */
function isSvgRootElementName(nameNode: Node | undefined) {
  return nameNode?.type === "JSXIdentifier" && nameNode.name === SVG_ROOT_ELEMENT_NAME;
}

/**
 * Identifies function bodies that separate behavior from markup.
 * @param node - AST node to inspect.
 * @returns The derived value or context match.
 */
function isFunctionBoundary(node: Node) {
  return (
    node.type === "ArrowFunctionExpression" ||
    node.type === "FunctionDeclaration" ||
    node.type === "FunctionExpression"
  );
}

/**
 * Finds structural SVG opening elements in the parent chain.
 * @param node - AST node to inspect.
 * @returns The derived value or context match.
 */
function isInsideSvgOpeningElement(node: Node) {
  let current: Node = node;

  while (current) {
    const parent = getParent(current);

    if (!parent) {
      return false;
    }

    if (parent.type === "JSXOpeningElement" && isSvgElementName(parent.name)) {
      return true;
    }

    current = parent;
  }

  return false;
}

/**
 * Recognizes SVG markup without treating callbacks as presentation.
 * @param node - AST node to inspect.
 * @returns The derived value or context match.
 */
function isSvgMarkupLiteral(node: Node) {
  let current: Node = node;

  while (current) {
    const parent = getParent(current);

    if (!parent) {
      return false;
    }

    if (isFunctionBoundary(parent)) {
      return false;
    }

    if (
      parent.type === "JSXElement" &&
      isSvgRootElementName(parent.openingElement?.name)
    ) {
      return true;
    }

    if (parent.type === "JSXAttribute" && isInsideSvgOpeningElement(parent)) {
      return true;
    }

    current = parent;
  }

  return false;
}

/**
 * Recognizes actual directive prologues reported by the parser.
 * @param node - Literal expression.
 * @returns Resolved name or context match.
 */
function isDirectiveLiteral(node: Node) {
  const parent = getParent(node);
  return parent?.type === "ExpressionStatement" && parent.expression === node &&
    "directive" in parent && typeof parent.directive === "string";
}

/**
 * Identifies module source strings owned by module resolution.
 * @param node - AST node to inspect.
 * @returns The derived value or context match.
 */
function isImportOrExportSource(node: Node) {
  const parentType = getParent(node)?.type;

  return (
    parentType === "ImportDeclaration" ||
    parentType === "ExportAllDeclaration" ||
    parentType === "ExportNamedDeclaration" ||
    parentType === "ImportExpression"
  );
}

/**
 * Recognizes standardized typeof vocabulary through transparent wrappers.
 * @param node - Runtime expression after wrappers.
 * @param value - Evaluated string value.
 * @returns Whether the comparison uses typeof vocabulary.
 */
function isTypeofComparisonLiteral(node: Node, value: string) {
  const parent = getParent(node);

  if (parent?.type !== "BinaryExpression") {
    return false;
  }

  if (!TYPEOF_RESULT_LITERALS.has(value)) {
    return false;
  }

  return (
    (parent.left?.type === "UnaryExpression" && parent.left.operator === "typeof") ||
    (parent.right?.type === "UnaryExpression" && parent.right.operator === "typeof")
  );
}

/**
 * Recognizes static reads of configured structural properties, including optional chains.
 * @param node - Compared expression.
 * @param discriminants - Structural property names.
 * @returns Whether the expression reads a structural discriminant.
 */
function isStructuralDiscriminantAccess(node: Node | null | undefined, discriminants: ReadonlySet<string>) {
  while (node && (isTransparentExpression(node) || node.type === "ChainExpression")) node = node.expression;
  return node?.type === "MemberExpression" && discriminants.has(getStaticPropertyName(node.property, node.computed) ?? "");
}

/**
 * Recognizes values compared or switched against structural vocabulary, such as `node.type`.
 * @param node - Runtime expression after wrappers and value branches.
 * @param discriminants - Structural property names; empty disables the exemption.
 * @returns Whether the string names structure rather than a contract.
 */
function isStructuralDiscriminantValue(node: Node, discriminants: ReadonlySet<string>) {
  if (!discriminants.size) return false;
  const parent = getParent(node);
  if (parent?.type === "BinaryExpression" && EQUALITY_OPERATORS.has(parent.operator)) {
    return isStructuralDiscriminantAccess(parent.left === node ? parent.right : parent.left, discriminants);
  }
  return parent?.type === "SwitchCase" && parent.test === node &&
    parent.parent.type === "SwitchStatement" && isStructuralDiscriminantAccess(parent.parent.discriminant, discriminants);
}

/**
 * Recognizes TypeScript literal-type declarations.
 * @param node - AST node to inspect.
 * @returns The derived value or context match.
 */
function isTypeOnlyLiteral(node: Node) {
  return getParent(node)?.type === "TSLiteralType";
}

/**
 * Recognizes explicitly named enum values.
 * @param node - AST node to inspect.
 * @returns The derived value or context match.
 */
function isEnumMemberInitializer(node: Node) {
  const parent = getParent(node);

  return parent?.type === "TSEnumMember" && parent.initializer === node;
}

/**
 * Identifies property-name vocabulary in existence checks.
 * @param node - AST node to inspect.
 * @returns The derived value or context match.
 */
function isInOperatorLeftOperand(node: Node) {
  const parent = getParent(node);

  return (
    parent?.type === "BinaryExpression" &&
    parent.operator === "in" &&
    parent.left === node
  );
}

/**
 * Recognizes noncomputed structural object keys.
 * @param node - AST node to inspect.
 * @returns The derived value or context match.
 */
function isObjectKey(node: Node) {
  const parent = getParent(node);

  return parent?.type === "Property" && parent.key === node && !parent.computed;
}

/**
 * Recognizes structural property-access names.
 * @param node - AST node to inspect.
 * @returns The derived value or context match.
 */
function isMemberPropertyName(node: Node) {
  const parent = getParent(node);

  return parent?.type === "MemberExpression" && parent.property === node;
}

/**
 * Checks declaration containers and transparent runtime wrappers.
 * @param parent - Enclosing node.
 * @param current - Child expression.
 * @returns Resolved name or context match.
 */
function isContainerNode(parent: Node, current: Node) {
  if (parent.type === "Property" && parent.value === current) {
    return true;
  }

  return (
    parent.type === "ArrayExpression" ||
    parent.type === "ObjectExpression" ||
    (isTransparentExpression(parent) && parent.expression === current)
  );
}

/**
 * Finds string values already named by const declarations.
 * @param node - AST node to inspect.
 * @returns The derived value or context match.
 */
function isExtractedConstantLiteral(node: Node) {
  let current: Node = node;

  while (getParent(current)) {
    const parent = getParent(current);
    if (!parent) return false;

    if (parent.type === "ExportNamedDeclaration") {
      current = parent;
      continue;
    }

    if (parent.type === "VariableDeclarator" && parent.init === current) {
      return (
        parent.parent?.type === "VariableDeclaration" &&
        parent.parent.kind === "const"
      );
    }

    if (!isContainerNode(parent, current)) {
      return false;
    }

    current = parent;
  }

  return false;
}

/**
 * Checks operands of equality and inequality comparisons.
 * @param node - AST node to inspect.
 * @returns The derived value or context match.
 */
function isEqualityComparisonOperand(node: Node) {
  const parent = getParent(node);

  if (parent?.type !== "BinaryExpression" || !EQUALITY_OPERATORS.has(parent.operator)) {
    return false;
  }

  return parent.left === node || parent.right === node;
}

/**
 * Recognizes case labels that determine control flow.
 * @param node - AST node to inspect.
 * @returns The derived value or context match.
 */
function isSwitchCaseTest(node: Node) {
  const parent = getParent(node);

  return parent?.type === "SwitchCase" && parent.test === node;
}

/**
 * Builds a static receiver path, including optional and computed member access.
 * @param node - Callee expression.
 * @returns Static path or null for dynamic expressions.
 */
function getCalleePath(node: Node): string | null {
  if (node.type === "Identifier") return node.name;
  if (node.type === "MemberExpression") {
    const receiver = getCalleePath(node.object);
    const property = getStaticPropertyName(node.property, node.computed);
    return receiver && property ? `${receiver}.${property}` : null;
  }
  return null;
}

/**
 * Checks legacy method-name sinks or precise path/argument descriptors.
 * @param node - Argument after transparent wrappers.
 * @param sinkCallees - Configured sink names or descriptors.
 * @returns Whether the argument is a configured contract.
 */
function isKnownSinkArgument(node: Node, sinkCallees: ReadonlyArray<string | SinkDescriptor>) {
  const parent = getParent(node);
  if (parent?.type !== "CallExpression") return false;
  const argumentIndex = parent.arguments.findIndex((argument) => argument === node);
  if (argumentIndex < 0) return false;
  const calleeName = getCalleeName(parent.callee);
  const calleePath = getCalleePath(parent.callee);
  return sinkCallees.some((sink) => typeof sink === "string"
    ? sink === calleeName || sink === calleePath
    : (sink.callee === calleePath || sink.callee === calleeName) &&
      sink.argumentIndex === argumentIndex);
}

/**
 * Recognizes action properties inside dispatcher arguments.
 * @param node - Runtime property value.
 * @param actionTypeCallees - Allowed dispatcher names.
 * @param actionTypeProperty - Property carrying the action contract.
 * @returns Whether this value is an action type.
 */
function isActionTypeProperty(node: Node, actionTypeCallees: Set<string>, actionTypeProperty: string) {
  const property = getParent(node);

  if (property?.type !== "Property" || property.value !== node) {
    return false;
  }

  if (getPropertyKeyName(property) !== actionTypeProperty) {
    return false;
  }

  const objectExpression = getParent(property);

  if (objectExpression?.type !== "ObjectExpression") {
    return false;
  }

  const argument = getContextNode(objectExpression);
  const callExpression = getParent(argument);

  if (
    callExpression?.type !== "CallExpression" ||
    !callExpression.arguments.some((item) => item === argument)
  ) {
    return false;
  }

  const calleeName = getCalleeName(callExpression.callee);

  return calleeName !== null && actionTypeCallees.has(calleeName);
}

/**
 * Normalizes validated options without mutating caller configuration.
 * @param rawOptions - User rule configuration.
 * @returns Normalized lookup collections and sink descriptors.
 */
function normalizeOptions(rawOptions: StringRuleOptions = {}) {
  const sinks = Array.isArray(rawOptions.sinks)
    ? rawOptions.sinks
    : DEFAULT_SINK_CALLEES;
  const actionTypeCallees = Array.isArray(rawOptions.actionTypeCallees)
    ? rawOptions.actionTypeCallees
    : DEFAULT_ACTION_TYPE_CALLEES;

  return {
    sinks,
    ignoreSyntax: { ...DEFAULT_IGNORE_SYNTAX, ...rawOptions.ignoreSyntax },
    actionTypeCallees: new Set(actionTypeCallees),
    actionTypeProperty: rawOptions.actionTypeProperty ?? DEFAULT_ACTION_TYPE_PROPERTY,
    minDuplicates:
      typeof rawOptions.minDuplicates === "number"
        ? rawOptions.minDuplicates
        : DEFAULT_MIN_DUPLICATES,
    ignoreStrings: new Set(
      Array.isArray(rawOptions.ignoreStrings) ? rawOptions.ignoreStrings : []
    ),
    structuralDiscriminants: new Set(
      Array.isArray(rawOptions.structuralDiscriminants) ? rawOptions.structuralDiscriminants : []
    ),
  };
}

/**
 * Identifies presentation and declaration positions exempt from duplication.
 * @param node - Original literal expression.
 * @param ignoreSyntax - Independently enabled syntax exemptions.
 * @returns Whether the position is exempt.
 */
function isAllowlistedPosition(node: Node, ignoreSyntax: Required<NonNullable<NoDuplicateStringsOptions["ignoreSyntax"]>>) {
  if (isImportOrExportSource(node) || isTypeOnlyLiteral(node) ||
      isEnumMemberInitializer(node) || isInOperatorLeftOperand(node) ||
      isObjectKey(node) || isMemberPropertyName(node)) return true;
  // SVG is a distinct category so JSX settings cannot mask an explicit SVG override.
  if (isSvgMarkupLiteral(node)) return ignoreSyntax.svg;
  if (isJsxAttributeValueLiteral(node) || isVisibleJsxCopyLiteral(node)) return ignoreSyntax.jsx;
  return ignoreSyntax.constDefinitions && isExtractedConstantLiteral(node);
}


/**
 * Follows transparent wrappers and branches that contribute an expression value.
 * @param node - Original runtime expression.
 * @returns Outermost expression receiving the literal value.
 */
function getContextNode(node: Node): Node {
  let current: Node = node;
  while (current.parent) {
    const parent = current.parent;
    const transparent = isTransparentExpression(parent) && parent.expression === current;
    const conditionalBranch = parent.type === "ConditionalExpression" &&
      (parent.consequent === current || parent.alternate === current);
    const logicalValue = parent.type === "LogicalExpression" &&
      (parent.right === current || parent.operator !== "&&");
    if (!transparent && !conditionalBranch && !logicalValue) break;
    current = parent;
  }
  return current;
}

/**
 * Detects runtime contracts through transparent TypeScript wrappers.
 * @param node - Original string expression.
 * @param options - Normalized rule configuration.
 * @returns Whether the expression participates in a behavioral contract.
 */
function isSuspiciousContext(node: Node, options: NormalizedOptions) {
  return getContractReason(node, options) !== null;
}

/**
 * Explains the specific runtime contract represented by a string.
 * @param node - Original string expression.
 * @param options - Normalized rule options.
 * @returns Human-readable reason or null outside a contract.
 */
function getContractReason(node: Node, options: NormalizedOptions): string | null {
  node = getContextNode(node);
  if (isEqualityComparisonOperand(node)) return CONTRACT_REASONS.comparison;
  if (isSwitchCaseTest(node)) return CONTRACT_REASONS.switchCase;
  if (isActionTypeProperty(node, options.actionTypeCallees, options.actionTypeProperty)) return CONTRACT_REASONS.actionType;
  if (!isKnownSinkArgument(node, options.sinks)) return null;
  const parent = getParent(node);
  const callee = parent?.type === "CallExpression" ? getCalleeName(parent.callee) : null;
  if (STORAGE_CALLEES.includes(callee ?? "")) return CONTRACT_REASONS.storageKey;
  if (NAVIGATION_CALLEES.includes(callee ?? "")) return CONTRACT_REASONS.navigation;
  if (FEATURE_FLAG_CALLEES.includes(callee ?? "")) return CONTRACT_REASONS.featureFlag;
  return CONTRACT_REASONS.configuredCall;
}

/** Defines schema, diagnostics, and per-file string analysis for ESLint. */
const stringAnalysis: {
  meta: TSESLint.RuleMetaData<MessageIds>;
  create(context: TSESLint.RuleContext<MessageIds, [StringRuleOptions?]>, detection: Detection): TSESLint.RuleListener;
} = {
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Disallow magic string literals in comparisons, switch cases, action types, known behavioral sinks, or when duplicated, while ignoring structural literals",
    },
    schema: [
      {
        type: "object",
        properties: RULE_OPTION_PROPERTIES,
        additionalProperties: false,
      },
    ],
    messages: {
      [STRING_MESSAGE_IDS.existingConstant]: "Consider using visible constant {{name}} instead of repeating this contract value; verify that they have the same meaning.",
      [STRING_MESSAGE_IDS.noMagicString]:
        "Extract this {{reason}} into a named constant or configuration value.",
      [STRING_MESSAGE_IDS.duplicateString]:
        'String {{value}} is repeated {{count}} times. First occurrence: {{firstLocation}}. Extract a named constant.',
    },
  },
  /**
   * Creates per-file visitors and deduplicates diagnostics.
   * @param context - ESLint rule context.
   * @param detection - Contracts or duplicates reporting.
   * @returns AST visitors for string expressions and file completion.
   */
  create(context, detection) {
    const options = normalizeOptions(context.options[0]);
    const reportContracts = detection === DETECTIONS.contracts;
    if (detection !== DETECTIONS.duplicates) options.minDuplicates = 0;
    const findVisibleConstant = detection === DETECTIONS.reuse
      ? createVisibleConstantLookup(context.sourceCode, new Set(context.options[0]?.ignoreConstantNames ?? []))
      : null;
    const duplicateCandidates = new Map<string, Node[]>();
    const reportedNodes = new Set<Node>();
    const ignoreContracts = detection === DETECTIONS.duplicates && context.options[0]?.ignoreContracts !== false;
    const duplicateContractOptions = normalizeOptions(context.options[0]?.contractOptions);

    /**
     * Records a string occurrence for file-level duplicate reporting.
     * @param value - Evaluated static string.
     * @param node - AST node to inspect.
     * @returns No value; records the occurrence.
     */
    function collectDuplicateCandidate(value: string, node: Node) {
      const existingNodes = duplicateCandidates.get(value);

      if (existingNodes) {
        existingNodes.push(node);
        return;
      }

      duplicateCandidates.set(value, [node]);
    }

    /**
     * Reports behavioral contracts and records eligible duplicate occurrences.
     * @param node - Original literal used for diagnostic locations.
     * @param value - Evaluated static string value.
     * @returns Reports immediately or defers duplicate diagnostics.
     */
    function evaluateStringValue(node: Node, value: string) {
      if (!value || options.ignoreStrings.has(value)) return;
      const contextNode = getContextNode(node);
      if (isDirectiveLiteral(node) || isTypeofComparisonLiteral(contextNode, value)) return;
      const classification = detection === DETECTIONS.duplicates ? duplicateContractOptions : options;
      if (isStructuralDiscriminantValue(contextNode, classification.structuralDiscriminants)) return;

      const suspicious = isSuspiciousContext(node, classification);
      if (!suspicious && isAllowlistedPosition(node, options.ignoreSyntax)) return;

      if (detection === DETECTIONS.reuse) {
        const name = suspicious ? findVisibleConstant!(node, value) : null;
        if (name) context.report({ node, messageId: STRING_MESSAGE_IDS.existingConstant, data: { name } });
        return;
      }
      if (suspicious && reportContracts) {
        context.report({ node, messageId: STRING_MESSAGE_IDS.noMagicString, data: { reason: getContractReason(node, options) } });
        reportedNodes.add(node);
      }
      if (ignoreContracts && suspicious && !duplicateContractOptions.ignoreStrings.has(value)) {
        reportedNodes.add(node);
      }
      // Single characters are exempt only from duplicate detection.
      if (value.length > SINGLE_CHARACTER_LENGTH && options.minDuplicates > 0) {
        collectDuplicateCandidate(value, node);
      }
    }

    return {
      /**
       * Evaluates runtime string literals using this rule's policy.
       * @param node - Literal AST node.
       * @returns No value; emits or records applicable diagnostics.
       */
      Literal(node) {
        if (!isNonEmptyStringLiteral(node)) {
          return;
        }

        evaluateStringValue(node, node.value);
      },
      /**
       * Checks static templates and interpolated behavioral contracts.
       * @param node - Template expression.
       * @returns Emits applicable diagnostics.
       */
      TemplateLiteral(node) {
        const noSubstitutionText = getNoSubstitutionTemplateText(node);

        if (noSubstitutionText !== null) {
          evaluateStringValue(node, noSubstitutionText);
          return;
        }

        if (!hasStaticTemplateText(node)) {
          return;
        }

        if (reportContracts && !isStructuralDiscriminantValue(getContextNode(node), options.structuralDiscriminants) &&
          isSuspiciousContext(node, options)) {
          context.report({ node, messageId: STRING_MESSAGE_IDS.noMagicString, data: { reason: getContractReason(node, options) } });
        }
      },
      /**
       * Reports duplicates once per previously unreported occurrence.
       * @returns Emits deferred diagnostics.
       */
      "Program:exit"() {
        if (options.minDuplicates <= 0) {
          return;
        }

        for (const [value, nodes] of duplicateCandidates) {
          if (nodes.length < options.minDuplicates) {
            continue;
          }

          for (const node of nodes) {
            if (reportedNodes.has(node)) continue;
            context.report({
              node,
              messageId: STRING_MESSAGE_IDS.duplicateString,
              data: { value: JSON.stringify(value.length > DIAGNOSTIC_PREVIEW_LENGTH ? `${value.slice(0, DIAGNOSTIC_PREVIEW_LENGTH)}...` : value), count: String(nodes.length), firstLocation: `${nodes[0].loc.start.line}:${nodes[0].loc.start.column + 1}` },
            });
          }
        }
      },
    };
  },
};

/**
 * Creates an independently configurable rule using the shared string analysis.
 * @param detection - Reporting responsibility.
 * @returns ESLint rule with a focused option schema.
 */
export function createFocusedStringRule(detection: Detection): TSESLint.RuleModule<MessageIds, [StringRuleOptions?]> {
  const properties: Record<string, JSONSchema.JSONSchema4> = { ...RULE_OPTION_PROPERTIES };
  if (detection !== DETECTIONS.duplicates) delete properties.minDuplicates;
  if (detection === DETECTIONS.reuse) properties.ignoreConstantNames = IGNORE_CONSTANT_NAMES_SCHEMA;
  if (detection === DETECTIONS.duplicates) {
    const contractProperties = { ...properties };
    delete contractProperties.minDuplicates;
    properties.ignoreSyntax = IGNORE_SYNTAX_SCHEMA;
    properties.ignoreContracts = IGNORE_CONTRACTS_SCHEMA;
    properties.contractOptions = {
      type: "object", properties: contractProperties, additionalProperties: false,
    };
    delete properties.sinks;
    delete properties.actionTypeCallees;
    delete properties.actionTypeProperty;
    delete properties.structuralDiscriminants;
  }
  return {
    meta: {
      ...stringAnalysis.meta,
      docs: { description: detection === DETECTIONS.reuse ? "Suggest reusing a visible constant for inline string contracts" : detection === DETECTIONS.contracts
        ? "Disallow unnamed string contracts in runtime logic"
        : "Disallow repeated string values in non-structural positions" },
      schema: [{ type: "object", properties, additionalProperties: false }],
    },
    /**
     * Binds shared analysis to this rule's reporting responsibility.
     * @param context - ESLint rule context.
     * @returns Per-file AST visitors.
     */
    create(context) {
      return stringAnalysis.create(context, detection);
    },
  };
}


