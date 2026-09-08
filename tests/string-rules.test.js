/** @file Exercises public rule behavior through the real ESLint RuleTester. */
import { describe, it } from "vitest";

import { RuleTester } from "eslint";
import tsParser from "@typescript-eslint/parser";

import plugin from "../dist/index.js";

RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester({
  languageOptions: {
    parser: tsParser,
    ecmaVersion: "latest",
    sourceType: "module",
    parserOptions: {
      ecmaFeatures: { jsx: true },
    },
  },
});

const noMagicString = { messageId: "noMagicString" };
const duplicateString = { messageId: "duplicateString" };

/** Shared input fixtures preserve regression coverage across both public rules. */
const cases = {
  valid: [
    { code: 'localStorage.setItem(KEY, "Texto libre"); sessionStorage.setItem(KEY, "Texto libre");' },
    { code: 'const node = <>{ready ? "Cargando" : "Cargando"}{other && "Cargando"}</>;', filename: "copy.tsx" },
    { code: 'function first(){"use strict";} function second(){"use strict";} function third(){"use strict";}' },
    { code: 'const first = <string>"pending"; const second = <string>"pending"; const third = <string>"pending";', filename: "constants.ts" },
    { code: 'router.push("condition" ? ROUTE_A : ROUTE_B);' },
    { code: 'store[method]({ [key]: "cart/add" });' },

    { code: 'input.replace("hello", "goodbye"); items.push("Visible copy");' },
    {
      code: 'client.send(key, "payload"); other.send("contract");',
      options: [{ sinks: [{ callee: "client.send", argumentIndex: 0 }] }],
    },
    { code: 'label("pending"); label("pending"); label("pending");', options: [{ minDuplicates: 0 }] },
    { code: 'label("A"); label("A"); label("A");' },
    { code: 'typeof input === ("string" as const); typeof input === `string`;' },
    { code: 'status === "A";', options: [{ ignoreStrings: ["A"] }] },

    { code: 'const STATES = { blocked: "blocked" } satisfies Record<string, string>;' },

    // Property-existence check: the literal names a property, not a value.
    { code: 'const allowed = "status" in payload;' },

    // JSX attribute values (string and expression-container forms).
    {
      code: '<Comp val="primary" />;',
      filename: "component.tsx",
    },
    {
      code: '<Button side="top" align="start" data-size={"compact"} />;',
      filename: "component.tsx",
    },

    // Visible JSX copy rendered through an expression container.
    {
      code: 'const node = <p>{"Texto visible para el usuario"}</p>;',
      filename: "component.tsx",
    },

    // SVG markup attributes for inline icons.
    {
      code: '<svg viewBox="0 0 24 24"><path d="M8 4h8" /></svg>;',
      filename: "icon.tsx",
    },
    {
      code: 'const frame = <svg aria-label="Invitación free" role="img" viewBox="0 0 40 40"><title>{"Invitación free"}</title><defs><linearGradient id={`free-ring-gradient-${frameId}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--free)" /><stop offset="100%" stopColor="var(--free-strong)" /></linearGradient><path id={`free-ring-text-${frameId}`} d="M2.13 15.21 A18.5 18.5 0 0 0 24.79 37.87" fill="none" /><clipPath id={`free-ring-clip-${frameId}`}><circle cx={20} cy={20} r={20} /></clipPath></defs><g clipPath={`url(#free-ring-clip-${frameId})`}><path d={isFree ? "M3.58 15.6 A17 17 0 0 0 24.4 36.42" : "M2.13 15.21 A18.5 18.5 0 0 0 24.79 37.87"} stroke={`url(#free-ring-gradient-${frameId})`} /><text><textPath href={`#free-ring-text-${frameId}`} startOffset="50%" textAnchor="middle">{"FREE"}</textPath></text></g></svg>;',
      filename: "avatar-frame.tsx",
    },

    // Module system sources are contracts owned by the bundler.
    { code: 'import { Button } from "@/components/ui/button";' },
    { code: 'export * from "./constants";' },
    { code: 'const mod = import("./lazy-module");' },

    // Runtime directives.
    { code: '"use client";' },
    { code: '"use server";' },

    // typeof comparison vocabulary.
    { code: 'const isText = typeof input === "string";' },

    // Extracted, named constants (the definition site, including `as const`).
    {
      code: 'export const TRIBE_ROUTES = { create: "/-/crear", detail: "/-/detalle" } as const;',
    },

    // Object keys and property-name access are structural names.
    { code: 'const config = { "aria-label": "Cerrar" };' },
    { code: 'const value = payload["status"];' },

    // TypeScript literal unions declare vocabulary.
    { code: 'type Status = "pending" | "approved" | "rejected";' },

    // Enum members already name their value.
    { code: 'enum EventName { Click = "click", Hover = "hover" }' },

    // next/font loader option strings.
    {
      code: 'import { Space_Grotesk } from "next/font/google"; const font = Space_Grotesk({ variable: "--font-sans", subsets: ["latin"], weight: ["400", "500"] });',
      filename: "layout.tsx",
    },

    // Human-readable, non-duplicated message: not a hidden contract.
    { code: 'function load() { throw new Error("No pudimos cargar la tribu"); }' },

    // Test descriptions are human copy, not behavioral sinks.
    { code: 'describe("renders the empty state", () => {});' },
    { code: 'it("opens the tribe menu", () => {});' },

    // A single occurrence below the duplicate threshold is allowed.
    { code: 'function read(status: string) { return mapStatus(status, "pending"); }' },

    // Custom ignoreStrings allowlist.
    {
      code: 'function read(status: string) { return status === "legacy_value"; }',
      options: [{ ignoreStrings: ["legacy_value"] }],
    },

    // Below a custom duplicate threshold.
    {
      code: 'const a = label("pending"); const b = label("pending");',
      options: [{ minDuplicates: 3 }],
    },
  ],
  invalid: [
    {
      code: 'import { Font as loadFont } from "next/font/google"; loadFont({ subsets: ["latin", "latin", "latin"] });',
      errors: [duplicateString, duplicateString, duplicateString],
    },
    { code: 'router.push(ready ? "/checkout" : "/login");', errors: [noMagicString, noMagicString] },
    { code: 'router.push(route || "/login");', errors: [noMagicString] },
    { code: 'router.push(ready ? ("/checkout" as const) : (route ?? "/login"));', errors: [noMagicString, noMagicString] },
    { code: 'store["dispatch"]({ type: "cart/add" });', errors: [noMagicString] },
    { code: 'dispatch({ ["type"]: "cart/add" });', errors: [noMagicString] },
    { code: 'localStorage.setItem("key", "value"); sessionStorage.getItem("key");', errors: [noMagicString, noMagicString] },
    { code: 'const node = <>{status === "loading" ? "Cargando" : "Listo"}</>;', filename: "copy.tsx", errors: [noMagicString] },
    { code: 'label("use strict"); label("use strict"); label("use strict");', errors: [duplicateString, duplicateString, duplicateString] },

    {
      code: 'const node = <Button disabled={status === "blocked"} />;',
      filename: "component.tsx",
      errors: [noMagicString],
    },
    {
      code: 'const node = <svg>{status === "blocked" && <path />}</svg>;',
      filename: "component.tsx",
      errors: [noMagicString],
    },
    {
      code: 'const node = <Button value={getItem("auth.token")} />;',
      filename: "component.tsx",
      errors: [noMagicString],
    },
    { code: 'status === ("blocked" as const);', errors: [noMagicString] },
    { code: 'status === ("blocked" satisfies string);', errors: [noMagicString] },
    { code: 'status === <string>"blocked";', filename: "example.ts", errors: [noMagicString] },
    { code: 'dispatch({type: "cart/add"} as const);', errors: [noMagicString] },
    { code: 'dispatch({type: "cart/add" as const} satisfies Action);', errors: [noMagicString] },
    { code: 'localStorage.getItem("auth.token" as string);', errors: [noMagicString] },
    { code: 'router.replace("/checkout", "presentation");', errors: [noMagicString] },
    { code: 'router?.push("/checkout");', errors: [noMagicString] },
    { code: 'router["push"]("/checkout");', errors: [noMagicString] },
    {
      code: 'client.send("contract", "payload");',
      options: [{ sinks: [{ callee: "client.send", argumentIndex: 0 }] }],
      errors: [noMagicString],
    },
    {
      code: 'client.send("payload", "contract");',
      options: [{ sinks: [{ callee: "client.send", argumentIndex: 1 }] }],
      errors: [noMagicString],
    },
    {
      code: 'items.push("legacy");',
      options: [{ sinks: ["push"] }],
      errors: [noMagicString],
    },
    {
      code: 'status === "pending"; label("pending"); label("pending");',
      errors: [noMagicString,
        { messageId: "duplicateString", data: { value: '"pending"', count: "3", firstLocation: "1:12" } },
        { messageId: "duplicateString", data: { value: '"pending"', count: "3", firstLocation: "1:12" } }],
    },
    { code: 'status === "A"; dispatch({type: "B"}); router.push("/");', errors: [noMagicString, noMagicString, noMagicString] },
    {
      code: 'import { Font } from "next/font/google"; function render(Font) { Font("contract"); Font("contract"); Font("contract"); }',
      errors: [duplicateString, duplicateString, duplicateString],
    },

    // Equality / inequality comparisons against domain values.
    {
      code: 'function resolve(status: string) { return status === "hidden"; }',
      errors: [noMagicString],
    },
    {
      code: 'function resolve(role: string) { return role !== "admin"; }',
      errors: [noMagicString],
    },

    // switch cases describing domain variants.
    {
      code: 'function pick(kind: string) { switch (kind) { case "credit_card": return 1; default: return 0; } }',
      errors: [noMagicString],
    },

    // Analytics / event sinks.
    {
      code: 'function onPay() { track("checkout_pay_click"); }',
      errors: [noMagicString],
    },

    // Redux-style action types.
    {
      code: 'function add() { dispatch({ type: "cart/add_item" }); }',
      errors: [noMagicString],
    },

    // Storage keys.
    {
      code: 'function read() { return localStorage.getItem("auth.token"); }',
      errors: [noMagicString],
    },

    // Feature flags.
    {
      code: 'function gate() { return isFeatureEnabled("new_checkout"); }',
      errors: [noMagicString],
    },

    // Route navigation, including template routes.
    {
      code: 'function go() { router.push("/checkout/success"); }',
      filename: "component.tsx",
      errors: [noMagicString],
    },
    {
      code: 'function open(slug: string) { router.push(`/tribus/${slug}`); }',
      filename: "component.tsx",
      errors: [noMagicString],
    },

    // No-substitution template literal used as a control value.
    {
      code: "function resolve(status: string) { return status === `hidden`; }",
      errors: [noMagicString],
    },

    // Behavioral string inside a JSX handler body (not an attribute value).
    {
      code: "const node = <button onClick={() => router.push(\"/-/crear\")}>Abrir</button>;",
      filename: "component.tsx",
      errors: [noMagicString],
    },
    {
      code: 'const node = <svg onClick={() => router.push("/-/crear")}><path d="M8 4h8" /></svg>;',
      filename: "icon.tsx",
      errors: [noMagicString],
    },

    // Duplicated domain value across non-allowlisted positions.
    {
      code: 'const a = label("pending"); const b = label("pending"); const c = label("pending");',
      errors: [duplicateString, duplicateString, duplicateString],
    },

    // Custom sink list.
    {
      code: 'function read() { return readConfig("campaign_id"); }',
      options: [{ sinks: ["readConfig"] }],
      errors: [noMagicString],
    },

    // Custom duplicate threshold lowered to 2.
    {
      code: 'const a = label("pending"); const b = label("pending");',
      options: [{ minDuplicates: 2 }],
      errors: [duplicateString, duplicateString],
    },

    // Custom action-type callee.
    {
      code: 'function add() { send({ type: "cart/add_item" }); }',
      options: [{ actionTypeCallees: ["send"] }],
      errors: [noMagicString],
    },
  ],
};

for (const [ruleName, messageId] of [
  ["no-magic-contracts", "noMagicString"],
  ["no-duplicate-strings", "duplicateString"],
]) {
  const valid = [];
  const invalid = [];
  for (const testCase of [...cases.valid, ...cases.invalid]) {
    const { errors = [], options = [{}], ...input } = testCase;
    const { minDuplicates, ...contractOptions } = options[0];
    const ruleOptions = ruleName === "no-magic-contracts" ? contractOptions : {
      ...(minDuplicates === undefined ? {} : { minDuplicates }),
      ignoreStrings: contractOptions.ignoreStrings ?? [],
      contractOptions,
    };
    const expectedErrors = errors.filter((error) => error.messageId === messageId);
    const configured = { ...input, options: [ruleOptions] };
    if (expectedErrors.length) invalid.push({ ...configured, errors: expectedErrors });
    else valid.push(configured);
  }
  // Removing unrelated options can make previously distinct cases identical.
  const uniqueValid = [...new Map(valid.map((testCase) => [JSON.stringify(testCase), testCase])).values()];
  ruleTester.run(ruleName, plugin.rules[ruleName], { valid: uniqueValid, invalid });
}
