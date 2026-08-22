import { test } from 'node:test'
import assert from 'node:assert/strict'
import { log } from '../util/logger.js'

// No RADAR_LOG is set in this environment, so the module-level threshold
// resolves to 'info' (20) — debug (10) sits below it, info/warn/error don't.
function withConsole(fn) {
  const realLog = console.log
  const realError = console.error
  const logCalls = []
  const errorCalls = []
  console.log = (...args) => logCalls.push(args)
  console.error = (...args) => errorCalls.push(args)
  try {
    fn()
    return { logCalls, errorCalls }
  } finally {
    console.log = realLog
    console.error = realError
  }
}

test('debug is suppressed below the default info threshold', () => {
  const { logCalls, errorCalls } = withConsole(() => log.debug('hidden'))
  assert.equal(logCalls.length, 0)
  assert.equal(errorCalls.length, 0)
})

test('info is routed to console.log, not console.error', () => {
  const { logCalls, errorCalls } = withConsole(() => log.info('hello'))
  assert.equal(errorCalls.length, 0)
  assert.equal(logCalls.length, 1)
  assert.equal(logCalls[0][0], '[radar] INFO  hello')
})

test('warn and error are routed to console.error, not console.log', () => {
  const { logCalls, errorCalls } = withConsole(() => {
    log.warn('careful')
    log.error('broken')
  })
  assert.equal(logCalls.length, 0)
  assert.deepEqual(errorCalls.map((c) => c[0]), ['[radar] WARN  careful', '[radar] ERROR broken'])
})

test('an extra payload is appended only when provided', () => {
  const { logCalls } = withConsole(() => {
    log.info('with extra', { id: 1 })
    log.info('without extra')
  })
  assert.deepEqual(logCalls[0], ['[radar] INFO  with extra', { id: 1 }])
  assert.deepEqual(logCalls[1], ['[radar] INFO  without extra'])
})
