/**
 * @fileoverview Flags "magic" string literals only when they participate in
 * logic, a protocol, or a business contract whose meaning should be named:
 * equality comparisons, `switch` cases, action types, known behavioral sinks
 * (analytics, storage, feature flags, routes), or string values duplicated
 * across the file. Literals that act as structural names (JSX attributes,
 * object keys, property access, imports, type unions, enum members, directives,
 * extracted constants, visible copy) are ignored by default.
 */

const TYPEOF_RESULT_LITERALS = new Set([
  "bigint",
  "boolean",
  "function",
  "number",
  "object",
  "string",
  "symbol",
  "undefined",
]);
const EQUALITY_OPERATORS = new Set(["===", "!==", "==", "!="]);
const NEXT_FONT_IMPORT_SOURCE_PREFIX = "next/font/";
const SVG_ELEMENT_NAMES = new Set([
  "circle",
  "clipPath",
  "defs",
  "ellipse",
  "g",
  "line",
  "linearGradient",
  "path",
  "polygon",
  "polyline",
  "rect",
  "stop",
  "svg",
  "text",
  "textPath",
  "title",
  "tspan",
]);

/** Default contract calls; routing requires an explicit receiver. */
const DEFAULT_SINK_CALLEES = [
  "track",
  "trackEvent",
  "sendEvent",
  "logEvent",
  "captureEvent",
  { callee: "getItem", argumentIndex: 0 },
  { callee: "setItem", argumentIndex: 0 },
  { callee: "removeItem", argumentIndex: 0 },
  "isFeatureEnabled",
  "isEnabled",
  "getFlag",
  "navigate",
  { callee: "router.push", argumentIndex: 0 },
  { callee: "router.replace", argumentIndex: 0 },
];
const DEFAULT_ACTION_TYPE_CALLEES = ["dispatch"];
const DEFAULT_ACTION_TYPE_PROPERTY = "type";
const DEFAULT_MIN_DUPLICATES = 3;
const SINGLE_CHARACTER_LENGTH = 1;

function getParent(node) {
  return node.parent ?? null;
}

function isNonEmptyStringLiteral(node) {
  return typeof node.value === "string" && node.value.length > 0;
}

function hasStaticTemplateText(node) {
  return node.quasis.some((quasi) => (quasi.value.cooked?.length ?? 0) > 0);
}

function getNoSubstitutionTemplateText(node) {
  if (node.expressions.length > 0 || node.quasis.length !== 1) {
    return null;
  }

  return node.quasis[0]?.value.cooked ?? null;
}

/**
 * Resolves a bare or member callee name.
 * @param {object} callee - Called expression.
 * @returns {*} Resolved name or context match.
 */
function getCalleeName(callee) {
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
 * @param {object} key - Property key expression.
 * @param {boolean} computed - Whether bracket notation is used.
 * @returns {string|null} Statically known property name.
 */
function getStaticPropertyName(key, computed) {
  if (!computed && key?.type === "Identifier") return key.name;
  if (key?.type === "Literal" && typeof key.value === "string") return key.value;
  return null;
}

/**
 * Resolves a static object property key.
 * @param {object} property - Object property.
 * @returns {string|null} Known key or null for dynamic keys.
 */
function getPropertyKeyName(property) {
  return getStaticPropertyName(property.key, property.computed);
}

/**
 * Resolves the nearest binding instead of matching shadowed import names.
 * @param {object} callExpression - Loader call to resolve.
 * @param {string} calleeName - Local identifier used by the call.
 * @param {object} sourceCode - ESLint source and scope information.
 * @returns {boolean} Whether the binding belongs to next/font.
 */
function isImportedFromNextFont(callExpression, calleeName, sourceCode) {
  let scope = sourceCode.getScope(callExpression);
  while (scope) {
    const variable = scope.set.get(calleeName);
    if (variable) {
      return variable.defs.some((definition) =>
        definition.type === "ImportBinding" &&
        definition.parent?.source?.value?.startsWith(NEXT_FONT_IMPORT_SOURCE_PREFIX)
      );
    }
    scope = scope.upper;
  }
  return false;
}

/**
 * Checks whether a literal belongs to a resolved next/font call.
 * @param {*} node - Literal or enclosing expression.
 * @param {*} sourceCode - ESLint source and scope information.
 * @returns {*} Whether loader options are exempt.
 */
function isInsideNextFontLoaderCall(node, sourceCode) {
  let current = node;

  while (current) {
    const parent = getParent(current);

    if (!parent) {
      return false;
    }

    if (
      parent.type === "CallExpression" &&
      parent.arguments.includes(current) &&
      parent.callee.type === "Identifier"
    ) {
      return isImportedFromNextFont(parent, parent.callee.name, sourceCode);
    }

    current = parent;
  }

  return false;
}

function isJsxAttributeValueLiteral(node) {
  let current = node;

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
 * @param {object} node - String expression.
 * @returns {*} Resolved name or context match.
 */
function isVisibleJsxCopyLiteral(node) {
  const parent = getParent(getContextNode(node));

  return (
    parent?.type === "JSXExpressionContainer" &&
    parent.parent?.type !== "JSXAttribute"
  );
}

function isSvgElementName(nameNode) {
  return nameNode?.type === "JSXIdentifier" && SVG_ELEMENT_NAMES.has(nameNode.name);
}

function isSvgRootElementName(nameNode) {
  return nameNode?.type === "JSXIdentifier" && nameNode.name === "svg";
}

function isFunctionBoundary(node) {
  return (
    node.type === "ArrowFunctionExpression" ||
    node.type === "FunctionDeclaration" ||
    node.type === "FunctionExpression"
  );
}

function isInsideSvgOpeningElement(node) {
  let current = node;

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

function isSvgMarkupLiteral(node) {
  let current = node;

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
 * @param {object} node - Literal expression.
 * @returns {*} Resolved name or context match.
 */
function isDirectiveLiteral(node) {
  return (
    getParent(node)?.type === "ExpressionStatement" &&
    getParent(node).expression === node &&
    typeof getParent(node).directive === "string"
  );
}

function isImportOrExportSource(node) {
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
 * @param {*} node - Runtime expression after wrappers.
 * @param {*} value - Evaluated string value.
 * @returns {*} Whether the comparison uses typeof vocabulary.
 */
function isTypeofComparisonLiteral(node, value = node.value) {
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

function isTypeOnlyLiteral(node) {
  return getParent(node)?.type === "TSLiteralType";
}

function isEnumMemberInitializer(node) {
  const parent = getParent(node);

  return parent?.type === "TSEnumMember" && parent.initializer === node;
}

function isInOperatorLeftOperand(node) {
  const parent = getParent(node);

  return (
    parent?.type === "BinaryExpression" &&
    parent.operator === "in" &&
    parent.left === node
  );
}

function isObjectKey(node) {
  const parent = getParent(node);

  return parent?.type === "Property" && parent.key === node && !parent.computed;
}

function isMemberPropertyName(node) {
  const parent = getParent(node);

  return parent?.type === "MemberExpression" && parent.property === node;
}

/**
 * Checks declaration containers and transparent runtime wrappers.
 * @param {object} parent - Enclosing node.
 * @param {object} current - Child expression.
 * @returns {*} Resolved name or context match.
 */
function isContainerNode(parent, current) {
  if (parent.type === "Property" && parent.value === current) {
    return true;
  }

  return (
    parent.type === "ArrayExpression" ||
    parent.type === "ObjectExpression" ||
    (TRANSPARENT_EXPRESSION_TYPES.has(parent.type) && parent.expression === current)
  );
}

function isExtractedConstantLiteral(node) {
  let current = node;

  while (getParent(current)) {
    const parent = getParent(current);

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

function isEqualityComparisonOperand(node) {
  const parent = getParent(node);

  if (parent?.type !== "BinaryExpression" || !EQUALITY_OPERATORS.has(parent.operator)) {
    return false;
  }

  return parent.left === node || parent.right === node;
}

function isSwitchCaseTest(node) {
  const parent = getParent(node);

  return parent?.type === "SwitchCase" && parent.test === node;
}

/**
 * Builds a static receiver path, including optional and computed member access.
 * @param {object} node - Callee expression.
 * @returns {string|null} Static path or null for dynamic expressions.
 */
function getCalleePath(node) {
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
 * @param {object} node - Argument after transparent wrappers.
 * @param {Array} sinkCallees - Configured sink names or descriptors.
 * @returns {boolean} Whether the argument is a configured contract.
 */
function isKnownSinkArgument(node, sinkCallees) {
  const parent = getParent(node);
  if (parent?.type !== "CallExpression") return false;
  const argumentIndex = parent.arguments.indexOf(node);
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
 * @param {*} node - Runtime property value.
 * @param {*} actionTypeCallees - Allowed dispatcher names.
 * @param {*} actionTypeProperty - Property carrying the action contract.
 * @returns {*} Whether this value is an action type.
 */
function isActionTypeProperty(node, actionTypeCallees, actionTypeProperty) {
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
    !callExpression.arguments.includes(argument)
  ) {
    return false;
  }

  const calleeName = getCalleeName(callExpression.callee);

  return calleeName !== null && actionTypeCallees.has(calleeName);
}

/**
 * Normalizes validated options without mutating caller configuration.
 * @param {*} rawOptions - User rule configuration.
 * @returns {*} Normalized lookup collections and sink descriptors.
 */
function normalizeOptions(rawOptions = {}) {
  const sinks = Array.isArray(rawOptions.sinks)
    ? rawOptions.sinks
    : DEFAULT_SINK_CALLEES;
  const actionTypeCallees = Array.isArray(rawOptions.actionTypeCallees)
    ? rawOptions.actionTypeCallees
    : DEFAULT_ACTION_TYPE_CALLEES;

  return {
    sinks,
    actionTypeCallees: new Set(actionTypeCallees),
    actionTypeProperty: rawOptions.actionTypeProperty ?? DEFAULT_ACTION_TYPE_PROPERTY,
    minDuplicates:
      typeof rawOptions.minDuplicates === "number"
        ? rawOptions.minDuplicates
        : DEFAULT_MIN_DUPLICATES,
    ignoreStrings: new Set(
      Array.isArray(rawOptions.ignoreStrings) ? rawOptions.ignoreStrings : []
    ),
  };
}

/**
 * Identifies presentation and declaration positions exempt from duplication.
 * @param {*} node - Original literal expression.
 * @param {*} sourceCode - ESLint source and scope information.
 * @returns {*} Whether the position is exempt.
 */
function isAllowlistedPosition(node, sourceCode) {
  return (
    isImportOrExportSource(node) ||
    isTypeOnlyLiteral(node) ||
    isEnumMemberInitializer(node) ||
    isInOperatorLeftOperand(node) ||
    isJsxAttributeValueLiteral(node) ||
    isVisibleJsxCopyLiteral(node) ||
    isSvgMarkupLiteral(node) ||
    isObjectKey(node) ||
    isMemberPropertyName(node) ||
    isExtractedConstantLiteral(node) ||
    isInsideNextFontLoaderCall(node, sourceCode)
  );
}

/** Transparent TypeScript wrappers preserve the runtime expression context. */
const TRANSPARENT_EXPRESSION_TYPES = new Set([
  "TSAsExpression", "TSSatisfiesExpression", "TSTypeAssertion", "TSNonNullExpression",
]);

/**
 * Follows transparent wrappers and branches that contribute an expression value.
 * @param {object} node - Original runtime expression.
 * @returns {object} Outermost expression receiving the literal value.
 */
function getContextNode(node) {
  let current = node;
  while (current.parent) {
    const parent = current.parent;
    const transparent = TRANSPARENT_EXPRESSION_TYPES.has(parent.type) && parent.expression === current;
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
 * @param {*} node - Original string expression.
 * @param {*} options - Normalized rule configuration.
 * @returns {*} Whether the expression participates in a behavioral contract.
 */
function isSuspiciousContext(node, options) {
  node = getContextNode(node);
  return (
    isEqualityComparisonOperand(node) ||
    isSwitchCaseTest(node) ||
    isKnownSinkArgument(node, options.sinks) ||
    isActionTypeProperty(node, options.actionTypeCallees, options.actionTypeProperty)
  );
}

/** Defines schema, diagnostics, and per-file string analysis for ESLint. */
const noMagicStringsRule = {
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Disallow magic string literals in comparisons, switch cases, action types, known behavioral sinks, or when duplicated, while ignoring structural literals",
    },
    schema: [
      {
        type: "object",
        properties: {
          sinks: {
            type: "array",
            items: {
              anyOf: [
                { type: "string" },
                {
                  type: "object",
                  properties: {
                    callee: { type: "string", minLength: 1 },
                    argumentIndex: { type: "integer", minimum: 0 },
                  },
                  required: ["callee", "argumentIndex"],
                  additionalProperties: false,
                },
              ],
            },
          },
          actionTypeCallees: {
            type: "array",
            items: { type: "string" },
          },
          actionTypeProperty: {
            type: "string",
          },
          minDuplicates: {
            type: "integer",
            minimum: 0,
          },
          ignoreStrings: {
            type: "array",
            items: { type: "string" },
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      noMagicString:
        "Extract this string literal into a named constant or configuration value; it participates in a comparison, switch case, action type, or a known behavioral sink.",
      duplicateString:
        'This string literal "{{value}}" is repeated {{count}} times; extract it into a named constant.',
    },
  },
  /**
   * Creates per-file visitors and deduplicates diagnostics.
   * @param {object} context - ESLint rule context.
   * @returns {object} AST visitors for string expressions and file completion.
   */
  create(context) {
    const options = normalizeOptions(context.options[0]);
    const duplicateCandidates = new Map();
    const reportedNodes = new Set();

    function collectDuplicateCandidate(value, node) {
      const existingNodes = duplicateCandidates.get(value);

      if (existingNodes) {
        existingNodes.push(node);
        return;
      }

      duplicateCandidates.set(value, [node]);
    }

    /**
     * Reports behavioral contracts and records eligible duplicate occurrences.
     * @param {object} node - Original literal used for diagnostic locations.
     * @param {string} value - Evaluated static string value.
     * @returns {void} Reports immediately or defers duplicate diagnostics.
     */
    function evaluateStringValue(node, value) {
      if (!value || options.ignoreStrings.has(value)) return;
      const contextNode = getContextNode(node);
      if (isDirectiveLiteral(node) || isTypeofComparisonLiteral(contextNode, value)) return;

      const suspicious = isSuspiciousContext(node, options);
      if (!suspicious && isAllowlistedPosition(node, context.sourceCode)) return;

      if (suspicious) {
        context.report({ node, messageId: "noMagicString" });
        reportedNodes.add(node);
      }
      // Single characters are exempt only from duplicate detection.
      if (value.length > SINGLE_CHARACTER_LENGTH && options.minDuplicates > 0) {
        collectDuplicateCandidate(value, node);
      }
    }

    return {
      Literal(node) {
        if (!isNonEmptyStringLiteral(node)) {
          return;
        }

        evaluateStringValue(node, node.value);
      },
      /**
       * Checks static templates and interpolated behavioral contracts.
       * @param {object} node - Template expression.
       * @returns {void} Emits applicable diagnostics.
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

        if (isSuspiciousContext(node, options)) {
          context.report({ node, messageId: "noMagicString" });
        }
      },
      /**
       * Reports duplicates once per previously unreported occurrence.
       * @returns {void} Emits deferred diagnostics.
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
              messageId: "duplicateString",
              data: { value, count: String(nodes.length) },
            });
          }
        }
      },
    };
  },
};

export default noMagicStringsRule;
