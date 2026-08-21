import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createJsonStore } from '../store/jsonStore.js'

const tmpDir = () => fs.mkdtempSync(path.join(os.tmpdir(), 'radar-store-'))

test('a missing tools.json defaults to an empty store', () => {
  const dir = tmpDir()
  const store = createJsonStore(dir)
  assert.equal(store.countTools(), 0)
})

test('a corrupt tools.json aborts the run instead of silently defaulting to empty', () => {
  const dir = tmpDir()
  fs.writeFileSync(path.join(dir, 'tools.json'), '{ this is not valid json')
  assert.throws(
    () => createJsonStore(dir),
    /radar store: cannot read .*tools\.json/
  )
})

test('a corrupt store file preserves the original error as cause', () => {
  const dir = tmpDir()
  fs.writeFileSync(path.join(dir, 'known.json'), 'not json at all')
  try {
    createJsonStore(dir)
    assert.fail('expected createJsonStore to throw')
  } catch (e) {
    assert.ok(e.cause instanceof Error)
    assert.equal(e.cause.code, undefined) // JSON.parse errors have no .code, unlike ENOENT
  }
})
