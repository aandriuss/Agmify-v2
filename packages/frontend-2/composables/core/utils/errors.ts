/**
 * Type guard to check if an error is a GraphQL auth error
 */
export function isGraphQLAuthError(error: unknown): boolean {
  if (!error) return false

  // Check if it's an Error object with a message
  if (error instanceof Error) {
    const message = error.message.toLowerCase()
    return (
      message.includes('auth') ||
      message.includes('unauthorized') ||
      message.includes('unauthenticated') ||
      message.includes('token')
    )
  }

  // Check if it's a GraphQL error object
  if (typeof error === 'object' && error !== null) {
    const err = error as Record<string, unknown>

    // Check message field
    if (typeof err.message === 'string') {
      const message = err.message.toLowerCase()
      return (
        message.includes('auth') ||
        message.includes('unauthorized') ||
        message.includes('unauthenticated') ||
        message.includes('token')
      )
    }

    // Check extensions.code field
    if (typeof err.extensions === 'object' && err.extensions !== null) {
      const extensions = err.extensions as Record<string, unknown>
      if (typeof extensions.code === 'string') {
        const code = extensions.code.toLowerCase()
        return (
          code.includes('auth') || code === 'unauthorized' || code === 'unauthenticated'
        )
      }
    }
  }

  return false
}
