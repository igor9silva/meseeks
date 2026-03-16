/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as adapter from "../adapter.js";
import type * as component from "../component.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
  FunctionVisibility,
} from "convex/server";
import { anyApi, componentsGeneric } from "convex/server";

const fullApi: ApiFromModules<{
  adapter: typeof adapter;
  component: typeof component;
}> = anyApi as any;

type ByVisibility<API, V extends FunctionVisibility> = {
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
export const api: ByVisibility<typeof fullApi, "public"> = anyApi as any;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export const internal: ByVisibility<typeof fullApi, "internal"> = anyApi as any;

export const components = componentsGeneric() as unknown as {};
