import { useMemo } from 'react'
import { useTabs } from './useTabs'

export function useAIProcessor() {
  const { activeTab } = useTabs()

  return useMemo(
    () => ({
      enabled: activeTab?.kind === 'web',
      mode: 'main-process-intercept' as const,
      description: 'HTTP(S) requests are intercepted in Electron main process and transformed before render.'
    }),
    [activeTab?.kind]
  )
}
