const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api').replace(/\/$/, '')

export class ApiError extends Error {
  constructor(message, status) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

async function request(path, { token, body, method = 'GET' } = {}) {
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

  if (response.status === 204) return null

  const payload = await response.json().catch(() => null)
  if (!response.ok || payload?.success === false) {
    const fallback = response.status === 401
      ? 'Phiên đăng nhập đã hết hạn'
      : 'Yêu cầu không thành công'
    throw new ApiError(payload?.message || fallback, response.status)
  }
  return payload?.data
}

export const authApi = {
  login: (credentials) => request('/auth/login', { method: 'POST', body: credentials }),
  register: (profile) => request('/auth/register', { method: 'POST', body: profile }),
}

export const adminApi = {
  students: (token) => request('/admin/students', { token }),
  subjects: (token, semesterId) => request(
    `/admin/subjects${semesterId ? `?semesterId=${semesterId}` : ''}`,
    { token },
  ),
  semesters: (token) => request('/admin/semesters', { token }),
  assignedSubjects: (token, userId, semesterId) => request(
    `/admin/students/${userId}/semesters/${semesterId}/subjects`,
    { token },
  ),
  assignSubjects: (token, userId, semesterId, subjectIds) => request(
    `/admin/students/${userId}/semesters/${semesterId}/subjects`,
    { token, method: 'PUT', body: { subjectIds } },
  ),
  grades: (token, userId, semesterId) => {
    const params = new URLSearchParams()
    if (userId) params.set('userId', userId)
    if (semesterId) params.set('semesterId', semesterId)
    return request(`/admin/grades?${params}`, { token })
  },
  createGrade: (token, grade) => request('/admin/grades', {
    token,
    method: 'POST',
    body: grade,
  }),
  updateGrade: (token, id, grade) => request(`/admin/grades/${id}`, {
    token,
    method: 'PUT',
    body: grade,
  }),
  deleteGrade: (token, id) => request(`/admin/grades/${id}`, {
    token,
    method: 'DELETE',
  }),
  schedules: (token, userId, semesterId, studyDate = '') => {
    const params = new URLSearchParams({ userId, semesterId })
    if (studyDate) params.set('studyDate', studyDate)
    return request(`/schedules/search?${params}`, { token })
  },
  createSchedule: (token, schedule) => request('/schedules', {
    token,
    method: 'POST',
    body: schedule,
  }),
  updateSchedule: (token, id, schedule) => request(`/schedules/${id}`, {
    token,
    method: 'PUT',
    body: schedule,
  }),
  deleteSchedule: (token, id) => request(`/schedules/${id}`, {
    token,
    method: 'DELETE',
  }),
}
