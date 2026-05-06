export function NotFound() {
  return (
    <div className="flex h-full min-h-72 items-center justify-center p-6">
      <div className="max-w-lg space-y-2 text-center">
        <h2 className="text-xl font-semibold">Page not found</h2>
        <p className="text-sm text-muted-foreground">
          This route does not exist in the local app shell. Use browser tabs for external websites.
        </p>
      </div>
    </div>
  )
}
