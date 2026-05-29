/**
 * @fileoverview Flags "magic" string literals only when they participate in
 * logic, a protocol, or a business contract whose meaning should be named:
 * equality comparisons, `switch` cases, action types, known behavioral sinks
 * (analytics, storage, feature flags, routes), or string values duplicated
 * across the file. Literals that act as structural names (JSX attributes,
 * object keys, property access, imports, type unions, enum members, directives,
 * extracted constants, visible copy) are ignored by default.
 */

const DIRECTIVE_LITERALS = new Set(["use client", "use server"]);
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
  "ellipse",
  "g",
  "line",
  "path",
  "polygon",
  "polyline",
  "rect",
  "svg",
]);

const DEFAULT_SINK_CALLEES = [
  "track",
  "trackEvent",
  "sendEvent",
  "logEvent",
  "captureEvent",
  "getItem",
  "setItem",
  "removeItem",
  "isFeatureEnabled",
  "isEnabled",
  "getFlag",
  "navigate",
  "push",
  "replace",
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

function getCalleeName(callee) {
  if (callee.type === "Identifier") {
    return callee.name;
  }

  if (
    callee.type === "MemberExpression" &&
    !callee.computed &&
    callee.property?.type === "Identifier"
  ) {
    return callee.property.name;
  }

  return null;
}

function getPropertyKeyName(property) {
  if (property.computed) {
    return null;
  }

  if (property.key?.type === "Identifier") {
    return property.key.name;
  }

  if (property.key?.type === "Literal" && typeof property.key.value === "string") {
    return property.key.value;
  }

  return null;
}

function isImportedFromNextFont(callExpression, calleeName) {
  let current = callExpression;

  while (current) {
    const parent = getParent(current);

    if (!parent) {
      return false;
    }

    current = parent;

    if (current.type !== "Program") {
      continue;
    }

    return current.body.some((statement) => {
      if (statement.type !== "ImportDeclaration") {
        return false;
      }

      if (!statement.source.value.startsWith(NEXT_FONT_IMPORT_SOURCE_PREFIX)) {
        return false;
      }

      return statement.specifiers.some((specifier) => {
        if (
          specifier.type === "ImportSpecifier" ||
          specifier.type === "ImportDefaultSpecifier"
        ) {
          return specifier.local.name === calleeName;
        }

        return false;
      });
    });
  }

  return false;
}

function isInsideNextFontLoaderCall(node) {
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
      return isImportedFromNextFont(parent, parent.callee.name);
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

function isVisibleJsxCopyLiteral(node) {
  const parent = getParent(node);

  return (
    parent?.type === "JSXExpressionContainer" &&
    parent.parent?.type !== "JSXAttribute"
  );
}

function isSvgElementName(nameNode) {
  return nameNode?.type === "JSXIdentifier" && SVG_ELEMENT_NAMES.has(nameNode.name);
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

    if (parent.type === "JSXAttribute" && isInsideSvgOpeningElement(parent)) {
      return true;
    }

    current = parent;
  }

  return false;
}

function isDirectiveLiteral(node) {
  return (
    getParent(node)?.type === "ExpressionStatement" &&
    DIRECTIVE_LITERALS.has(node.value)
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

function isTypeofComparisonLiteral(node) {
  const parent = getParent(node);

  if (parent?.type !== "BinaryExpression") {
    return false;
  }

  if (!TYPEOF_RESULT_LITERALS.has(node.value)) {
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

function isContainerNode(parent, current) {
  if (parent.type === "Property" && parent.value === current) {
    return true;
  }

  return (
    parent.type === "ArrayExpression" ||
    parent.type === "ObjectExpression" ||
    parent.type === "TSAsExpression" ||
    parent.type === "TSSatisfiesExpression"
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

function isKnownSinkArgument(node, sinkCallees) {
  const parent = getParent(node);

  if (parent?.type !== "CallExpression" || !parent.arguments.includes(node)) {
    return false;
  }

  const calleeName = getCalleeName(parent.callee);

  return calleeName !== null && sinkCallees.has(calleeName);
}

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

  const callExpression = getParent(objectExpression);

  if (
    callExpression?.type !== "CallExpression" ||
    !callExpression.arguments.includes(objectExpression)
  ) {
    return false;
  }

  const calleeName = getCalleeName(callExpression.callee);

  return calleeName !== null && actionTypeCallees.has(calleeName);
}

function normalizeOptions(rawOptions = {}) {
  const sinks = Array.isArray(rawOptions.sinks)
    ? rawOptions.sinks
    : DEFAULT_SINK_CALLEES;
  const actionTypeCallees = Array.isArray(rawOptions.actionTypeCallees)
    ? rawOptions.actionTypeCallees
    : DEFAULT_ACTION_TYPE_CALLEES;

  return {
    sinks: new Set(sinks),
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

function isAllowlistedPosition(node) {
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
    isInsideNextFontLoaderCall(node)
  );
}

function isSuspiciousContext(node, options) {
  return (
    isEqualityComparisonOperand(node) ||
    isSwitchCaseTest(node) ||
    isKnownSinkArgument(node, options.sinks) ||
    isActionTypeProperty(node, options.actionTypeCallees, options.actionTypeProperty)
  );
}

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
            items: { type: "string" },
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
  create(context) {
    const options = normalizeOptions(context.options[0]);
    const duplicateCandidates = new Map();

    function collectDuplicateCandidate(value, node) {
      const existingNodes = duplicateCandidates.get(value);

      if (existingNodes) {
        existingNodes.push(node);
        return;
      }

      duplicateCandidates.set(value, [node]);
    }

    function evaluateStringValue(node, value) {
      if (value.length <= SINGLE_CHARACTER_LENGTH) {
        return;
      }

      if (options.ignoreStrings.has(value)) {
        return;
      }

      if (isDirectiveLiteral(node) || isTypeofComparisonLiteral(node)) {
        return;
      }

      if (isAllowlistedPosition(node)) {
        return;
      }

      if (isSuspiciousContext(node, options)) {
        context.report({ node, messageId: "noMagicString" });
        return;
      }

      collectDuplicateCandidate(value, node);
    }

    return {
      Literal(node) {
        if (!isNonEmptyStringLiteral(node)) {
          return;
        }

        evaluateStringValue(node, node.value);
      },
      TemplateLiteral(node) {
        const noSubstitutionText = getNoSubstitutionTemplateText(node);

        if (noSubstitutionText !== null) {
          evaluateStringValue(node, noSubstitutionText);
          return;
        }

        if (!hasStaticTemplateText(node)) {
          return;
        }

        if (isAllowlistedPosition(node)) {
          return;
        }

        if (isSuspiciousContext(node, options)) {
          context.report({ node, messageId: "noMagicString" });
        }
      },
      "Program:exit"() {
        if (options.minDuplicates <= 0) {
          return;
        }

        for (const [value, nodes] of duplicateCandidates) {
          if (nodes.length < options.minDuplicates) {
            continue;
          }

          for (const node of nodes) {
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
