# no-magic-contracts

Reports unnamed string values in comparisons, switch cases, action types, and
configured calls. Enabled as an error in the recommended preset.

## Invalid

```js
status === "pending";
dispatch({ type: "cart/add" });
router.push(ready ? "/checkout" : "/login");
```

## Valid

```js
const PENDING = "pending";
status === PENDING;
const ADD_ITEM = "cart/add";
dispatch({ type: ADD_ITEM });
typeof input === "string";
```

## Options

| Option | Default | Meaning |
| --- | --- | --- |
| `sinks` | Calls listed below | Strings match a method name or full static path and all string arguments. Descriptors `{ callee, argumentIndex }` select one zero-based argument. Replaces the default list. |
| `actionTypeCallees` | `["dispatch"]` | Bare or static member method names receiving action objects. |
| `actionTypeProperty` | `"type"` | Static object property carrying the action contract. |
| `ignoreStrings` | `[]` | Exact, case-sensitive values allowed in every contract context. |
| `structuralDiscriminants` | `[]` | Static property names, such as AST `type`, whose equality comparisons and `switch` cases are structural vocabulary rather than contracts. |

Default sinks: `track`, `trackEvent`, `sendEvent`, `logEvent`, `captureEvent`,
`isFeatureEnabled`, `isEnabled`, `getFlag`, `navigate`; argument 0 of `getItem`,
`setItem`, `removeItem`, `router.push`, and `router.replace`.

```js
"no-magic/no-magic-contracts": ["error", {
  sinks: [{ callee: "client.send", argumentIndex: 1 }],
  actionTypeCallees: ["emit"],
  actionTypeProperty: "kind",
  ignoreStrings: ["legacy"],
}]
```

## Boundaries

Checks static strings and nonempty interpolated templates in contract positions,
including TypeScript wrappers and value-producing conditional/logical branches.
Single-character nonempty contracts are included. Comparisons in JSX/SVG remain
contracts even when presentation values are exempt from duplicate detection.

Callee matching is syntactic: no type inference, import resolution, or alias
tracking. A configured method name may belong to an unrelated receiver. No
framework gets special treatment. `ignoreStrings` applies to known complete
static values, not dynamic interpolated templates.

`structuralDiscriminants` matches the property name only, through optional
chains and TypeScript wrappers: with `["type"]`, `node.type === "Identifier"`
and `action.type === "ADD_TODO"` are both exempt. Prefer narrow names, or omit
`type` in code where it carries action or message contracts. Shared through
`createConfig`, it also classifies duplicate and reuse rules.

No automatic fix is offered: naming and extraction scope require domain context.
For reuse suggestions see [prefer-existing-constant](prefer-existing-constant.md).
