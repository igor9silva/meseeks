/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as action_details from "../action/details.js";
import type * as actions from "../actions.js";
import type * as babel from "../babel.js";
import type * as betterAuthTriggers from "../betterAuthTriggers.js";
import type * as files from "../files.js";
import type * as http from "../http.js";
import type * as migrations from "../migrations.js";
import type * as pages from "../pages.js";
import type * as polarEvents from "../polarEvents.js";
import type * as reactor from "../reactor.js";
import type * as skills from "../skills.js";
import type * as topUps from "../topUps.js";
import type * as triggers from "../triggers.js";
import type * as users from "../users.js";
import type * as users_requests from "../users/requests.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "action/details": typeof action_details;
  actions: typeof actions;
  babel: typeof babel;
  betterAuthTriggers: typeof betterAuthTriggers;
  files: typeof files;
  http: typeof http;
  migrations: typeof migrations;
  pages: typeof pages;
  polarEvents: typeof polarEvents;
  reactor: typeof reactor;
  skills: typeof skills;
  topUps: typeof topUps;
  triggers: typeof triggers;
  users: typeof users;
  "users/requests": typeof users_requests;
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
