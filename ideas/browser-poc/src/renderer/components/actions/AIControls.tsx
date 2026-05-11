import { Card, CardContent } from '~/components/ui/card'
import { useAIProcessor } from '~/hooks/useAIProcessor'

export function AIControls() {
  const ai = useAIProcessor()

  return (
    <Card>
      <CardContent className="space-y-2 text-sm">
        <p className="font-medium">AI preprocessing: {ai.enabled ? 'active' : 'idle'}</p>
        <p className="text-muted-foreground">{ai.description}</p>
      </CardContent>
    </Card>
  )
}
