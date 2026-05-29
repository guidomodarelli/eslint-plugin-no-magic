import { describe, it } from "node:test";

import { RuleTester } from "eslint";
import tsParser from "@typescript-eslint/parser";

import rule from "../rules/no-magic-strings.js";

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

ruleTester.run("no-magic-strings", rule, {
  valid: [
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
});
