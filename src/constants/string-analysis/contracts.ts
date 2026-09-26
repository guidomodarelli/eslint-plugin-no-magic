/** @module constants/string-analysis/contracts Defines default string contract sinks and the reasons reported for them. */
import type { SinkDescriptor } from "../../types.js";

/** Analytics calls whose event names are behavioral contracts. */
export const ANALYTICS_TRACK_CALLEE = "track" as const;
export const ANALYTICS_TRACK_EVENT_CALLEE = "trackEvent" as const;
export const ANALYTICS_SEND_EVENT_CALLEE = "sendEvent" as const;
export const ANALYTICS_LOG_EVENT_CALLEE = "logEvent" as const;
export const ANALYTICS_CAPTURE_EVENT_CALLEE = "captureEvent" as const;

/** Web Storage methods whose first argument is a persisted key. */
export const STORAGE_GET_ITEM_CALLEE = "getItem" as const;
export const STORAGE_SET_ITEM_CALLEE = "setItem" as const;
export const STORAGE_REMOVE_ITEM_CALLEE = "removeItem" as const;

/** Feature-flag lookups whose argument identifies a flag. */
export const FEATURE_FLAG_IS_FEATURE_ENABLED_CALLEE = "isFeatureEnabled" as const;
export const FEATURE_FLAG_IS_ENABLED_CALLEE = "isEnabled" as const;
export const FEATURE_FLAG_GET_FLAG_CALLEE = "getFlag" as const;

/** Navigation methods; `push` and `replace` are defaults only through an explicit router receiver. */
export const NAVIGATION_NAVIGATE_CALLEE = "navigate" as const;
export const NAVIGATION_PUSH_CALLEE = "push" as const;
export const NAVIGATION_REPLACE_CALLEE = "replace" as const;
export const ROUTER_PUSH_CALLEE_PATH = "router.push" as const;
export const ROUTER_REPLACE_CALLEE_PATH = "router.replace" as const;

/** Default contract calls; routing requires an explicit receiver. */
export const DEFAULT_SINK_CALLEES: ReadonlyArray<string | SinkDescriptor> = [
  ANALYTICS_TRACK_CALLEE,
  ANALYTICS_TRACK_EVENT_CALLEE,
  ANALYTICS_SEND_EVENT_CALLEE,
  ANALYTICS_LOG_EVENT_CALLEE,
  ANALYTICS_CAPTURE_EVENT_CALLEE,
  { callee: STORAGE_GET_ITEM_CALLEE, argumentIndex: 0 },
  { callee: STORAGE_SET_ITEM_CALLEE, argumentIndex: 0 },
  { callee: STORAGE_REMOVE_ITEM_CALLEE, argumentIndex: 0 },
  FEATURE_FLAG_IS_FEATURE_ENABLED_CALLEE,
  FEATURE_FLAG_IS_ENABLED_CALLEE,
  FEATURE_FLAG_GET_FLAG_CALLEE,
  NAVIGATION_NAVIGATE_CALLEE,
  { callee: ROUTER_PUSH_CALLEE_PATH, argumentIndex: 0 },
  { callee: ROUTER_REPLACE_CALLEE_PATH, argumentIndex: 0 },
];

/** Callee names grouped by the contract reason they explain. */
export const STORAGE_CALLEES: ReadonlyArray<string> = [STORAGE_GET_ITEM_CALLEE, STORAGE_SET_ITEM_CALLEE, STORAGE_REMOVE_ITEM_CALLEE];
export const NAVIGATION_CALLEES: ReadonlyArray<string> = [NAVIGATION_PUSH_CALLEE, NAVIGATION_REPLACE_CALLEE, NAVIGATION_NAVIGATE_CALLEE];
export const FEATURE_FLAG_CALLEES: ReadonlyArray<string> = [FEATURE_FLAG_GET_FLAG_CALLEE, FEATURE_FLAG_IS_FEATURE_ENABLED_CALLEE, FEATURE_FLAG_IS_ENABLED_CALLEE];

/** Dispatchers whose action objects carry a type contract. */
export const DEFAULT_ACTION_TYPE_CALLEES: ReadonlyArray<string> = ["dispatch"];
/** Action object property carrying the dispatched type. */
export const DEFAULT_ACTION_TYPE_PROPERTY = "type";

/** Reasons interpolated into `noMagicString` diagnostics. */
export const CONTRACT_REASONS = {
  comparison: "comparison value",
  switchCase: "switch case value",
  actionType: "action type",
  storageKey: "storage key",
  navigation: "navigation argument",
  featureFlag: "feature flag identifier",
  configuredCall: "configured call argument",
} as const;

/** Equality and inequality operators whose string operands act as comparison values. */
export const EQUALITY_OPERATORS: ReadonlySet<string> = new Set(["===", "!==", "==", "!="]);

/** Standardized `typeof` results, exempt from comparison contracts. */
export const TYPEOF_RESULT_LITERALS: ReadonlySet<string> = new Set([
  "bigint",
  "boolean",
  "function",
  "number",
  "object",
  "string",
  "symbol",
  "undefined",
]);
