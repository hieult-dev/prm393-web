import { useEffect, useState } from 'react'
import { authApi, sessionStore } from './api.js'
import LoginPage from './pages/LoginPage.jsx'
import GradeDashboard from './pages/GradeDashboard.jsx'
import AdminApplicationsPage from './pages/AdminApplicationsPage.jsx'

function hasRole(user, roleName) {
  const roles = Array.isArray(user?.roles) ? user.roles : []
  return roles.includes(roleName) || user?.role === roleName
}

function canAccessWeb(user) {
  return hasRole(user, 'TEACHER') || hasRole(user, 'ADMIN')
}

function readSession() {
  const session = sessionStore.read()
  return canAccessWeb(session?.user) ? session : null
}

export default function App() {
  const [session, setSession] = useState(readSession)

  useEffect(() => sessionStore.subscribe((updatedSession) => {
    setSession(canAccessWeb(updatedSession?.user) ? updatedSession : null)
  }), [])

  const login = async (credentials) => {
    const data = await authApi.login(credentials)
    if (!canAccessWeb(data.user)) {
      await authApi.logout(data.refreshToken).catch(() => {})
      throw new Error('Tài khoản không có quyền truy cập web quản trị')
    }
    sessionStore.save(data)
    setSession(data)
  }

  const logout = async () => {
    try {
      await authApi.logout()
    } catch {
      // Local logout still completes when the backend is unavailable.
    } finally {
      sessionStore.clear()
    }
  }

  return session
    ? hasRole(session.user, 'ADMIN')
      ? <AdminApplicationsPage session={session} onLogout={logout} />
      : <GradeDashboard session={session} onLogout={logout} />
    : <LoginPage onLogin={login} />
}
