import { useEffect, useMemo, useState } from 'react'
import { adminApi, ApiError } from '../api.js'
import AssignSubjectsModal from '../components/AssignSubjectsModal.jsx'
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

export default function GradeDashboard({ session, onLogout }) {
  const [activePage, setActivePage] = useState('grades')
  const [students, setStudents] = useState([])
  const [subjects, setSubjects] = useState([])
  const [semesters, setSemesters] = useState([])
  const [grades, setGrades] = useState([])
  const [assignedSubjects, setAssignedSubjects] = useState([])
  const [selectedStudentId, setSelectedStudentId] = useState('')
  const [selectedClassName, setSelectedClassName] = useState('ALL')
  const [selectedSemesterId, setSelectedSemesterId] = useState('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [gradesLoading, setGradesLoading] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [modalGrade, setModalGrade] = useState(undefined)
  const [modalSubjectId, setModalSubjectId] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [studentModalOpen, setStudentModalOpen] = useState(false)
  const [assignModalOpen, setAssignModalOpen] = useState(false)

  const handleError = (err) => {
    if (err instanceof ApiError && err.status === 401) {
      onLogout()
      return
    }
    setError(err.message || 'Đã xảy ra lỗi')
  }

  useEffect(() => {
    let active = true
    Promise.all([
      adminApi.students(session.accessToken),
      adminApi.semesters(session.accessToken),
    ])
      .then(([studentData, semesterData]) => {
        if (!active) return
        setStudents(studentData)
        setSemesters(semesterData)
        const currentSemester = findDefaultSemester(semesterData)
        if (currentSemester) setSelectedSemesterId(String(currentSemester.id))
      })
      .catch(handleError)
      .finally(() => active && setLoading(false))
    return () => { active = false }
  }, [session.accessToken])

  useEffect(() => {
    if (!selectedSemesterId) {
      setSubjects([])
      return
    }
    setSubjects([])
    adminApi.subjects(session.accessToken, selectedSemesterId)
      .then(setSubjects)
      .catch(handleError)
  }, [selectedSemesterId, session.accessToken])

  const loadGrades = async () => {
    if (!selectedStudentId || !selectedSemesterId) {
      setGrades([])
      setAssignedSubjects([])
      return
    }
    setGradesLoading(true)
    setError('')
    try {
      const [gradeData, assignedSubjectData] = await Promise.all([
        adminApi.grades(session.accessToken, selectedStudentId, selectedSemesterId),
        adminApi.assignedSubjects(session.accessToken, selectedStudentId, selectedSemesterId),
      ])
      setGrades(gradeData)
      setAssignedSubjects(assignedSubjectData)
    } catch (err) {
      handleError(err)
    } finally {
      setGradesLoading(false)
    }
  }

  useEffect(() => {
    loadGrades()
  }, [selectedStudentId, selectedSemesterId, session.accessToken])

  useEffect(() => {
    if (!notice) return undefined
    const timer = window.setTimeout(() => setNotice(''), 3000)
    return () => window.clearTimeout(timer)
  }, [notice])

  useEffect(() => {
    if (!studentModalOpen && !modalOpen && !assignModalOpen) return undefined
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previousOverflow }
  }, [studentModalOpen, modalOpen, assignModalOpen])

  const selectedStudent = students.find((student) => String(student.id) === selectedStudentId)
  const selectedSemester = semesters.find((semester) => String(semester.id) === selectedSemesterId)
  const classNames = useMemo(() => Array.from(new Set(
    students
      .map((student) => student.className?.trim())
      .filter(Boolean),
  )).sort((left, right) => left.localeCompare(right, 'vi')), [students])
  const filteredStudents = useMemo(() => {
    const keyword = search.trim().toLocaleLowerCase('vi')
    return students.filter((student) => {
      const inSelectedClass = selectedClassName === 'ALL'
        || (selectedClassName === 'UNASSIGNED' && !student.className?.trim())
        || student.className?.trim() === selectedClassName
      const matchesKeyword = !keyword || [student.userName, student.fullName, student.email]
        .some((value) => value?.toLocaleLowerCase('vi').includes(keyword))
      return inSelectedClass && matchesKeyword
    })
  }, [students, search, selectedClassName])
  const average = grades.length
    ? grades.reduce((sum, grade) => sum + Number(grade.totalScore || 0), 0) / grades.length
    : 0
  const passed = grades.filter((grade) => Number(grade.totalScore) >= 5).length
  const gradeBySubjectId = useMemo(
    () => new Map(grades.map((grade) => [grade.subjectId, grade])),
    [grades],
  )
  const assignedSubjectIds = useMemo(
    () => new Set(assignedSubjects.map((subject) => subject.id)),
    [assignedSubjects],
  )
  const gradedSubjectIds = useMemo(
    () => new Set(grades.map((grade) => grade.subjectId)),
    [grades],
  )

  const openCreate = (subjectId = '') => {
    setModalGrade(null)
    setModalSubjectId(subjectId)
    setModalOpen(true)
  }

  const selectClass = (event) => {
    setSelectedClassName(event.target.value)
    setSelectedStudentId('')
    setStudentModalOpen(false)
    setAssignModalOpen(false)
    setGrades([])
    setAssignedSubjects([])
  }

  const selectStudent = (student) => {
    setSelectedStudentId(String(student.id))
    setStudentModalOpen(true)
    setError('')
  }

  const openEdit = (grade) => {
    setModalGrade(grade)
    setModalSubjectId(grade.subjectId)
    setModalOpen(true)
  }

  const saveAssignedSubjects = async (subjectIds) => {
    const data = await adminApi.assignSubjects(
      session.accessToken,
      selectedStudentId,
      selectedSemesterId,
      subjectIds,
    )
    setAssignedSubjects(data)
    setAssignModalOpen(false)
    setNotice('Đã cập nhật môn học cho sinh viên')
  }

  const saveGrade = async (payload) => {
    if (modalGrade) {
      await adminApi.updateGrade(session.accessToken, modalGrade.id, payload)
      setNotice('Đã cập nhật điểm thành công')
    } else {
      await adminApi.createGrade(session.accessToken, payload)
      setNotice('Đã nhập điểm thành công')
    }
    setModalOpen(false)
    await loadGrades()
  }

  const deleteGrade = async (grade) => {
    if (!window.confirm(`Xóa kết quả môn ${grade.subjectCode} của sinh viên này?`)) return
    try {
      await adminApi.deleteGrade(session.accessToken, grade.id)
      setNotice('Đã xóa kết quả môn học')
      await loadGrades()
    } catch (err) {
      handleError(err)
    }
  }

  const changePage = (page) => {
    setActivePage(page)
    setStudentModalOpen(false)
    setAssignModalOpen(false)
    setModalOpen(false)
    setError('')
    setNotice('')
  }

  if (loading) {
    return <div className="app-loading"><span className="spinner spinner-orange" /><p>Đang tải dữ liệu quản trị...</p></div>
  }

  return (
    <div className="admin-shell">
      <aside className="sidebar">
        <div className="brand brand-sidebar">
          <span className="brand-mark"><span>F</span></span>
          <span><strong>FPT Schools</strong><small>Admin Portal</small></span>
        </div>
        <nav className="sidebar-nav" aria-label="Điều hướng chính">
          <button type="button" disabled><Icon name="dashboard" /> Tổng quan</button>
          <button className={activePage === 'grades' ? 'active' : ''} type="button" onClick={() => changePage('grades')}><Icon name="grade" /> Quản lý điểm</button>
          <button className={activePage === 'schedule' ? 'active' : ''} type="button" onClick={() => changePage('schedule')}><Icon name="calendar" /> Lịch học</button>
          <button type="button" disabled><Icon name="users" /> Sinh viên <span className="soon">Sớm</span></button>
          <button type="button" disabled><Icon name="book" /> Môn học <span className="soon">Sớm</span></button>
        </nav>
        <div className="sidebar-help">
          <span className="help-icon">?</span>
          <strong>Cần hỗ trợ?</strong>
          <small>Liên hệ phòng đào tạo</small>
        </div>
        <button className="sidebar-logout" type="button" onClick={onLogout}>
          <Icon name="logout" /> Đăng xuất
        </button>
      </aside>

      <main className="admin-main">
        <header className="topbar">
          <div>
            <span className="breadcrumb">Học vụ <Icon name="chevron" size={14} /> {activePage === 'grades' ? 'Quản lý điểm' : 'Lịch học'}</span>
            <h1>{activePage === 'grades' ? 'Quản lý điểm sinh viên' : 'Quản lý lịch học'}</h1>
          </div>
          <div className="admin-profile">
            <span className="avatar avatar-admin">A</span>
            <div><strong>{session.user.firstName || session.user.userName}</strong><small>Quản trị viên</small></div>
          </div>
        </header>

        {activePage === 'grades' && <div className="admin-content">
          {notice && <div className="toast-success"><Icon name="check" size={18} /> {notice}</div>}
          {error && <div className="alert alert-error page-alert"><Icon name="alert" size={18} /> {error}<button onClick={() => setError('')}>×</button></div>}

          <section className="filter-card">
            <div className="filter-heading">
              <div>
                <span className="section-kicker">BỘ LỌC DANH SÁCH</span>
                <h2>Chọn lớp và học kỳ</h2>
                <p>Lọc danh sách, sau đó chọn sinh viên cần nhập điểm.</p>
              </div>
            </div>
            <div className="filter-grid">
              <div>
                <label className="field-label" htmlFor="class-name">Lớp</label>
                <select
                  id="class-name"
                  className="select-control"
                  value={selectedClassName}
                  onChange={selectClass}
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
                    placeholder="Mã hoặc tên sinh viên"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className="field-label" htmlFor="semester">Học kỳ</label>
                <select id="semester" className="select-control" value={selectedSemesterId} onChange={(event) => setSelectedSemesterId(event.target.value)}>
                  <option value="">Chọn học kỳ</option>
                  {semesters.map((semester) => <option key={semester.id} value={semester.id}>{semester.name} · {semester.schoolYear}</option>)}
                </select>
              </div>
            </div>
          </section>

          <section className="roster-card">
            <div className="roster-heading">
              <div>
                <span className="section-kicker">DANH SÁCH SINH VIÊN</span>
                <h2>
                  {selectedClassName === 'ALL'
                    ? 'Tất cả lớp'
                    : selectedClassName === 'UNASSIGNED' ? 'Chưa xếp lớp' : selectedClassName}
                </h2>
              </div>
              <span className="roster-count">{filteredStudents.length} sinh viên</span>
            </div>

            {filteredStudents.length === 0 ? (
              <div className="roster-empty">
                <Icon name="users" size={28} />
                <strong>Không tìm thấy sinh viên</strong>
                <span>Thử đổi lớp hoặc từ khóa tìm kiếm.</span>
              </div>
            ) : (
              <div className="student-roster-grid">
                {filteredStudents.map((student) => {
                  const isSelected = String(student.id) === selectedStudentId
                  return (
                    <button
                      className={`student-roster-item${isSelected ? ' selected' : ''}`}
                      key={student.id}
                      type="button"
                      onClick={() => selectStudent(student)}
                    >
                      <span className="avatar">{student.fullName?.trim().charAt(0) || 'S'}</span>
                      <span className="student-roster-info">
                        <strong>{student.fullName || student.userName}</strong>
                        <small>{student.userName}</small>
                      </span>
                      <span className="class-chip">{student.className || 'Chưa xếp lớp'}</span>
                      <span className="student-select-action">
                        {isSelected && studentModalOpen
                          ? <><Icon name="check" size={15} /> Đang xem</>
                          : 'Chọn nhập điểm'}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
          </section>
        </div>}

        {activePage === 'schedule' && (
          <ScheduleManagement
            session={session}
            students={students}
            semesters={semesters}
            offeredSubjects={subjects}
            selectedSemesterId={selectedSemesterId}
            onSemesterChange={setSelectedSemesterId}
            onLogout={onLogout}
          />
        )}
      </main>

      {activePage === 'grades' && studentModalOpen && selectedStudent && (
        <div
          className="student-grade-backdrop"
          role="presentation"
          onMouseDown={() => setStudentModalOpen(false)}
        >
          <section
            className="student-grade-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="student-grade-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <header className="student-grade-dialog-header">
              <div className="student-modal-identity">
                <span className="avatar">{selectedStudent.fullName?.trim().charAt(0) || 'S'}</span>
                <div>
                  <span className="section-kicker">QUẢN LÝ ĐIỂM SINH VIÊN</span>
                  <h2 id="student-grade-title">{selectedStudent.fullName || selectedStudent.userName}</h2>
                  <p>{selectedStudent.userName} · {selectedStudent.className || 'Chưa xếp lớp'}</p>
                </div>
              </div>
              <div className="student-modal-controls">
                <label htmlFor="modal-semester">Học kỳ</label>
                <select
                  id="modal-semester"
                  className="select-control"
                  value={selectedSemesterId}
                  onChange={(event) => setSelectedSemesterId(event.target.value)}
                >
                  <option value="">Chọn học kỳ</option>
                  {semesters.map((semester) => (
                    <option key={semester.id} value={semester.id}>
                      {semester.name} · {semester.schoolYear}
                    </option>
                  ))}
                </select>
                <button
                  className="icon-button"
                  type="button"
                  onClick={() => setStudentModalOpen(false)}
                  aria-label="Đóng bảng điểm"
                >
                  <Icon name="close" size={19} />
                </button>
              </div>
            </header>

            <div className="student-grade-dialog-body">
              {error && (
                <div className="alert alert-error">
                  <Icon name="alert" size={18} /> {error}
                </div>
              )}

              <section className="stats-grid">
                <article className="stat-card stat-orange"><span className="stat-icon"><Icon name="book" /></span><div><small>Số môn đã nhập</small><strong>{grades.length}</strong><span>/ {assignedSubjects.length} môn đã gán</span></div></article>
                <article className="stat-card stat-blue"><span className="stat-icon"><Icon name="chart" /></span><div><small>Điểm trung bình</small><strong>{average.toFixed(2)}</strong><span>Thang điểm 10</span></div></article>
                <article className="stat-card stat-green"><span className="stat-icon"><Icon name="check" /></span><div><small>Môn đạt</small><strong>{passed}</strong><span>{grades.length ? `${Math.round(passed / grades.length * 100)}% hoàn thành` : 'Chưa có dữ liệu'}</span></div></article>
              </section>

              <section className="table-card">
                <div className="table-heading">
                  <div>
                    <span className="section-kicker">BẢNG ĐIỂM HỌC KỲ</span>
                    <h2>{selectedSemester?.name || 'Chưa chọn học kỳ'}</h2>
                    <p>{selectedStudent.userName} · {selectedStudent.className || 'Chưa xếp lớp'}</p>
                  </div>
                  <div className="table-heading-actions">
                    <button
                      className="secondary-button assign-subject-button"
                      type="button"
                      onClick={() => setAssignModalOpen(true)}
                      disabled={!selectedSemester}
                    >
                      <Icon name="book" size={17} /> Gán môn học
                    </button>
                    <button
                      className="primary-button"
                      type="button"
                      onClick={() => openCreate()}
                      disabled={!selectedSemester || grades.length >= assignedSubjects.length}
                    >
                      <Icon name="plus" size={18} /> Nhập điểm mới
                    </button>
                  </div>
                </div>

                <div className="table-scroll">
                  <table>
                    <thead><tr><th>Môn học</th><th>Điểm thành phần</th><th>Điểm tổng</th><th>Xếp loại</th><th className="align-right">Thao tác</th></tr></thead>
                    <tbody>
                      {gradesLoading ? (
                        <tr><td colSpan="5"><div className="empty-state"><span className="spinner spinner-orange" /> Đang tải bảng điểm...</div></td></tr>
                      ) : assignedSubjects.length === 0 ? (
                        <tr><td colSpan="5"><div className="empty-state"><span className="empty-icon"><Icon name="book" size={28} /></span><strong>Chưa được gán môn học</strong><p>Nhấn “Gán môn học” để chọn các môn sinh viên sẽ học.</p></div></td></tr>
                      ) : assignedSubjects.map((subject) => {
                        const grade = gradeBySubjectId.get(subject.id)
                        return (
                          <tr className={grade ? '' : 'ungraded-row'} key={subject.id}>
                            <td><div className="subject-cell"><span>{subject.subjectCode.slice(0, 2)}</span><div><strong>{subject.subjectCode}</strong><small>{subject.subjectName}</small></div></div></td>
                            <td>{grade ? <div className="score-pills">{grade.items.map((item) => <span key={item.id}><small>{item.name}</small><strong>{Number(item.score).toFixed(1)}</strong><em>{Number(item.weight)}%</em></span>)}</div> : <span className="not-graded-text">Chưa có điểm thành phần</span>}</td>
                            <td>{grade ? <strong className="total-score">{Number(grade.totalScore).toFixed(2)}</strong> : <span className="score-placeholder">—</span>}</td>
                            <td>{grade ? <span className={`letter-grade ${gradeTone(grade.letterGrade)}`}>{grade.letterGrade}</span> : <span className="pending-grade">Chưa nhập</span>}</td>
                            <td>
                              {grade ? (
                                <div className="row-actions"><button type="button" onClick={() => openEdit(grade)} title="Sửa điểm"><Icon name="edit" size={17} /></button><button className="danger" type="button" onClick={() => deleteGrade(grade)} title="Xóa điểm"><Icon name="trash" size={17} /></button></div>
                              ) : (
                                <div className="row-actions"><button className="enter-grade-action" type="button" onClick={() => openCreate(subject.id)} title="Nhập điểm"><Icon name="plus" size={17} /></button></div>
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
          </section>
        </div>
      )}

      {activePage === 'grades' && assignModalOpen && selectedStudent && selectedSemester && (
        <AssignSubjectsModal
          student={selectedStudent}
          semester={selectedSemester}
          subjects={subjects}
          assignedSubjectIds={assignedSubjectIds}
          gradedSubjectIds={gradedSubjectIds}
          onClose={() => setAssignModalOpen(false)}
          onSave={saveAssignedSubjects}
        />
      )}

      {activePage === 'grades' && modalOpen && selectedStudent && selectedSemester && (
        <GradeModal
          grade={modalGrade}
          student={selectedStudent}
          semester={selectedSemester}
          subjects={assignedSubjects}
          existingSubjectIds={gradedSubjectIds}
          initialSubjectId={modalSubjectId}
          onClose={() => setModalOpen(false)}
          onSave={saveGrade}
        />
      )}
    </div>
  )
}
