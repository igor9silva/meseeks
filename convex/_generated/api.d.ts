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
import type * as action_lifecycle from "../action/lifecycle.js";
import type * as auth from "../auth.js";
import type * as babel from "../babel.js";
import type * as components_ from "../components.js";
import type * as drafts from "../drafts.js";
import type * as http from "../http.js";
import type * as magicRock from "../magicRock.js";
import type * as migrations from "../migrations.js";
import type * as schedule_lifecycle from "../schedule/lifecycle.js";
import type * as schedules from "../schedules.js";
import type * as skills from "../skills.js";
import type * as subscriptions from "../subscriptions.js";
import type * as tasks from "../tasks.js";
import type * as topUps from "../topUps.js";
import type * as transactions from "../transactions.js";
import type * as users from "../users.js";
import type * as users_preferences from "../users/preferences.js";
import type * as users_requests from "../users/requests.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  action: typeof action;
  "action/details": typeof action_details;
  "action/lifecycle": typeof action_lifecycle;
  auth: typeof auth;
  babel: typeof babel;
  components: typeof components_;
  drafts: typeof drafts;
  http: typeof http;
  magicRock: typeof magicRock;
  migrations: typeof migrations;
  "schedule/lifecycle": typeof schedule_lifecycle;
  schedules: typeof schedules;
  skills: typeof skills;
  subscriptions: typeof subscriptions;
  tasks: typeof tasks;
  topUps: typeof topUps;
  transactions: typeof transactions;
  users: typeof users;
  "users/preferences": typeof users_preferences;
  "users/requests": typeof users_requests;
}>;

type ByVisibility<API, V extends string> = {
  [K in keyof API as API[K] extends FunctionReference<any, V, any, any>
    ? K
    : API[K] extends FunctionReference<any, any, any, any>
      ? never
      : K]: API[K] extends FunctionReference<any, V, any, any>
    ? API[K]
    : ByVisibility<API[K], V>;
};

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: ByVisibility<typeof fullApi, "public">;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: ByVisibility<typeof fullApi, "internal">;

export declare const components: {
  migrations: {
    lib: {
      cancel: FunctionReference<
        "mutation",
        "internal",
        { name: string },
        {
          batchSize?: number;
          cursor?: string | null;
          error?: string;
          isDone: boolean;
          latestEnd?: number;
          latestStart: number;
          name: string;
          next?: Array<string>;
          processed: number;
          state: "inProgress" | "success" | "failed" | "canceled" | "unknown";
        }
      >;
      cancelAll: FunctionReference<
        "mutation",
        "internal",
        { sinceTs?: number },
        Array<{
          batchSize?: number;
          cursor?: string | null;
          error?: string;
          isDone: boolean;
          latestEnd?: number;
          latestStart: number;
          name: string;
          next?: Array<string>;
          processed: number;
          state: "inProgress" | "success" | "failed" | "canceled" | "unknown";
        }>
      >;
      clearAll: FunctionReference<
        "mutation",
        "internal",
        { before?: number },
        null
      >;
      getStatus: FunctionReference<
        "query",
        "internal",
        { limit?: number; names?: Array<string> },
        Array<{
          batchSize?: number;
          cursor?: string | null;
          error?: string;
          isDone: boolean;
          latestEnd?: number;
          latestStart: number;
          name: string;
          next?: Array<string>;
          processed: number;
          state: "inProgress" | "success" | "failed" | "canceled" | "unknown";
        }>
      >;
      migrate: FunctionReference<
        "mutation",
        "internal",
        {
          batchSize?: number;
          cursor?: string | null;
          dryRun: boolean;
          fnHandle: string;
          name: string;
          next?: Array<{ fnHandle: string; name: string }>;
        },
        {
          batchSize?: number;
          cursor?: string | null;
          error?: string;
          isDone: boolean;
          latestEnd?: number;
          latestStart: number;
          name: string;
          next?: Array<string>;
          processed: number;
          state: "inProgress" | "success" | "failed" | "canceled" | "unknown";
        }
      >;
    };
  };
};
