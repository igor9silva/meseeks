import { createRoute } from '@tanstack/react-router'
import { Clock3, ExternalLink } from 'lucide-react'
import { Card, CardContent } from '~/components/ui/card'
import { Button } from '~/components/ui/button'
import { useHistory } from '~/hooks/useHistory'
import { useTabs } from '~/hooks/useTabs'
import { Route as RootRoute } from './__root'

export const Route = createRoute({
  getParentRoute: () => RootRoute,
  path: '/history',
  component: HistoryRoute
})

function HistoryRoute() {
  const { entries } = useHistory()
  const { createWebTab } = useTabs()

  return (
    <Card className="m-4">
      <CardContent className="space-y-4 p-5">
        <div className="flex items-center gap-2">
          <Clock3 className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-lg font-semibold">History</h2>
        </div>
        {entries.length === 0 ? <p className="text-sm text-muted-foreground">No history yet.</p> : null}
        <div className="space-y-2">
          {entries.map(entry => (
            <div key={entry.id} className="flex items-center justify-between rounded-2xl border border-border bg-muted/30 px-3 py-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{entry.title}</p>
                <p className="truncate text-xs text-muted-foreground">{entry.url}</p>
              </div>
              <div className="ml-3 flex items-center gap-3">
                <span className="whitespace-nowrap text-xs text-muted-foreground">{new Date(entry.visitedAt).toLocaleString()}</span>
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => {
                    void createWebTab(entry.url)
                  }}
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
