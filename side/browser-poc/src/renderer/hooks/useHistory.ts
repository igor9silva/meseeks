import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { browserHistorySchema, type BrowserHistory } from '../../shared/schemas/ipcSchema'

const EMPTY_HISTORY: BrowserHistory = { entries: [] }

export function useHistory() {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['history'],
    queryFn: async () => {
      const historySnapshot = await window.electronAPI.getHistory()
      const parsedHistory = browserHistorySchema.safeParse(historySnapshot)
      if (parsedHistory.success) return parsedHistory.data
      console.warn('[browser-poc] invalid history snapshot during history:get', parsedHistory.error.flatten())
      return EMPTY_HISTORY
    },
    initialData: EMPTY_HISTORY,
    staleTime: Infinity
  })

  useEffect(() => {
    return window.electronAPI.onHistoryUpdated(data => {
      queryClient.setQueryData(['history'], browserHistorySchema.parse(data))
    })
  }, [queryClient])

  useEffect(() => {
    void query.refetch()
  }, [])

  return {
    entries: query.data.entries
  }
}
