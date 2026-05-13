import { Route as RootRoute } from './routes/__root'
import { Route as IndexRoute } from './routes/index'
import { Route as SettingsRoute } from './routes/settings'
import { Route as HistoryRoute } from './routes/history'

export const routeTree = RootRoute.addChildren([IndexRoute, SettingsRoute, HistoryRoute])
