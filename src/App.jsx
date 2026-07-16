import { useEffect, useState } from 'react'
import { authApi, sessionStore } from './api.js'
import LoginPage from './pages/LoginPage.jsx'
import GradeDashboard from './pages/GradeDashboard.jsx'
import TeacherApplicationsPage from './pages/TeacherApplicationsPage.jsx'

function hasRole(user, roleName) {
  const roles = Array.isArray(user?.roles) ? user.roles : []
  return roles.includes(roleName) || user?.role === roleName
}

function isSubjectTeacher(user) {
  return hasRole(user, 'SUBJECT_TEACHER') || hasRole(user, 'TEACHER')
}

function isHomeroomTeacher(user) {
  return hasRole(user, 'HOMEROOM_TEACHER')
}

function canAccessWeb(user) {
  return isSubjectTeacher(user) || isHomeroomTeacher(user)
}

function defaultPortal(user) {
  return isHomeroomTeacher(user) ? 'applications' : 'grades'
}

function canOpenPortal(user, portal) {
  if (portal === 'applications') return isHomeroomTeacher(user)
  if (portal === 'grades' || portal === 'schedule') return isSubjectTeacher(user)
  return false
}

function readSession() {
  const session = sessionStore.read()
  return canAccessWeb(session?.user) ? session : null
}

export default function App() {
  const [session, setSession] = useState(readSession)
  const [portal, setPortal] = useState(() => {
    const currentSession = readSession()
    return currentSession ? defaultPortal(currentSession.user) : 'grades'
  })

  useEffect(() => sessionStore.subscribe((updatedSession) => {
    const nextSession = canAccessWeb(updatedSession?.user) ? updatedSession : null
    setSession(nextSession)
    if (nextSession) {
      setPortal((currentPortal) => (
        canOpenPortal(nextSession.user, currentPortal)
          ? currentPortal
          : defaultPortal(nextSession.user)
      ))
    }
  }), [])

  const login = async (credentials) => {
    const data = await authApi.login(credentials)
    if (!canAccessWeb(data.user)) {
      await authApi.logout(data.refreshToken).catch(() => {})
      throw new Error('Tài khoản không có quyền truy cập web giáo viên')
    }
    sessionStore.save(data)
    setSession(data)
    setPortal(defaultPortal(data.user))
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

  if (!session) return <LoginPage onLogin={login} />

  const canManageGrades = isSubjectTeacher(session.user)
  const canReviewApplications = isHomeroomTeacher(session.user)
  const activePortal = canOpenPortal(session.user, portal) ? portal : defaultPortal(session.user)

  return activePortal === 'applications'
    ? (
      <TeacherApplicationsPage
        session={session}
        canManageGrades={canManageGrades}
        onNavigateGrades={() => setPortal('grades')}
        onNavigateSchedule={() => setPortal('schedule')}
        onLogout={logout}
      />
    )
    : (
      <GradeDashboard
        session={session}
        initialPage={activePortal === 'schedule' ? 'schedule' : 'grades'}
        canReviewApplications={canReviewApplications}
        onNavigateApplications={() => setPortal('applications')}
        onLogout={logout}
      />
    )
}
