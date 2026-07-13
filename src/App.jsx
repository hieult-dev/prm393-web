import { useState } from 'react'
import { authApi } from './api.js'
import LoginPage from './pages/LoginPage.jsx'
import GradeDashboard from './pages/GradeDashboard.jsx'

const storageKey = 'prm393-admin-session'

function readSession() {
  try {
    return JSON.parse(localStorage.getItem(storageKey))
  } catch {
    return null
  }
}

export default function App() {
  const [session, setSession] = useState(readSession)

  const login = async (credentials) => {
    const data = await authApi.login(credentials)
    if (!data.user.roles?.includes('ADMIN')) {
      throw new Error('Tài khoản không có quyền truy cập trang quản trị')
    }
    localStorage.setItem(storageKey, JSON.stringify(data))
    setSession(data)
  }

  const logout = () => {
    localStorage.removeItem(storageKey)
    setSession(null)
  }

  return session
    ? <GradeDashboard session={session} onLogout={logout} />
    : <LoginPage onLogin={login} />
}
