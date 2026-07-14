import { useEffect, useMemo, useState } from 'react'
import { ApiError, teacherApi } from '../api.js'
import GradeModal from '../components/GradeModal.jsx'
import Icon from '../components/Icon.jsx'
import ScheduleManagement from './ScheduleManagement.jsx'

function gradeTone(letterGrade) {
  if (letterGrade === 'A') return 'grade-a'
  if (letterGrade?.startsWith('B')) return 'grade-b'
  if (letterGrade?.startsWith('C')) return 'grade-c'
  return 'grade-f'
}

function findDefaultSemester(semesters) {
  const now = new Date()
  return semesters.find((semester) => (
    semester.startDate && semester.endDate
    && now >= new Date(`${semester.startDate}T00:00:00`)
    && now <= new Date(`${semester.endDate}T23:59:59`)
  )) || semesters[0]
}

function displayUserName(user) {
  const name = [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim()
  return name || user?.fullName || user?.userName || 'Giáo viên'
}

function initialOf(value, fallback) {
  return value?.trim()?.charAt(0)?.toUpperCase() || fallback
}

function numericScore(value) {
  const score = Number(value)
  return Number.isFinite(score) ? score : null
}

export default function GradeDashboard({ session, onLogout }) {
  const [activePage, setActivePage] = useState('grades')
  const [students, setStudents] = useState([])
  const [subjects, setSubjects] = useState([])
  const [semesters, setSemesters] = useState([])
  const [grades, setGrades] = useState([])
  const [selectedClassName, setSelectedClassName] = useState('ALL')
  const [selectedSemesterId, setSelectedSemesterId] = useState('')
  const [selectedSubjectId, setSelectedSubjectId] = useState('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [rosterLoading, setRosterLoading] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [modalStudent, setModalStudent] = useState(null)
  const [modalGrade, setModalGrade] = useState(null)

  const handleError = (err) => {
    if (err instanceof ApiError && err.status === 401) {
      onLogout()
      return
    }
    setError(err.message || 'Đã xảy ra lỗi')
  }

  useEffect(() => {
    let active = true
    teacherApi.semesters(session.accessToken)
      .then((semesterData) => {
        if (!active) return
        setSemesters(semesterData || [])
        const currentSemester = findDefaultSemester(semesterData || [])
        if (currentSemester) setSelectedSemesterId(String(currentSemester.id))
      })
      .catch(handleError)
      .finally(() => active && setLoading(false))
    return () => { active = false }
  }, [session.accessToken])

  useEffect(() => {
    if (!selectedSemesterId) {
      setSubjects([])
      setSelectedSubjectId('')
      return undefined
    }

    let active = true
    setSubjects([])
    setSelectedSubjectId('')
    teacherApi.subjects(session.accessToken, selectedSemesterId)
      .then((subjectData) => {
        if (!active) return
        const nextSubjects = subjectData || []
        setSubjects(nextSubjects)
        setSelectedSubjectId((current) => (
          nextSubjects.some((subject) => String(subject.id) === current)
            ? current
            : String(nextSubjects[0]?.id || '')
        ))
      })
      .catch(handleError)
    return () => { active = false }
  }, [selectedSemesterId, session.accessToken])

  const loadRoster = async () => {
    if (!selectedSemesterId || !selectedSubjectId) {
      setStudents([])
      setGrades([])
      return
    }

    setRosterLoading(true)
    setError('')
    try {
      const filters = {
        semesterId: selectedSemesterId,
        subjectId: selectedSubjectId,
      }
      const [studentData, gradeData] = await Promise.all([
        teacherApi.students(session.accessToken, {
          ...filters,
          search: search.trim(),
        }),
        teacherApi.grades(session.accessToken, filters),
      ])
      setStudents(studentData || [])
      setGrades(gradeData || [])
    } catch (err) {
      handleError(err)
    } finally {
      setRosterLoading(false)
    }
  }

  useEffect(() => {
    loadRoster()
  }, [selectedSemesterId, selectedSubjectId, search, session.accessToken])

  useEffect(() => {
    if (!notice) return undefined
    const timer = window.setTimeout(() => setNotice(''), 3000)
    return () => window.clearTimeout(timer)
  }, [notice])

  useEffect(() => {
    if (!modalStudent) return undefined
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previousOverflow }
  }, [modalStudent])

  const selectedSemester = semesters.find((semester) => String(semester.id) === selectedSemesterId)
  const selectedSubject = subjects.find((subject) => String(subject.id) === selectedSubjectId)
  const teacherName = displayUserName(session.user)
  const classNames = useMemo(() => Array.from(new Set(
    students
      .map((student) => student.className?.trim())
      .filter(Boolean),
  )).sort((left, right) => left.localeCompare(right, 'vi')), [students])
  const filteredStudents = useMemo(() => students.filter((student) => (
    selectedClassName === 'ALL'
    || (selectedClassName === 'UNASSIGNED' && !student.className?.trim())
    || student.className?.trim() === selectedClassName
  )), [students, selectedClassName])
  const gradeByStudentId = useMemo(
    () => new Map(grades.map((grade) => [String(grade.userId), grade])),
    [grades],
  )
  const scoreValues = filteredStudents
    .map((student) => numericScore(gradeByStudentId.get(String(student.id))?.totalScore))
    .filter((score) => score !== null)
  const gradedCount = scoreValues.length
  const average = gradedCount
    ? scoreValues.reduce((sum, score) => sum + score, 0) / gradedCount
    : 0
  const passed = scoreValues.filter((score) => score >= 5).length

  const changePage = (page) => {
    setActivePage(page)
    setModalStudent(null)
    setModalGrade(null)
    setError('')
    setNotice('')
  }

  const changeSubject = (event) => {
    setSelectedSubjectId(event.target.value)
    setSelectedClassName('ALL')
    setModalStudent(null)
    setModalGrade(null)
  }

  const changeSemester = (event) => {
    setSelectedSemesterId(event.target.value)
    setSelectedClassName('ALL')
    setModalStudent(null)
    setModalGrade(null)
  }

  const openCreate = (student) => {
    setModalStudent(student)
    setModalGrade(null)
  }

  const openEdit = (student, grade) => {
    setModalStudent(student)
    setModalGrade(grade)
  }

  const saveGrade = async (payload) => {
    if (modalGrade) {
      await teacherApi.updateGrade(session.accessToken, modalGrade.id, payload)
      setNotice('Đã cập nhật điểm thành công')
    } else {
      await teacherApi.createGrade(session.accessToken, payload)
      setNotice('Đã nhập điểm thành công')
    }
    setModalStudent(null)
    setModalGrade(null)
    await loadRoster()
  }

  const deleteGrade = async (student, grade) => {
    if (!window.confirm(`Xóa điểm môn ${grade.subjectCode} của ${student.fullName || student.userName}?`)) return
    try {
      await teacherApi.deleteGrade(session.accessToken, grade.id)
      setNotice('Đã xóa điểm môn học')
      await loadRoster()
    } catch (err) {
      handleError(err)
    }
  }

  if (loading) {
    return <div className="app-loading"><span className="spinner spinner-orange" /><p>Đang tải dữ liệu giáo viên...</p></div>
  }

  return (
    <div className="teacher-shell">
      <aside className="sidebar">
        <div className="brand brand-sidebar">
          <span className="brand-mark"><span>F</span></span>
          <span><strong>FPT Schools</strong><small>Teacher Portal</small></span>
        </div>
        <nav className="sidebar-nav" aria-label="Điều hướng chính">
          <button className={activePage === 'grades' ? 'active' : ''} type="button" onClick={() => changePage('grades')}><Icon name="grade" /> Nhập điểm</button>
          <button className={activePage === 'schedule' ? 'active' : ''} type="button" onClick={() => changePage('schedule')}><Icon name="calendar" /> Lịch dạy</button>
        </nav>
        <button className="sidebar-logout" type="button" onClick={onLogout}>
          <Icon name="logout" /> Đăng xuất
        </button>
      </aside>

      <main className="teacher-main">
        <header className="topbar">
          <div>
            <span className="breadcrumb">Học vụ <Icon name="chevron" size={14} /> {activePage === 'grades' ? 'Nhập điểm' : 'Lịch dạy'}</span>
            <h1>{activePage === 'grades' ? 'Nhập điểm sinh viên' : 'Lịch dạy của giáo viên'}</h1>
          </div>
          <div className="teacher-profile">
            <span className="avatar avatar-teacher">{initialOf(teacherName, 'T')}</span>
            <div><strong>{teacherName}</strong><small>Giáo viên</small></div>
          </div>
        </header>

        {activePage === 'grades' && (
          <div className="teacher-content">
            {notice && <div className="toast-success"><Icon name="check" size={18} /> {notice}</div>}
            {error && <div className="alert alert-error page-alert"><Icon name="alert" size={18} /> {error}<button type="button" onClick={() => setError('')}>×</button></div>}

            <section className="filter-card">
              <div className="filter-heading">
                <div>
                  <span className="section-kicker">BỘ LỌC NHẬP ĐIỂM</span>
                  <h2>Chọn học kỳ và môn giảng dạy</h2>
                  <p>Danh sách sinh viên chỉ lấy theo môn teacher được phân công trong backend.</p>
                </div>
              </div>
              <div className="filter-grid">
                <div>
                  <label className="field-label" htmlFor="semester">Học kỳ</label>
                  <select id="semester" className="select-control" value={selectedSemesterId} onChange={changeSemester}>
                    <option value="">Chọn học kỳ</option>
                    {semesters.map((semester) => <option key={semester.id} value={semester.id}>{semester.name} · {semester.schoolYear}</option>)}
                  </select>
                </div>
                <div>
                  <label className="field-label" htmlFor="subject">Môn dạy</label>
                  <select id="subject" className="select-control" value={selectedSubjectId} onChange={changeSubject} disabled={!subjects.length}>
                    <option value="">{subjects.length ? 'Chọn môn học' : 'Chưa có môn được phân công'}</option>
                    {subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.subjectCode} · {subject.subjectName}</option>)}
                  </select>
                </div>
                <div>
                  <label className="field-label" htmlFor="class-name">Lớp</label>
                  <select
                    id="class-name"
                    className="select-control"
                    value={selectedClassName}
                    onChange={(event) => setSelectedClassName(event.target.value)}
                  >
                    <option value="ALL">Tất cả lớp ({students.length} sinh viên)</option>
                    {classNames.map((className) => (
                      <option key={className} value={className}>{className}</option>
                    ))}
                    {students.some((student) => !student.className?.trim()) && (
                      <option value="UNASSIGNED">Chưa xếp lớp</option>
                    )}
                  </select>
                </div>
                <div>
                  <label className="field-label" htmlFor="student-search">Tìm sinh viên</label>
                  <div className="input-shell compact">
                    <Icon name="search" size={18} />
                    <input
                      id="student-search"
                      placeholder="Mã, tên hoặc email"
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                    />
                  </div>
                </div>
              </div>
            </section>

            <section className="stats-grid">
              <article className="stat-card stat-orange"><span className="stat-icon"><Icon name="users" /></span><div><small>Sinh viên trong môn</small><strong>{filteredStudents.length}</strong><span>{selectedSubject?.subjectCode || 'Chưa chọn môn'}</span></div></article>
              <article className="stat-card stat-blue"><span className="stat-icon"><Icon name="chart" /></span><div><small>Đã có điểm</small><strong>{gradedCount}</strong><span>{filteredStudents.length ? `${Math.round(gradedCount / filteredStudents.length * 100)}% danh sách` : 'Chưa có dữ liệu'}</span></div></article>
              <article className="stat-card stat-green"><span className="stat-icon"><Icon name="check" /></span><div><small>Điểm trung bình</small><strong>{average.toFixed(2)}</strong><span>{passed} sinh viên đạt</span></div></article>
            </section>

            <section className="table-card">
              <div className="table-heading">
                <div>
                  <span className="section-kicker">DANH SÁCH NHẬP ĐIỂM</span>
                  <h2>{selectedSubject ? `${selectedSubject.subjectCode} · ${selectedSubject.subjectName}` : 'Chưa chọn môn học'}</h2>
                  <p>{selectedSemester?.name || 'Chưa chọn học kỳ'} · {filteredStudents.length} sinh viên</p>
                </div>
                <span className="status-chip"><span /> {gradedCount}/{filteredStudents.length} đã nhập</span>
              </div>

              <div className="table-scroll">
                <table>
                  <thead><tr><th>Sinh viên</th><th>Lớp</th><th>Điểm thành phần</th><th>Điểm tổng</th><th>Xếp loại</th><th className="align-right">Thao tác</th></tr></thead>
                  <tbody>
                    {rosterLoading ? (
                      <tr><td colSpan="6"><div className="empty-state"><span className="spinner spinner-orange" /> Đang tải danh sách...</div></td></tr>
                    ) : !selectedSemester || !selectedSubject ? (
                      <tr><td colSpan="6"><div className="empty-state"><span className="empty-icon"><Icon name="book" size={28} /></span><strong>Chọn học kỳ và môn dạy</strong><p>Web sẽ lấy sinh viên theo quyền teacher từ backend.</p></div></td></tr>
                    ) : filteredStudents.length === 0 ? (
                      <tr><td colSpan="6"><div className="empty-state"><span className="empty-icon"><Icon name="users" size={28} /></span><strong>Không tìm thấy sinh viên</strong><p>Thử đổi lớp, từ khóa tìm kiếm hoặc kiểm tra phân công môn học.</p></div></td></tr>
                    ) : filteredStudents.map((student) => {
                      const grade = gradeByStudentId.get(String(student.id))
                      const totalScore = numericScore(grade?.totalScore)
                      return (
                        <tr className={grade ? '' : 'ungraded-row'} key={student.id}>
                          <td>
                            <div className="subject-cell student-cell">
                              <span>{initialOf(student.fullName || student.userName, 'S')}</span>
                              <div><strong>{student.fullName || student.userName}</strong><small>{student.userName}</small></div>
                            </div>
                          </td>
                          <td><span className="class-chip">{student.className || 'Chưa xếp lớp'}</span></td>
                          <td>{grade ? <div className="score-pills">{grade.items.map((item) => <span key={item.id}><small>{item.name}</small><strong>{Number(item.score).toFixed(1)}</strong><em>{Number(item.weight)}%</em></span>)}</div> : <span className="not-graded-text">Chưa có điểm thành phần</span>}</td>
                          <td>{grade && totalScore !== null ? <strong className="total-score">{totalScore.toFixed(2)}</strong> : <span className="score-placeholder">—</span>}</td>
                          <td>{grade ? <span className={`letter-grade ${gradeTone(grade.letterGrade)}`}>{grade.letterGrade}</span> : <span className="pending-grade">Chưa nhập</span>}</td>
                          <td>
                            {grade ? (
                              <div className="row-actions"><button type="button" onClick={() => openEdit(student, grade)} title="Sửa điểm"><Icon name="edit" size={17} /></button><button className="danger" type="button" onClick={() => deleteGrade(student, grade)} title="Xóa điểm"><Icon name="trash" size={17} /></button></div>
                            ) : (
                              <div className="row-actions"><button className="enter-grade-action" type="button" onClick={() => openCreate(student)} title="Nhập điểm"><Icon name="plus" size={17} /></button></div>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}

        {activePage === 'schedule' && (
          <ScheduleManagement
            session={session}
            semesters={semesters}
            subjects={subjects}
            selectedSemesterId={selectedSemesterId}
            onSemesterChange={setSelectedSemesterId}
            onLogout={onLogout}
          />
        )}
      </main>

      {activePage === 'grades' && modalStudent && selectedSemester && selectedSubject && (
        <GradeModal
          grade={modalGrade}
          student={modalStudent}
          semester={selectedSemester}
          subjects={[selectedSubject]}
          existingSubjectIds={modalGrade ? new Set([selectedSubject.id]) : new Set()}
          initialSubjectId={selectedSubjectId}
          onClose={() => {
            setModalStudent(null)
            setModalGrade(null)
          }}
          onSave={saveGrade}
        />
      )}
    </div>
  )
}
