import { createRoute } from '@tanstack/react-router'
import { Card, CardContent } from '~/components/ui/card'
import { Route as RootRoute } from './__root'

export const Route = createRoute({
  getParentRoute: () => RootRoute,
  path: '/settings',
  component: () => (
    <Card className="m-4">
      <CardContent className="space-y-2">
        <h2 className="text-lg font-semibold">Settings</h2>
        <p className="text-sm text-muted-foreground">POC controls for AI interception and cache behavior can be added here.</p>
      </CardContent>
    </Card>
  )
})
