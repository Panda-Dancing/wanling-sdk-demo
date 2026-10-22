import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const packageJson = JSON.parse(
  await readFile(new URL('../package.json', import.meta.url), 'utf8'),
)
const packageLock = JSON.parse(
  await readFile(new URL('../package-lock.json', import.meta.url), 'utf8'),
)

test('Avatar SDK 固定为 0.1.38', () => {
  assert.equal(packageJson.dependencies['@wanlingsdk/avatar-sdk'], '0.1.38')
  assert.equal(
    packageLock.packages['node_modules/@wanlingsdk/avatar-sdk'].version,
    '0.1.38',
  )
})
