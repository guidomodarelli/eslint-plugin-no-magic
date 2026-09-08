# no-duplicate-strings

Reports repeated static strings within one file. Enabled as a warning in the
recommended preset. Messages include the count and first eligible line/column.

## Invalid

```js
label("pending");
label("pending");
label("pending");
```

## Valid

```js
const PENDING = "pending";
label(PENDING);
label(PENDING);
label(PENDING);
```

## Options

| Option | Default | Meaning |
| --- | --- | --- |
| `minDuplicates` | `3` | Nonnegative integer threshold; `0` disables detection. |
| `ignoreStrings` | `[]` | Exact values excluded from both counts and diagnostics. |
| `ignoreContracts` | `true` | Contract positions count but do not receive duplicate diagnostics. |
| `contractOptions` | Contract-rule defaults | Classification settings; accepts the [contract rule options](no-magic-contracts.md). |
| `ignoreSyntax` | All categories `true` | Independent `jsx`, `svg`, and `constDefinitions` exemptions. Set a category to `false` to include its values. |

```js
"no-magic/no-duplicate-strings": ["warn", {
  minDuplicates: 2,
  ignoreContracts: false,
  ignoreSyntax: { jsx: false, svg: true, constDefinitions: true },
}]
```

## Counts and configuration

In `track("event"); label("event"); label("event");`, the default rule reports
only the two `label` literals, each with a count of three. Contract suppression
is classification, not communication with another rule. Set `ignoreContracts`
to `false` to report duplicate contracts even when the contract rule is disabled.

`contractOptions.ignoreStrings` makes a value non-contractual for suppression;
it does not exclude the value from duplication. Use this rule's `ignoreStrings`
to remove a value entirely. `createConfig()` shares contract options automatically.

## Boundaries

Empty and single-character strings are excluded. Static templates participate;
interpolated templates do not have a known duplicate value. Counts are per file.
Imports, type declarations, directives, object keys, and property-name access
remain structural exclusions. JSX excludes SVG, which has its own switch.

The first occurrence may itself be suppressed as a contract. Long string previews
are shortened and escaped. No automatic extraction fix is offered.
