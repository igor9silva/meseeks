type LogContext = Record<string, unknown>

function formatMessage(message: string) {
  return `[browser-poc] ${message}`
}

export const logger = {
  error(message: string, context?: LogContext) {
    if (context) {
      console.error(formatMessage(message), context)
      return
    }

    console.error(formatMessage(message))
  },
  warn(message: string, context?: LogContext) {
    if (context) {
      console.warn(formatMessage(message), context)
      return
    }

    console.warn(formatMessage(message))
  },
  info(message: string, context?: LogContext) {
    if (context) {
      console.info(formatMessage(message), context)
      return
    }

    console.info(formatMessage(message))
  },
  debug(message: string, context?: LogContext) {
    if (context) {
      console.debug(formatMessage(message), context)
      return
    }

    console.debug(formatMessage(message))
  }
}
