/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as action_lifecycle_private from "../action/lifecycle/private.js";
import type * as action_private from "../action/private.js";
import type * as action_public from "../action/public.js";
import type * as action_details_private from "../action_details/private.js";
import type * as action_details_public from "../action_details/public.js";
import type * as auth from "../auth.js";
import type * as components_private from "../components/private.js";
import type * as components_public from "../components/public.js";
import type * as http from "../http.js";
import type * as lib_babel from "../lib/babel.js";
import type * as lib_cron from "../lib/cron.js";
import type * as lib_date from "../lib/date.js";
import type * as lib_errors from "../lib/errors.js";
import type * as lib_money from "../lib/money.js";
import type * as lib_polar from "../lib/polar.js";
import type * as lib_zodToString from "../lib/zodToString.js";
import type * as lib from "../lib.js";
import type * as magicRock_public from "../magicRock/public.js";
import type * as magicRock from "../magicRock.js";
import type * as migrations from "../migrations.js";
import type * as schedules_lifecycle from "../schedules/lifecycle.js";
import type * as schedules_private from "../schedules/private.js";
import type * as schedules_public from "../schedules/public.js";
import type * as schemas_actionDetailSchema from "../schemas/actionDetailSchema.js";
import type * as schemas_actionSchema from "../schemas/actionSchema.js";
import type * as schemas_authorSchema from "../schemas/authorSchema.js";
import type * as schemas_componentSchema from "../schemas/componentSchema.js";
import type * as schemas_envSchema from "../schemas/envSchema.js";
import type * as schemas_intelligenceSchema from "../schemas/intelligenceSchema.js";
import type * as schemas_paginationOptionsSchema from "../schemas/paginationOptionsSchema.js";
import type * as schemas_polarEventSchema from "../schemas/polarEventSchema.js";
import type * as schemas_scheduleSchema from "../schemas/scheduleSchema.js";
import type * as schemas_skillSchema from "../schemas/skillSchema.js";
import type * as schemas_subscriptionSchema from "../schemas/subscriptionSchema.js";
import type * as schemas_taskSchema from "../schemas/taskSchema.js";
import type * as schemas_toolSchema from "../schemas/toolSchema.js";
import type * as schemas_topUpSchema from "../schemas/topUpSchema.js";
import type * as schemas_transactionSchema from "../schemas/transactionSchema.js";
import type * as schemas_userSchema from "../schemas/userSchema.js";
import type * as skills_builtIn_askForClarification from "../skills/builtIn/askForClarification.js";
import type * as skills_builtIn_cancelSchedule from "../skills/builtIn/cancelSchedule.js";
import type * as skills_builtIn_createSkill from "../skills/builtIn/createSkill.js";
import type * as skills_builtIn_decreaseBudget from "../skills/builtIn/decreaseBudget.js";
import type * as skills_builtIn_discard from "../skills/builtIn/discard.js";
import type * as skills_builtIn_divide from "../skills/builtIn/divide.js";
import type * as skills_builtIn_done from "../skills/builtIn/done.js";
import type * as skills_builtIn_getSkillDetails from "../skills/builtIn/getSkillDetails.js";
import type * as skills_builtIn_increaseBudget from "../skills/builtIn/increaseBudget.js";
import type * as skills_builtIn_index from "../skills/builtIn/index.js";
import type * as skills_builtIn_justSay from "../skills/builtIn/justSay.js";
import type * as skills_builtIn_lookAtMe from "../skills/builtIn/lookAtMe.js";
import type * as skills_builtIn_moveTask from "../skills/builtIn/moveTask.js";
import type * as skills_builtIn_multiply from "../skills/builtIn/multiply.js";
import type * as skills_builtIn_reason from "../skills/builtIn/reason.js";
import type * as skills_builtIn_render from "../skills/builtIn/render.js";
import type * as skills_builtIn_reopen from "../skills/builtIn/reopen.js";
import type * as skills_builtIn_requestBudget from "../skills/builtIn/requestBudget.js";
import type * as skills_builtIn_requestIteration from "../skills/builtIn/requestIteration.js";
import type * as skills_builtIn_resolve from "../skills/builtIn/resolve.js";
import type * as skills_builtIn_say from "../skills/builtIn/say.js";
import type * as skills_builtIn_schedule from "../skills/builtIn/schedule.js";
import type * as skills_builtIn_scheduledIteration from "../skills/builtIn/scheduledIteration.js";
import type * as skills_builtIn_setUserInfo from "../skills/builtIn/setUserInfo.js";
import type * as skills_builtIn_stop from "../skills/builtIn/stop.js";
import type * as skills_builtIn_subtract from "../skills/builtIn/subtract.js";
import type * as skills_builtIn_sum from "../skills/builtIn/sum.js";
import type * as skills_builtIn_updateInstructions from "../skills/builtIn/updateInstructions.js";
import type * as skills_builtIn_updateSkill from "../skills/builtIn/updateSkill.js";
import type * as skills_createAITool from "../skills/createAITool.js";
import type * as skills_createBuiltInTool from "../skills/createBuiltInTool.js";
import type * as skills_createHttpTool from "../skills/createHttpTool.js";
import type * as skills_createReactions from "../skills/createReactions.js";
import type * as skills_defineSkill from "../skills/defineSkill.js";
import type * as skills_private from "../skills/private.js";
import type * as skills_public from "../skills/public.js";
import type * as skills_tools from "../skills/tools.js";
import type * as subscriptions_private from "../subscriptions/private.js";
import type * as subscriptions_public from "../subscriptions/public.js";
import type * as tasks_private from "../tasks/private.js";
import type * as tasks_public from "../tasks/public.js";
import type * as topUps_private from "../topUps/private.js";
import type * as topUps_public from "../topUps/public.js";
import type * as transactions_private from "../transactions/private.js";
import type * as transactions_public from "../transactions/public.js";
import type * as users_preferences_private from "../users/preferences/private.js";
import type * as users_preferences_public from "../users/preferences/public.js";
import type * as users_private from "../users/private.js";
import type * as users_public from "../users/public.js";
import type * as users_requests_private from "../users/requests/private.js";
import type * as users_requests_public from "../users/requests/public.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  "action/lifecycle/private": typeof action_lifecycle_private;
  "action/private": typeof action_private;
  "action/public": typeof action_public;
  "action_details/private": typeof action_details_private;
  "action_details/public": typeof action_details_public;
  auth: typeof auth;
  "components/private": typeof components_private;
  "components/public": typeof components_public;
  http: typeof http;
  "lib/babel": typeof lib_babel;
  "lib/cron": typeof lib_cron;
  "lib/date": typeof lib_date;
  "lib/errors": typeof lib_errors;
  "lib/money": typeof lib_money;
  "lib/polar": typeof lib_polar;
  "lib/zodToString": typeof lib_zodToString;
  lib: typeof lib;
  "magicRock/public": typeof magicRock_public;
  magicRock: typeof magicRock;
  migrations: typeof migrations;
  "schedules/lifecycle": typeof schedules_lifecycle;
  "schedules/private": typeof schedules_private;
  "schedules/public": typeof schedules_public;
  "schemas/actionDetailSchema": typeof schemas_actionDetailSchema;
  "schemas/actionSchema": typeof schemas_actionSchema;
  "schemas/authorSchema": typeof schemas_authorSchema;
  "schemas/componentSchema": typeof schemas_componentSchema;
  "schemas/envSchema": typeof schemas_envSchema;
  "schemas/intelligenceSchema": typeof schemas_intelligenceSchema;
  "schemas/paginationOptionsSchema": typeof schemas_paginationOptionsSchema;
  "schemas/polarEventSchema": typeof schemas_polarEventSchema;
  "schemas/scheduleSchema": typeof schemas_scheduleSchema;
  "schemas/skillSchema": typeof schemas_skillSchema;
  "schemas/subscriptionSchema": typeof schemas_subscriptionSchema;
  "schemas/taskSchema": typeof schemas_taskSchema;
  "schemas/toolSchema": typeof schemas_toolSchema;
  "schemas/topUpSchema": typeof schemas_topUpSchema;
  "schemas/transactionSchema": typeof schemas_transactionSchema;
  "schemas/userSchema": typeof schemas_userSchema;
  "skills/builtIn/askForClarification": typeof skills_builtIn_askForClarification;
  "skills/builtIn/cancelSchedule": typeof skills_builtIn_cancelSchedule;
  "skills/builtIn/createSkill": typeof skills_builtIn_createSkill;
  "skills/builtIn/decreaseBudget": typeof skills_builtIn_decreaseBudget;
  "skills/builtIn/discard": typeof skills_builtIn_discard;
  "skills/builtIn/divide": typeof skills_builtIn_divide;
  "skills/builtIn/done": typeof skills_builtIn_done;
  "skills/builtIn/getSkillDetails": typeof skills_builtIn_getSkillDetails;
  "skills/builtIn/increaseBudget": typeof skills_builtIn_increaseBudget;
  "skills/builtIn/index": typeof skills_builtIn_index;
  "skills/builtIn/justSay": typeof skills_builtIn_justSay;
  "skills/builtIn/lookAtMe": typeof skills_builtIn_lookAtMe;
  "skills/builtIn/moveTask": typeof skills_builtIn_moveTask;
  "skills/builtIn/multiply": typeof skills_builtIn_multiply;
  "skills/builtIn/reason": typeof skills_builtIn_reason;
  "skills/builtIn/render": typeof skills_builtIn_render;
  "skills/builtIn/reopen": typeof skills_builtIn_reopen;
  "skills/builtIn/requestBudget": typeof skills_builtIn_requestBudget;
  "skills/builtIn/requestIteration": typeof skills_builtIn_requestIteration;
  "skills/builtIn/resolve": typeof skills_builtIn_resolve;
  "skills/builtIn/say": typeof skills_builtIn_say;
  "skills/builtIn/schedule": typeof skills_builtIn_schedule;
  "skills/builtIn/scheduledIteration": typeof skills_builtIn_scheduledIteration;
  "skills/builtIn/setUserInfo": typeof skills_builtIn_setUserInfo;
  "skills/builtIn/stop": typeof skills_builtIn_stop;
  "skills/builtIn/subtract": typeof skills_builtIn_subtract;
  "skills/builtIn/sum": typeof skills_builtIn_sum;
  "skills/builtIn/updateInstructions": typeof skills_builtIn_updateInstructions;
  "skills/builtIn/updateSkill": typeof skills_builtIn_updateSkill;
  "skills/createAITool": typeof skills_createAITool;
  "skills/createBuiltInTool": typeof skills_createBuiltInTool;
  "skills/createHttpTool": typeof skills_createHttpTool;
  "skills/createReactions": typeof skills_createReactions;
  "skills/defineSkill": typeof skills_defineSkill;
  "skills/private": typeof skills_private;
  "skills/public": typeof skills_public;
  "skills/tools": typeof skills_tools;
  "subscriptions/private": typeof subscriptions_private;
  "subscriptions/public": typeof subscriptions_public;
  "tasks/private": typeof tasks_private;
  "tasks/public": typeof tasks_public;
  "topUps/private": typeof topUps_private;
  "topUps/public": typeof topUps_public;
  "transactions/private": typeof transactions_private;
  "transactions/public": typeof transactions_public;
  "users/preferences/private": typeof users_preferences_private;
  "users/preferences/public": typeof users_preferences_public;
  "users/private": typeof users_private;
  "users/public": typeof users_public;
  "users/requests/private": typeof users_requests_private;
  "users/requests/public": typeof users_requests_public;
}>;
declare const fullApiWithMounts: typeof fullApi;

export declare const api: FilterApi<
  typeof fullApiWithMounts,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApiWithMounts,
  FunctionReference<any, "internal">
>;

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
