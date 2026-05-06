import { createRouter } from '@tanstack/react-router'
import { NotFound } from '~/components/layout/NotFound'
import { RouterError } from '~/components/layout/RouterError'
import { routeTree } from './routeTree.gen'

export const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
  defaultErrorComponent: RouterError,
  defaultNotFoundComponent: NotFound
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
