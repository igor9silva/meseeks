import { createRoute } from '@tanstack/react-router'
import { Card, CardContent } from '~/components/ui/card'
import { AIControls } from '~/components/actions/AIControls'
import { Route as RootRoute } from './__root'

export const Route = createRoute({
  getParentRoute: () => RootRoute,
  path: '/',
  component: () => (
    <div className="grid gap-4 p-4">
      <Card>
        <CardContent className="space-y-2">
          <h1 className="text-lg font-semibold">Meseeks Browser</h1>
          <p className="text-sm text-muted-foreground">Create a web tab, browse to app://local/welcome.html, or open external websites.</p>
        </CardContent>
      </Card>
      <AIControls />
    </div>
  )
})
