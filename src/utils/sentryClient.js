// The only place @sentry/react is imported, and deliberately by name.
//
// `import * as Sentry from '@sentry/react'` builds a namespace object, which
// forces a bundler to retain every export the package has — including Session
// Replay, its rrweb DOM recorder, canvas capture and the feedback widget. None
// of those are used here, and together they were the great majority of a 152KB
// gzipped chunk. Naming the two functions we actually call lets rollup drop the
// rest.
//
// Anything else needed from the SDK later must be added here as a named export,
// not reached for through a namespace somewhere else.
export { init, captureException } from '@sentry/react'
