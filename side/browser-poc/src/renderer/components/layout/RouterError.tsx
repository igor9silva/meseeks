import type { ErrorComponentProps } from '@tanstack/react-router'

export function RouterError({ error }: ErrorComponentProps) {
  const message = error instanceof Error ? error.message : 'Unknown router error'

  return (
    <div className="flex h-full min-h-72 items-center justify-center p-6">
      <div className="max-w-lg space-y-2 text-center">
        <h2 className="text-xl font-semibold">Something broke</h2>
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  )
}
