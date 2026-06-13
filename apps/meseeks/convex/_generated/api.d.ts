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
import type * as boxes from "../boxes.js";
import type * as changesets from "../changesets.js";
import type * as fileTransactions from "../fileTransactions.js";
import type * as files from "../files.js";
import type * as http from "../http.js";
import type * as magicRock from "../magicRock.js";
import type * as migrations from "../migrations.js";
import type * as reactor from "../reactor.js";
import type * as seed from "../seed.js";
import type * as skills from "../skills.js";
import type * as topUps from "../topUps.js";
import type * as transactions from "../transactions.js";
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
  boxes: typeof boxes;
  changesets: typeof changesets;
  fileTransactions: typeof fileTransactions;
  files: typeof files;
  http: typeof http;
  magicRock: typeof magicRock;
  migrations: typeof migrations;
  reactor: typeof reactor;
  seed: typeof seed;
  skills: typeof skills;
  topUps: typeof topUps;
  transactions: typeof transactions;
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
