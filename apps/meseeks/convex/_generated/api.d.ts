/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as action from "../action.js";
import type * as action_details from "../action/details.js";
import type * as babel from "../babel.js";
import type * as betterAuthTriggers from "../betterAuthTriggers.js";
import type * as components_ from "../components.js";
import type * as drafts from "../drafts.js";
import type * as http from "../http.js";
import type * as magicRock from "../magicRock.js";
import type * as migrations from "../migrations.js";
import type * as reactor from "../reactor.js";
import type * as schedule_lifecycle from "../schedule/lifecycle.js";
import type * as schedules from "../schedules.js";
import type * as seed from "../seed.js";
import type * as skills from "../skills.js";
import type * as subscriptions from "../subscriptions.js";
import type * as tasks from "../tasks.js";
import type * as topUps from "../topUps.js";
import type * as transactions from "../transactions.js";
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
  action: typeof action;
  "action/details": typeof action_details;
  babel: typeof babel;
  betterAuthTriggers: typeof betterAuthTriggers;
  components: typeof components_;
  drafts: typeof drafts;
  http: typeof http;
  magicRock: typeof magicRock;
  migrations: typeof migrations;
  reactor: typeof reactor;
  "schedule/lifecycle": typeof schedule_lifecycle;
  schedules: typeof schedules;
  seed: typeof seed;
  skills: typeof skills;
  subscriptions: typeof subscriptions;
  tasks: typeof tasks;
  topUps: typeof topUps;
  transactions: typeof transactions;
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
