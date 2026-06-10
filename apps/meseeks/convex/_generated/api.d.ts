/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as actions from "../actions.js";
import type * as babel from "../babel.js";
import type * as betterAuthTriggers from "../betterAuthTriggers.js";
import type * as drafts from "../drafts.js";
import type * as endpoints from "../endpoints.js";
import type * as fileCommands from "../fileCommands.js";
import type * as fileContent from "../fileContent.js";
import type * as fileViews from "../fileViews.js";
import type * as files from "../files.js";
import type * as http from "../http.js";
import type * as indexes from "../indexes.js";
import type * as loops from "../loops.js";
import type * as magicRock from "../magicRock.js";
import type * as migrations from "../migrations.js";
import type * as reads from "../reads.js";
import type * as routes from "../routes.js";
import type * as runtime from "../runtime.js";
import type * as runtimeState from "../runtimeState.js";
import type * as seed from "../seed.js";
import type * as skills from "../skills.js";
import type * as subscriptions from "../subscriptions.js";
import type * as topUps from "../topUps.js";
import type * as transactions from "../transactions.js";
import type * as triggerIsolate from "../triggerIsolate.js";
import type * as triggerIsolateState from "../triggerIsolateState.js";
import type * as triggers from "../triggers.js";
import type * as users from "../users.js";
import type * as users_preferences from "../users/preferences.js";
import type * as users_requests from "../users/requests.js";
import type * as users_themes from "../users/themes.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  actions: typeof actions;
  babel: typeof babel;
  betterAuthTriggers: typeof betterAuthTriggers;
  drafts: typeof drafts;
  endpoints: typeof endpoints;
  fileCommands: typeof fileCommands;
  fileContent: typeof fileContent;
  fileViews: typeof fileViews;
  files: typeof files;
  http: typeof http;
  indexes: typeof indexes;
  loops: typeof loops;
  magicRock: typeof magicRock;
  migrations: typeof migrations;
  reads: typeof reads;
  routes: typeof routes;
  runtime: typeof runtime;
  runtimeState: typeof runtimeState;
  seed: typeof seed;
  skills: typeof skills;
  subscriptions: typeof subscriptions;
  topUps: typeof topUps;
  transactions: typeof transactions;
  triggerIsolate: typeof triggerIsolate;
  triggerIsolateState: typeof triggerIsolateState;
  triggers: typeof triggers;
  users: typeof users;
  "users/preferences": typeof users_preferences;
  "users/requests": typeof users_requests;
  "users/themes": typeof users_themes;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  betterAuth: import("../betterAuth/_generated/component.js").ComponentApi<"betterAuth">;
  migrations: import("@convex-dev/migrations/_generated/component.js").ComponentApi<"migrations">;
};
