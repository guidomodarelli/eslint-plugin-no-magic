# prefer-existing-constant

Suggests a visible string constant instead of an inline contract value. This
advisory rule is opt-in; the recommended preset does not enable it.

## Reported

```js
const PENDING = "pending";
status === "pending"; // Suggest PENDING.
```

## Valid

```js
const PENDING = "pending";
status === PENDING;
```

## Options

Accepts all [no-magic-contracts options](no-magic-contracts.md) plus:

| Option | Default | Meaning |
| --- | --- | --- |
| `ignoreConstantNames` | `[]` | Unique, exact, case-sensitive names never suggested. |

```js
"no-magic/prefer-existing-constant": ["warn", {
  sinks: ["send"],
  ignoreConstantNames: ["LOCAL_STATE"],
}]
```

Or use `createConfig({ contracts: { sinks: ["send"] }, reuse: true })` to share
contract classification with the other rules.

## Visibility and conservative exclusions

Candidates must be direct `const` identifiers initialized with a primitive string
or static template. Transparent TypeScript assertions are supported. Initializers
must end before the inline value's source position. The nearest eligible scope
and original declaration order determine which constant is suggested.

Parameters, destructuring bindings, imports, `let`, and later declarations still
shadow names. Destructuring, imported values, calls, concatenations, and dynamic
templates are not evaluated as candidate values. Excluded names still shadow.

Searches stop after the local scope of a hoisted function declaration, because
that function might execute before an outer constant initializes. Arrows and
function expressions created after a constant remain eligible. Dynamic `with`
environments stop outer searches. These guards intentionally omit some safe
suggestions rather than infer arbitrary invocation order.

Indexes are local to each rule invocation and are not shared across files.
Equal values do not prove equal business meaning. No automatic fix is offered.
When enabled together, this rule and the contract rule may both report a literal.
