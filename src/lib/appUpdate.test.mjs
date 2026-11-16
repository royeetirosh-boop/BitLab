import assert from 'node:assert/strict'
import test from 'node:test'
import { isNewerVersion, parseUpdateManifest } from './appUpdate.mjs'

const sample = {
  versionCode: 2,
  versionName: '1.1',
  apkUrl: 'https://raw.githubusercontent.com/royeetirosh-boop/Ravofun--releases-/main/bitlab/BitLab-v1.1.apk',
  notes: { en: 'Install over the current app.', he: 'מתקינים מעל האפליקציה הנוכחית.' },
}

test('parses the releases-repo manifest', () => {
  assert.deepEqual(parseUpdateManifest(sample), sample)
})

test('accepts a single notes string', () => {
  const parsed = parseUpdateManifest({ ...sample, notes: 'גרסה חדשה' })
  assert.equal(parsed.notes.he, 'גרסה חדשה')
  assert.equal(parsed.notes.en, 'גרסה חדשה')
})

test('allows an empty apkUrl and rejects a non-http one', () => {
  assert.equal(parseUpdateManifest({ ...sample, apkUrl: '' }).apkUrl, '')
  assert.throws(() => parseUpdateManifest({ ...sample, apkUrl: 'file:///tmp/app.apk' }))
})

test('compares versionCode only', () => {
  assert.equal(isNewerVersion(2, 1), true)
  assert.equal(isNewerVersion(1, 1), false)
  assert.equal(isNewerVersion(1, 2), false)
})
