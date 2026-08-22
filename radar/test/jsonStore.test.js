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

test('upsertTool assigns version 1 on first insert and increments it on every update', () => {
  const dir = tmpDir()
  const store = createJsonStore(dir)
  const inserted = store.upsertTool({ slug: 'acme', website: 'https://acme.dev' })
  assert.equal(inserted.version, 1)

  const updated = store.upsertTool({ slug: 'acme', website: 'https://acme.dev' })
  assert.equal(updated.version, 2)
  assert.equal(store.countTools(), 1) // update, not a duplicate row
})

test('upsertTool persists to disk so a fresh store reload sees the incremented version', () => {
  const dir = tmpDir()
  const first = createJsonStore(dir)
  first.upsertTool({ slug: 'acme', website: 'https://acme.dev' })
  first.upsertTool({ slug: 'acme', website: 'https://acme.dev' })

  const reloaded = createJsonStore(dir)
  assert.equal(reloaded.getTool('acme').version, 2)
})
