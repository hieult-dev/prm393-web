import { useEffect, useMemo, useState } from 'react'
import { teacherApi, ApiError } from '../api.js'
import Icon from '../components/Icon.jsx'

function displayUserName(user) {
  const name = [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim()
  return name || user?.fullName || user?.userName || 'Giáo viên chủ nhiệm'
}

function initialOf(value, fallback) {
  return value?.trim()?.charAt(0)?.toUpperCase() || fallback
}

function statusLabel(status) {
  if (status === 'APPROVED') return 'Đã duyệt'
  if (status === 'REJECTED') return 'Từ chối'
  return 'Chờ duyệt'
}

function formatDate(value) {
  if (!value) return 'Chưa có ngày'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('vi-VN')
}

export default function TeacherApplicationsPage({ session, canManageGrades = false, onNavigateGrades, onNavigateSchedule, onLogout }) {
  const [applications, setApplications] = useState([])
  const [types, setTypes] = useState([])
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(true)
  const [reviewing, setReviewing] = useState(false)
  const [selectedApplication, setSelectedApplication] = useState(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const teacherName = displayUserName(session.user)
  const roleLabel = canManageGrades ? 'Giáo viên chủ nhiệm / bộ môn' : 'Giáo viên chủ nhiệm'
  const typeById = useMemo(
    () => new Map(types.map((type) => [String(type.id), type])),
    [types],
  )
  const pendingCount = applications.filter((item) => item.status === 'PENDING').length
  const approvedCount = applications.filter((item) => item.status === 'APPROVED').length
  const rejectedCount = applications.filter((item) => item.status === 'REJECTED').length

  const handleError = (err) => {
    if (err instanceof ApiError && err.status === 401) {
      onLogout()
      return
    }
    setError(err.message || 'Đã xảy ra lỗi')
  }

  const loadData = async () => {
    setLoading(true)
    setError('')
    try {
      const [typeData, applicationData] = await Promise.all([
        teacherApi.applicationTypes(session.accessToken),
        teacherApi.applications(session.accessToken, { status }),
      ])
      setTypes(typeData || [])
      setApplications(applicationData || [])
    } catch (err) {
      handleError(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [session.accessToken, status])

  useEffect(() => {
    if (!notice) return undefined
    const timer = window.setTimeout(() => setNotice(''), 3000)
    return () => window.clearTimeout(timer)
  }, [notice])

  const reviewApplication = async ({ status: nextStatus, responseNote }) => {
    if (!selectedApplication) return
    setReviewing(true)
    setError('')
    try {
      await teacherApi.reviewApplication(session.accessToken, selectedApplication.id, {
        status: nextStatus,
        responseNote,
      })
      setNotice(nextStatus === 'APPROVED' ? 'Đã phê duyệt đơn' : 'Đã từ chối đơn')
      setSelectedApplication(null)
      await loadData()
    } catch (err) {
      handleError(err)
    } finally {
      setReviewing(false)
    }
  }

  return (
    <div className="teacher-shell">
      <aside className="sidebar">
        <div className="brand brand-sidebar">
          <span className="brand-mark"><span>F</span></span>
          <span><strong>FPT Schools</strong><small>Teacher Portal</small></span>
        </div>
        <nav className="sidebar-nav" aria-label="Điều hướng giáo viên chủ nhiệm">
          {canManageGrades && (
            <>
              <button type="button" onClick={onNavigateGrades}><Icon name="grade" /> Nhập điểm</button>
              <button type="button" onClick={onNavigateSchedule}><Icon name="calendar" /> Lịch dạy</button>
            </>
          )}
          <button className="active" type="button"><Icon name="book" /> Đơn từ phụ huynh</button>
        </nav>
        <button className="sidebar-logout" type="button" onClick={onLogout}>
          <Icon name="logout" /> Đăng xuất
        </button>
      </aside>

      <main className="teacher-main">
        <header className="topbar">
          <div>
            <span className="breadcrumb">GVCN <Icon name="chevron" size={14} /> Đơn từ</span>
            <h1>Phê duyệt đơn từ phụ huynh</h1>
          </div>
          <div className="teacher-profile">
            <span className="avatar avatar-teacher">{initialOf(teacherName, 'A')}</span>
            <div><strong>{teacherName}</strong><small>{roleLabel}</small></div>
          </div>
        </header>

        <div className="teacher-content">
          {notice && <div className="toast-success"><Icon name="check" size={18} /> {notice}</div>}
          {error && <div className="alert alert-error page-alert"><Icon name="alert" size={18} /> {error}<button type="button" onClick={() => setError('')}>×</button></div>}

          <section className="stats-grid">
            <article className="stat-card stat-orange"><span className="stat-icon"><Icon name="clock" /></span><div><small>Chờ xử lý</small><strong>{pendingCount}</strong><span>đơn cần phản hồi</span></div></article>
            <article className="stat-card stat-green"><span className="stat-icon"><Icon name="check" /></span><div><small>Đã duyệt</small><strong>{approvedCount}</strong><span>trong bộ lọc hiện tại</span></div></article>
            <article className="stat-card stat-blue"><span className="stat-icon"><Icon name="alert" /></span><div><small>Từ chối</small><strong>{rejectedCount}</strong><span>trong bộ lọc hiện tại</span></div></article>
          </section>

          <section className="filter-card">
            <div className="filter-heading">
              <div>
                <span className="section-kicker">BỘ LỌC ĐƠN TỪ</span>
                <h2>Chọn trạng thái cần theo dõi</h2>
                <p>Giáo viên chủ nhiệm phê duyệt, từ chối và gửi phản hồi cho phụ huynh trong lớp mình chủ nhiệm.</p>
              </div>
            </div>
            <div className="filter-grid application-filter-grid">
              <div>
                <label className="field-label" htmlFor="application-status">Trạng thái</label>
                <select
                  id="application-status"
                  className="select-control"
                  value={status}
                  onChange={(event) => setStatus(event.target.value)}
                >
                  <option value="">Tất cả</option>
                  <option value="PENDING">Chờ duyệt</option>
                  <option value="APPROVED">Đã duyệt</option>
                  <option value="REJECTED">Từ chối</option>
                </select>
              </div>
              <div className="application-refresh-action">
                <button className="secondary-button" type="button" onClick={loadData} disabled={loading}>
                  {loading ? <span className="spinner spinner-orange" /> : <Icon name="search" size={17} />}
                  Làm mới
                </button>
              </div>
            </div>
          </section>

          <section className="table-card teacher-applications-table">
            <div className="table-heading">
              <div>
                <span className="section-kicker">DANH SÁCH ĐƠN</span>
                <h2>{applications.length} đơn từ</h2>
                <p>Theo trạng thái {status ? statusLabel(status) : 'tất cả'}</p>
              </div>
              <span className="status-chip"><span /> {pendingCount} chờ duyệt</span>
            </div>

            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Sinh viên</th>
                    <th>Loại đơn</th>
                    <th>Nội dung</th>
                    <th>Trạng thái</th>
                    <th>Phản hồi</th>
                    <th className="align-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan="6"><div className="empty-state"><span className="spinner spinner-orange" /> Đang tải đơn từ...</div></td></tr>
                  ) : applications.length === 0 ? (
                    <tr><td colSpan="6"><div className="empty-state"><span className="empty-icon"><Icon name="book" size={28} /></span><strong>Không có đơn phù hợp</strong><p>Thử đổi bộ lọc trạng thái.</p></div></td></tr>
                  ) : applications.map((application) => {
                    const type = typeById.get(String(application.applicationTypeId))
                    const studentName = application.studentName || application.studentCode || `User #${application.userId}`
                    return (
                      <tr key={application.id}>
                        <td>
                          <div className="subject-cell student-cell">
                            <span>{initialOf(studentName, 'S')}</span>
                            <div><strong>{studentName}</strong><small>{application.className || application.studentCode || `User #${application.userId}`} · {formatDate(application.createdAt)}</small></div>
                          </div>
                        </td>
                        <td><span className="class-chip">{application.applicationTypeName || type?.name || `Loại #${application.applicationTypeId}`}</span></td>
                        <td className="application-content-cell"><strong>{application.title}</strong><small>{application.content}</small></td>
                        <td><span className={`application-status status-${application.status?.toLowerCase() || 'pending'}`}>{statusLabel(application.status)}</span></td>
                        <td className="application-response-cell">{application.responseNote || 'Chưa có phản hồi'}</td>
                        <td>
                          <div className="row-actions">
                            {application.status === 'PENDING' ? (
                              <button
                                className="enter-grade-action"
                                type="button"
                                onClick={() => setSelectedApplication(application)}
                                title="Phản hồi đơn"
                              >
                                <Icon name="edit" size={17} />
                              </button>
                            ) : (
                              <span className="review-locked">Đã xử lý</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </main>

      {selectedApplication && (
        <ReviewApplicationModal
          application={selectedApplication}
          typeName={selectedApplication.applicationTypeName || typeById.get(String(selectedApplication.applicationTypeId))?.name}
          reviewing={reviewing}
          onClose={() => setSelectedApplication(null)}
          onSubmit={reviewApplication}
        />
      )}
    </div>
  )
}

function ReviewApplicationModal({ application, typeName, reviewing, onClose, onSubmit }) {
  const [status, setStatus] = useState(application.status === 'APPROVED' ? 'APPROVED' : 'REJECTED')
  const [responseNote, setResponseNote] = useState(application.responseNote || '')

  const submit = (event) => {
    event.preventDefault()
    onSubmit({ status, responseNote })
  }

  return (
    <div className="modal-backdrop">
      <div className="modal-card application-review-modal">
        <div className="modal-header">
          <div>
            <span className="section-kicker">PHẢN HỒI ĐƠN TỪ</span>
            <h2>{application.title}</h2>
          </div>
          <button className="icon-button" type="button" onClick={onClose} disabled={reviewing}><Icon name="close" size={18} /></button>
        </div>
        <form onSubmit={submit}>
          <div className="student-summary">
            <span className="avatar avatar-small">{initialOf(application.studentName || application.studentCode, 'S')}</span>
            <div><strong>{application.studentName || application.studentCode || `User #${application.userId}`}</strong><small>{typeName || `Loại #${application.applicationTypeId}`} · {formatDate(application.createdAt)}</small></div>
            <span className="semester-chip">{statusLabel(application.status)}</span>
          </div>

          <div className="application-original-content">
            <strong>Nội dung phụ huynh gửi</strong>
            <p>{application.content}</p>
          </div>

          <label className="field-label" htmlFor="review-status">Trạng thái xử lý</label>
          <select
            id="review-status"
            className="select-control"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            disabled={reviewing}
          >
            <option value="APPROVED">Phê duyệt</option>
            <option value="REJECTED">Từ chối</option>
          </select>

          <label className="field-label" htmlFor="response-note">Phản hồi cho phụ huynh</label>
          <textarea
            id="response-note"
            className="textarea-control"
            value={responseNote}
            onChange={(event) => setResponseNote(event.target.value)}
            disabled={reviewing}
            placeholder="Nhập phản hồi để phụ huynh xem trên mobile"
            rows={5}
          />

          <div className="modal-actions">
            <button className="secondary-button" type="button" onClick={onClose} disabled={reviewing}>Hủy</button>
            <button className="primary-button" type="submit" disabled={reviewing}>
              {reviewing ? <span className="spinner" /> : <Icon name="check" size={17} />}
              Lưu phản hồi
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
