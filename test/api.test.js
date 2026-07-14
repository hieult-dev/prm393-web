import assert from 'node:assert/strict'
import { beforeEach, test } from 'node:test'

class MemoryStorage {
  values = new Map()

  getItem(key) {
    return this.values.has(key) ? this.values.get(key) : null
  }

  setItem(key, value) {
    this.values.set(key, String(value))
  }

  removeItem(key) {
    this.values.delete(key)
  }

  clear() {
    this.values.clear()
  }
}

globalThis.localStorage = new MemoryStorage()
globalThis.sessionStorage = new MemoryStorage()

const { authApi, sessionStore, teacherApi } = await import('../src/api.js')

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
})

test('refreshes once and retries concurrent unauthorized requests', async () => {
  const user = { id: 1, roles: ['TEACHER'] }
  sessionStore.save({
    accessToken: 'expired-access',
    refreshToken: 'refresh-1',
    user,
  })

  let refreshCalls = 0
  globalThis.fetch = async (url, options) => {
    if (url.endsWith('/auth/refresh')) {
      refreshCalls += 1
      assert.deepEqual(JSON.parse(options.body), { refreshToken: 'refresh-1' })
      await new Promise((resolve) => setTimeout(resolve, 5))
      return jsonResponse({
        accessToken: 'fresh-access',
        refreshToken: 'refresh-2',
        user,
      })
    }

    if (options.headers.Authorization === 'Bearer expired-access') {
      return jsonError('Expired', 401)
    }
    assert.equal(options.headers.Authorization, 'Bearer fresh-access')
    return jsonResponse([])
  }

  await Promise.all([
    teacherApi.semesters('expired-access'),
    teacherApi.subjects('expired-access', 2),
  ])

  assert.equal(refreshCalls, 1)
  assert.equal(sessionStore.read().accessToken, 'fresh-access')
  assert.equal(sessionStore.read().refreshToken, 'refresh-2')
})

test('migrates the legacy persisted session out of localStorage', () => {
  localStorage.setItem('prm393-teacher-session', JSON.stringify({
    accessToken: 'access',
    refreshToken: 'refresh',
    user: { roles: ['TEACHER'] },
  }))

  assert.equal(sessionStore.read().accessToken, 'access')
  assert.equal(localStorage.getItem('prm393-teacher-session'), null)
  assert.notEqual(sessionStorage.getItem('prm393-teacher-session'), null)
})

test('sends the current refresh token when logging out', async () => {
  sessionStore.save({
    accessToken: 'access',
    refreshToken: 'refresh-current',
    user: { roles: ['TEACHER'] },
  })
  globalThis.fetch = async (url, options) => {
    assert.ok(url.endsWith('/auth/logout'))
    assert.deepEqual(JSON.parse(options.body), {
      refreshToken: 'refresh-current',
    })
    return new Response(null, { status: 204 })
  }

  await authApi.logout()
})

function jsonResponse(data) {
  return new Response(JSON.stringify({ success: true, data }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

function jsonError(message, status) {
  return new Response(JSON.stringify({ success: false, message, data: null }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
