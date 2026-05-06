import { z } from 'zod'

export const tabIdSchema = z.string().min(1)

export const tabNavigationEntrySchema = z.object({
  title: z.string().min(1),
  url: z.string().min(1),
  offset: z.number().int()
})

export const webTabSchema = z.object({
  id: tabIdSchema,
  kind: z.literal('web'),
  title: z.string(),
  url: z.string().min(1),
  faviconUrl: z.string().min(1).nullable(),
  isLoading: z.boolean(),
  backHistory: z.array(tabNavigationEntrySchema),
  forwardHistory: z.array(tabNavigationEntrySchema),
  canGoBack: z.boolean(),
  canGoForward: z.boolean()
})

export const localTabSchema = z.object({
  id: tabIdSchema,
  kind: z.literal('local'),
  title: z.string(),
  route: z.string().startsWith('/')
})

export const tabSchema = z.discriminatedUnion('kind', [webTabSchema, localTabSchema])

export const tabSnapshotSchema = z.object({
  windowId: z.number().int().nonnegative(),
  tabs: z.array(tabSchema),
  activeTabId: tabIdSchema.nullable()
})

export type TabSnapshot = z.infer<typeof tabSnapshotSchema>

export const browserHistoryEntrySchema = z.object({
  id: z.string().min(1),
  tabId: tabIdSchema,
  title: z.string().min(1),
  url: z.string().min(1),
  visitedAt: z.number().int().nonnegative()
})

export const browserHistorySchema = z.object({
  entries: z.array(browserHistoryEntrySchema)
})

export type BrowserHistory = z.infer<typeof browserHistorySchema>

export const createWebTabInputSchema = z.string().min(1)

export const createLocalTabInputSchema = z.object({
  route: z.string().startsWith('/'),
  title: z.string().min(1)
})

export const navigateTabInputSchema = z.object({
  tabId: tabIdSchema,
  url: z.string().min(1)
})

export const navigateOffsetInputSchema = z.object({
  tabId: tabIdSchema,
  offset: z.number().int()
})

export const reorderTabsInputSchema = z.object({
  tabIds: z.array(tabIdSchema).min(1)
})

export const chromeHeightInputSchema = z.number().int().min(64).max(512)

export const navigateLocalPayloadSchema = z.object({
  route: z.string().startsWith('/')
})

export const transferableWebTabSchema = z.object({
  kind: z.literal('web'),
  title: z.string().min(1),
  url: z.string().min(1)
})

export const transferableLocalTabSchema = z.object({
  kind: z.literal('local'),
  title: z.string().min(1),
  route: z.string().startsWith('/')
})

export const transferableTabSchema = z.discriminatedUnion('kind', [transferableWebTabSchema, transferableLocalTabSchema])

export type TransferableTab = z.infer<typeof transferableTabSchema>

export const importDroppedTabInputSchema = z.object({
  sourceTabId: tabIdSchema
})

export const rawNavigationInputSchema = z.string().trim().min(1)

export const httpNavigableUrlSchema = z
  .string()
  .url()
  .refine(value => value.startsWith('https://') || value.startsWith('http://'))

export const appNavigableUrlSchema = z.string().startsWith('app://')
