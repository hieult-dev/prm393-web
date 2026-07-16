const API_BASE_URL = (import.meta.env?.VITE_API_BASE_URL || 'http://localhost:8080/api').replace(/\/$/, '')
const SESSION_STORAGE_KEY = 'prm393-teacher-session'
const sessionListeners = new Set()

function notifySession(session) {
  sessionListeners.forEach((listener) => listener(session))
}

export const sessionStore = {
  read() {
    try {
      let rawSession = sessionStorage.getItem(SESSION_STORAGE_KEY)
      if (!rawSession) {
        rawSession = localStorage.getItem(SESSION_STORAGE_KEY)
        if (rawSession) {
          sessionStorage.setItem(SESSION_STORAGE_KEY, rawSession)
          localStorage.removeItem(SESSION_STORAGE_KEY)
        }
      }
      return rawSession ? JSON.parse(rawSession) : null
    } catch {
      return null
    }
  },

  save(session) {
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session))
    localStorage.removeItem(SESSION_STORAGE_KEY)
    notifySession(session)
  },

  clear() {
    sessionStorage.removeItem(SESSION_STORAGE_KEY)
    localStorage.removeItem(SESSION_STORAGE_KEY)
    notifySession(null)
  },

  subscribe(listener) {
    sessionListeners.add(listener)
    return () => sessionListeners.delete(listener)
  },
}

export class ApiError extends Error {
  constructor(message, status) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

function withQuery(path, params = {}) {
  const query = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      query.set(key, value)
    }
  })
  const value = query.toString()
  return value ? `${path}?${value}` : path
}

async function send(path, { token, body, method }) {
  let response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: {
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new ApiError('Không thể kết nối tới máy chủ. Hãy kiểm tra backend đang chạy.', 0)
  }

  return response
}

let refreshInFlight = null

async function refreshAccessToken() {
  if (refreshInFlight) return refreshInFlight

  refreshInFlight = (async () => {
    const refreshToken = sessionStore.read()?.refreshToken
    if (!refreshToken) {
      throw new ApiError('Phiên đăng nhập đã hết hạn', 401)
    }

    const refreshedSession = await request('/auth/refresh', {
      method: 'POST',
      body: { refreshToken },
      retryAuth: false,
    })
    sessionStore.save(refreshedSession)
    return refreshedSession.accessToken
  })()

  try {
    return await refreshInFlight
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      sessionStore.clear()
    }
    throw error
  } finally {
    refreshInFlight = null
  }
}

async function request(path, {
  token,
  body,
  method = 'GET',
  retryAuth = true,
} = {}) {
  const currentAccessToken = token
    ? sessionStore.read()?.accessToken || token
    : undefined
  let response = await send(path, { token: currentAccessToken, body, method })

  if (response.status === 401 && retryAuth && currentAccessToken) {
    const refreshedAccessToken = await refreshAccessToken()
    response = await send(path, {
      token: refreshedAccessToken,
      body,
      method,
    })
  }

  if (response.status === 204) return null

  const payload = await response.json().catch(() => null)
  if (!response.ok || payload?.success === false) {
    const fallback = response.status === 401
      ? 'Phiên đăng nhập đã hết hạn'
      : response.status === 403
        ? 'Tài khoản không có quyền thực hiện thao tác này'
        : 'Yêu cầu không thành công'
    throw new ApiError(payload?.message || fallback, response.status)
  }
  return payload?.data
}

async function rawRequest(path, {
  token,
  body,
  method = 'GET',
  headers = {},
  retryAuth = true,
} = {}) {
  const currentAccessToken = token
    ? sessionStore.read()?.accessToken || token
    : undefined

  const sendRaw = async (accessToken) => {
    try {
      return await fetch(`${API_BASE_URL}${path}`, {
        method,
        headers: {
          ...headers,
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body,
      })
    } catch {
      throw new ApiError('Không thể kết nối tới máy chủ. Hãy kiểm tra backend đang chạy.', 0)
    }
  }

  let response = await sendRaw(currentAccessToken)
  if (response.status === 401 && retryAuth && currentAccessToken) {
    response = await sendRaw(await refreshAccessToken())
  }

  if (!response.ok) {
    const payload = await response.clone().json().catch(() => null)
    const fallback = response.status === 403
      ? 'Tài khoản không có quyền thực hiện thao tác này'
      : 'Yêu cầu không thành công'
    throw new ApiError(payload?.message || fallback, response.status)
  }
  return response
}

async function requestBlob(path, { token } = {}) {
  const response = await rawRequest(path, { token })
  return response.blob()
}

async function requestMultipart(path, { token, body, method = 'POST' } = {}) {
  const response = await rawRequest(path, { token, body, method })
  const payload = await response.json().catch(() => null)
  if (payload?.success === false) {
    throw new ApiError(payload?.message || 'Yêu cầu không thành công', response.status)
  }
  return payload?.data
}

export const authApi = {
  login: (credentials) => request('/auth/login', { method: 'POST', body: credentials }),
  register: (profile) => request('/auth/register', { method: 'POST', body: profile }),
  refresh: refreshAccessToken,
  logout: (refreshToken = sessionStore.read()?.refreshToken) => (
    refreshToken
      ? request('/auth/logout', {
          method: 'POST',
          body: { refreshToken },
          retryAuth: false,
        })
      : Promise.resolve(null)
  ),
}

export const teacherApi = {
  semesters: (token) => request('/teacher/semesters', { token }),
  subjects: (token, semesterId) => request(
    withQuery('/teacher/subjects', { semesterId }),
    { token },
  ),
  students: (token, filters = {}) => request(
    withQuery('/teacher/students', filters),
    { token },
  ),
  grades: (token, filters = {}) => request(
    withQuery('/teacher/grades', filters),
    { token },
  ),
  createGrade: (token, grade) => request('/teacher/grades', {
    token,
    method: 'POST',
    body: grade,
  }),
  updateGrade: (token, id, grade) => request(`/teacher/grades/${id}`, {
    token,
    method: 'PUT',
    body: grade,
  }),
  deleteGrade: (token, id) => request(`/teacher/grades/${id}`, {
    token,
    method: 'DELETE',
  }),
  downloadGradeTemplate: (token, filters = {}) => requestBlob(
    withQuery('/teacher/grades/template', filters),
    { token },
  ),
  importGradeExcel: (token, filters = {}, file) => {
    const form = new FormData()
    form.append('file', file)
    return requestMultipart(withQuery('/teacher/grades/import', filters), {
      token,
      body: form,
    })
  },
  schedules: (token, filters = {}) => request(
    withQuery('/teacher/schedules', filters),
    { token },
  ),
  applicationTypes: (token) => request('/application-types', { token }),
  applications: (token, filters = {}) => request(
    withQuery('/teacher/applications', filters),
    { token },
  ),
  reviewApplication: (token, id, review) => request(`/teacher/applications/${id}/review`, {
    token,
    method: 'PATCH',
    body: review,
  }),
}

export const adminApi = {
  list: (token, path) => request(path, { token }),
  create: (token, path, body) => request(path, {
    token,
    method: 'POST',
    body,
  }),
  update: (token, path, id, body) => request(`${path}/${id}`, {
    token,
    method: 'PUT',
    body,
  }),
  remove: (token, path, id) => request(`${path}/${id}`, {
    token,
    method: 'DELETE',
  }),
}
