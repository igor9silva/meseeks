import { appNavigableUrlSchema, httpNavigableUrlSchema, rawNavigationInputSchema } from '../../shared/schemas/ipcSchema'

export function toNavigableUrl(input: string) {
  const parsedInput = rawNavigationInputSchema.safeParse(input)
  if (!parsedInput.success) return null

  const normalizedInput = parsedInput.data
  const appUrl = appNavigableUrlSchema.safeParse(normalizedInput)
  if (appUrl.success) return appUrl.data

  const target = /^https?:\/\//i.test(normalizedInput) ? normalizedInput : `https://${normalizedInput}`
  const parsedHttpUrl = httpNavigableUrlSchema.safeParse(target)
  if (!parsedHttpUrl.success) return null

  return parsedHttpUrl.data
}
