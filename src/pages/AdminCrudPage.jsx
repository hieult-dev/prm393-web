import { useEffect, useMemo, useState } from 'react'
import { adminApi, ApiError } from '../api.js'
import Icon from '../components/Icon.jsx'

const ROLE_OPTIONS = [
  'ADMIN',
  'STUDENT',
  'PARENT',
  'TEACHER',
  'SUBJECT_TEACHER',
  'HOMEROOM_TEACHER',
]

const STATUS_OPTIONS = ['ACTIVE', 'INACTIVE']
const EXAM_STATUS_OPTIONS = ['PUBLISHED', 'DRAFT', 'CANCELLED']
const EXAM_TYPE_OPTIONS = ['FINAL', 'MIDTERM', 'PRACTICAL', 'RETAKE']
const ADMIN_RESOURCE_ORDER = ['users', 'exam-schedules', 'events', 'clubs']

function displayUserName(user) {
  const name = [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim()
  return name || user?.fullName || user?.userName || 'Admin'
}

function initialOf(value, fallback) {
  return (value || fallback || '?').trim().charAt(0).toUpperCase()
}

function cleanText(value) {
  return value?.toString().trim() || ''
}

function optionalText(value) {
  const cleaned = cleanText(value)
  return cleaned || null
}

function splitCsv(value) {
  return cleanText(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

function roleNames(user) {
  if (Array.isArray(user?.roles)) {
    return user.roles
      .map((role) => (typeof role === 'string' ? role : role?.roleName))
      .filter(Boolean)
  }
  return user?.role ? [user.role] : []
}

function permissionNames(role) {
  if (!Array.isArray(role?.permissions)) return []
  return role.permissions
    .map((permission) => (
      typeof permission === 'string' ? permission : permission?.permissionName
    ))
    .filter(Boolean)
}

function toDateInput(value) {
  return value ? String(value).slice(0, 10) : ''
}

function toDateTimeInput(value) {
  return value ? String(value).slice(0, 16) : ''
}

function toTimeInput(value) {
  return value ? String(value).slice(0, 5) : ''
}

function formatDateTime(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatDate(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function formatTime(value) {
  if (!value) return '-'
  const parts = String(value).split(':')
  return parts.length >= 2
    ? `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`
    : String(value)
}

function formatStatus(value) {
  const status = value || 'ACTIVE'
  return <span className={`application-status status-${status.toLowerCase()}`}>{status}</span>
}

function IdentityCell({ item, title, subtitle, fallback = 'A' }) {
  return (
    <div className="subject-cell student-cell">
      <span>{initialOf(title, fallback)}</span>
      <div>
        <strong>{title || `#${item.id}`}</strong>
        <small>{subtitle || `ID ${item.id}`}</small>
      </div>
    </div>
  )
}

function TextCell({ title, subtitle }) {
  return (
    <div className="admin-text-cell">
      <strong>{title || '—'}</strong>
      {subtitle && <small>{subtitle}</small>}
    </div>
  )
}

const RESOURCE_CONFIGS = [
  {
    key: 'users',
    path: '/users',
    title: 'Người dùng',
    single: 'người dùng',
    icon: 'users',
    description: 'Tạo tài khoản, đổi thông tin cơ bản, role và trạng thái.',
    nameOf: (item) => item.userName,
    searchText: (item) => [
      item.userName,
      item.email,
      item.firstName,
      item.lastName,
      item.phone,
      item.className,
      ...roleNames(item),
    ].join(' '),
    columns: [
      {
        label: 'Tài khoản',
        render: (item) => (
          <IdentityCell
            item={item}
            title={displayUserName(item)}
            subtitle={`${item.userName || 'No username'} · ${item.email || 'No email'}`}
            fallback="U"
          />
        ),
      },
      {
        label: 'Role',
        render: (item) => (
          <div className="admin-chip-list">
            {roleNames(item).map((role) => <span className="class-chip" key={role}>{role}</span>)}
          </div>
        ),
      },
      { label: 'Lớp', render: (item) => item.className || '—' },
      { label: 'Trạng thái', render: (item) => formatStatus(item.status) },
      { label: 'Ngày tạo', render: (item) => formatDateTime(item.createdAt) },
    ],
    fields: [
      { name: 'userName', label: 'Tên đăng nhập', required: true },
      {
        name: 'userPassword',
        label: 'Mật khẩu',
        type: 'password',
        requiredOnCreate: true,
        placeholder: 'Để trống khi sửa nếu không đổi mật khẩu',
      },
      { name: 'firstName', label: 'Họ' },
      { name: 'lastName', label: 'Tên' },
      { name: 'email', label: 'Email', type: 'email' },
      { name: 'phone', label: 'Số điện thoại' },
      { name: 'className', label: 'Lớp' },
      {
        name: 'roleName',
        label: 'Role',
        type: 'select',
        required: true,
        defaultValue: 'STUDENT',
        options: ROLE_OPTIONS.map((role) => ({ value: role, label: role })),
        getValue: (item) => roleNames(item)[0] || 'STUDENT',
      },
      {
        name: 'status',
        label: 'Trạng thái',
        type: 'select',
        required: true,
        defaultValue: 'ACTIVE',
        options: STATUS_OPTIONS.map((status) => ({ value: status, label: status })),
      },
    ],
    toPayload: (form, mode) => {
      const payload = {
        userName: cleanText(form.userName),
        email: optionalText(form.email),
        firstName: optionalText(form.firstName),
        lastName: optionalText(form.lastName),
        phone: optionalText(form.phone),
        className: optionalText(form.className),
        roles: cleanText(form.roleName) ? [{ roleName: cleanText(form.roleName) }] : [],
        status: cleanText(form.status) || 'ACTIVE',
      }
      if (mode === 'create' || cleanText(form.userPassword)) {
        payload.userPassword = cleanText(form.userPassword)
      }
      return payload
    },
  },
  {
    key: 'subjects',
    path: '/subjects',
    title: 'Môn học',
    single: 'môn học',
    icon: 'book',
    description: 'Quản lý mã môn, tên môn và số tín chỉ.',
    nameOf: (item) => item.subjectCode,
    searchText: (item) => `${item.subjectCode} ${item.subjectName}`,
    columns: [
      {
        label: 'Môn học',
        render: (item) => (
          <IdentityCell item={item} title={item.subjectName} subtitle={item.subjectCode} fallback="S" />
        ),
      },
      { label: 'Mã môn', render: (item) => <span className="class-chip">{item.subjectCode}</span> },
      { label: 'Tín chỉ', render: (item) => item.credits },
    ],
    fields: [
      { name: 'subjectCode', label: 'Mã môn', required: true },
      { name: 'subjectName', label: 'Tên môn', required: true },
      { name: 'credits', label: 'Tín chỉ', type: 'number', required: true, defaultValue: 3, min: 1 },
    ],
  },
  {
    key: 'semesters',
    path: '/semesters',
    title: 'Học kỳ',
    single: 'học kỳ',
    icon: 'calendar',
    description: 'Tạo và cập nhật kỳ học theo năm học.',
    nameOf: (item) => `${item.name} ${item.schoolYear}`,
    searchText: (item) => `${item.name} ${item.schoolYear}`,
    columns: [
      {
        label: 'Học kỳ',
        render: (item) => <TextCell title={item.name} subtitle={item.schoolYear} />,
      },
      { label: 'Bắt đầu', render: (item) => formatDate(item.startDate) },
      { label: 'Kết thúc', render: (item) => formatDate(item.endDate) },
    ],
    fields: [
      { name: 'name', label: 'Tên học kỳ', required: true },
      { name: 'schoolYear', label: 'Năm học', required: true, placeholder: '2026-2027' },
      { name: 'startDate', label: 'Ngày bắt đầu', type: 'date', required: true },
      { name: 'endDate', label: 'Ngày kết thúc', type: 'date', required: true },
    ],
  },
  {
    key: 'events',
    path: '/events',
    title: 'Sự kiện',
    single: 'sự kiện',
    icon: 'calendar',
    description: 'Quản lý event feed hiển thị trên mobile.',
    nameOf: (item) => item.title,
    searchText: (item) => `${item.title} ${item.location} ${item.status}`,
    columns: [
      {
        label: 'Sự kiện',
        render: (item) => <TextCell title={item.title} subtitle={item.location || 'Chưa có địa điểm'} />,
      },
      { label: 'Bắt đầu', render: (item) => formatDateTime(item.startTime) },
      { label: 'Kết thúc', render: (item) => formatDateTime(item.endTime) },
      { label: 'Trạng thái', render: (item) => formatStatus(item.status) },
    ],
    fields: [
      { name: 'title', label: 'Tiêu đề', required: true, full: true },
      { name: 'location', label: 'Địa điểm' },
      {
        name: 'status',
        label: 'Trạng thái',
        type: 'select',
        required: true,
        defaultValue: 'ACTIVE',
        options: STATUS_OPTIONS.map((status) => ({ value: status, label: status })),
      },
      { name: 'startTime', label: 'Thời gian bắt đầu', type: 'datetime-local', required: true },
      { name: 'endTime', label: 'Thời gian kết thúc', type: 'datetime-local' },
      { name: 'imageUrl', label: 'Ảnh URL', full: true },
      { name: 'description', label: 'Mô tả', type: 'textarea', full: true },
    ],
  },
  {
    key: 'exam-schedules',
    path: '/exam-schedules',
    title: 'Exam',
    single: 'exam',
    icon: 'calendar',
    description: 'Manage student exam date, time, room, seat, and publication status.',
    nameOf: (item) => `${item.subjectId || 'Subject'} - ${item.examType || 'Exam'}`,
    searchText: (item) => [
      item.userId,
      item.subjectId,
      item.semesterId,
      item.examType,
      item.examDate,
      item.room,
      item.seatNumber,
      item.proctorName,
      item.status,
    ].join(' '),
    columns: [
      {
        label: 'Exam',
        render: (item) => (
          <TextCell
            title={`${item.examType || 'EXAM'} - subject #${item.subjectId}`}
            subtitle={`Student #${item.userId} - semester #${item.semesterId}`}
          />
        ),
      },
      { label: 'Date', render: (item) => formatDate(item.examDate) },
      { label: 'Time', render: (item) => `${formatTime(item.startTime)} - ${formatTime(item.endTime)}` },
      { label: 'Room / Seat', render: (item) => `${item.room || '-'} / ${item.seatNumber || '-'}` },
      { label: 'Status', render: (item) => formatStatus(item.status) },
    ],
    fields: [
      { name: 'userId', label: 'Student ID', type: 'number', required: true, min: 1 },
      { name: 'subjectId', label: 'Subject ID', type: 'number', required: true, min: 1 },
      { name: 'semesterId', label: 'Semester ID', type: 'number', required: true, min: 1 },
      {
        name: 'examType',
        label: 'Exam type',
        type: 'select',
        required: true,
        defaultValue: 'FINAL',
        options: EXAM_TYPE_OPTIONS.map((type) => ({ value: type, label: type })),
      },
      { name: 'examDate', label: 'Exam date', type: 'date', required: true },
      { name: 'startTime', label: 'Start time', type: 'time', required: true },
      { name: 'endTime', label: 'End time', type: 'time', required: true },
      { name: 'room', label: 'Room' },
      { name: 'seatNumber', label: 'Seat number' },
      { name: 'proctorName', label: 'Proctor' },
      {
        name: 'status',
        label: 'Status',
        type: 'select',
        required: true,
        defaultValue: 'PUBLISHED',
        options: EXAM_STATUS_OPTIONS.map((status) => ({ value: status, label: status })),
      },
      { name: 'note', label: 'Note', type: 'textarea', full: true },
    ],
  },
  {
    key: 'clubs',
    path: '/clubs',
    title: 'Câu lạc bộ',
    single: 'câu lạc bộ',
    icon: 'users',
    description: 'Quản lý CLB, người phụ trách, liên hệ và trạng thái.',
    nameOf: (item) => item.name,
    searchText: (item) => `${item.name} ${item.leaderName} ${item.contactEmail} ${item.status}`,
    columns: [
      {
        label: 'CLB',
        render: (item) => <IdentityCell item={item} title={item.name} subtitle={item.leaderName || 'Chưa có leader'} fallback="C" />,
      },
      { label: 'Email', render: (item) => item.contactEmail || '—' },
      { label: 'Trạng thái', render: (item) => formatStatus(item.status) },
      { label: 'Ngày tạo', render: (item) => formatDateTime(item.createdAt) },
    ],
    fields: [
      { name: 'name', label: 'Tên CLB', required: true },
      { name: 'leaderName', label: 'Người phụ trách' },
      { name: 'contactEmail', label: 'Email liên hệ', type: 'email' },
      {
        name: 'status',
        label: 'Trạng thái',
        type: 'select',
        required: true,
        defaultValue: 'ACTIVE',
        options: STATUS_OPTIONS.map((status) => ({ value: status, label: status })),
      },
      { name: 'imageUrl', label: 'Ảnh URL', full: true },
      { name: 'description', label: 'Mô tả', type: 'textarea', full: true },
    ],
  },
  {
    key: 'application-types',
    path: '/application-types',
    title: 'Loại đơn',
    single: 'loại đơn',
    icon: 'book',
    description: 'Quản lý danh mục loại đơn phụ huynh/học sinh gửi.',
    nameOf: (item) => item.name,
    searchText: (item) => `${item.name} ${item.description}`,
    columns: [
      { label: 'Tên loại đơn', render: (item) => <TextCell title={item.name} subtitle={`ID ${item.id}`} /> },
      { label: 'Mô tả', render: (item) => <span className="admin-long-text">{item.description || '—'}</span> },
    ],
    fields: [
      { name: 'name', label: 'Tên loại đơn', required: true },
      { name: 'description', label: 'Mô tả', type: 'textarea', full: true },
    ],
  },
  {
    key: 'roles',
    path: '/roles',
    title: 'Role',
    single: 'role',
    icon: 'check',
    description: 'Quản lý role và danh sách permission gắn kèm.',
    nameOf: (item) => item.roleName,
    searchText: (item) => `${item.roleName} ${permissionNames(item).join(' ')}`,
    columns: [
      { label: 'Role', render: (item) => <TextCell title={item.roleName} subtitle={`ID ${item.id}`} /> },
      {
        label: 'Permissions',
        render: (item) => (
          <div className="admin-chip-list">
            {permissionNames(item).length
              ? permissionNames(item).map((permission) => <span className="class-chip" key={permission}>{permission}</span>)
              : '—'}
          </div>
        ),
      },
    ],
    fields: [
      { name: 'roleName', label: 'Tên role', required: true },
      {
        name: 'permissionNames',
        label: 'Permissions',
        type: 'textarea',
        full: true,
        placeholder: 'Nhập nhiều permission, cách nhau bằng dấu phẩy',
        getValue: (item) => permissionNames(item).join(', '),
      },
    ],
    toPayload: (form) => ({
      roleName: cleanText(form.roleName),
      permissions: splitCsv(form.permissionNames).map((permissionName) => ({ permissionName })),
    }),
  },
  {
    key: 'permissions',
    path: '/permissions',
    title: 'Permission',
    single: 'permission',
    icon: 'alert',
    description: 'Quản lý quyền chi tiết dùng trong role.',
    nameOf: (item) => item.permissionName,
    searchText: (item) => `${item.permissionName} ${item.description}`,
    columns: [
      { label: 'Permission', render: (item) => <TextCell title={item.permissionName} subtitle={`ID ${item.id}`} /> },
      { label: 'Mô tả', render: (item) => <span className="admin-long-text">{item.description || '—'}</span> },
    ],
    fields: [
      { name: 'permissionName', label: 'Tên permission', required: true },
      { name: 'description', label: 'Mô tả', type: 'textarea', full: true },
    ],
  },
].filter((resource) => ADMIN_RESOURCE_ORDER.includes(resource.key))
  .sort((left, right) => (
    ADMIN_RESOURCE_ORDER.indexOf(left.key) - ADMIN_RESOURCE_ORDER.indexOf(right.key)
  ))

function buildForm(config, item) {
  return config.fields.reduce((form, field) => {
    if (field.getValue && item) {
      form[field.name] = field.getValue(item)
      return form
    }

    if (!item) {
      form[field.name] = field.defaultValue ?? ''
      return form
    }

    const rawValue = item[field.name]
    if (field.type === 'date') {
      form[field.name] = toDateInput(rawValue)
    } else if (field.type === 'datetime-local') {
      form[field.name] = toDateTimeInput(rawValue)
    } else if (field.type === 'time') {
      form[field.name] = toTimeInput(rawValue)
    } else {
      form[field.name] = rawValue ?? field.defaultValue ?? ''
    }
    return form
  }, {})
}

function genericPayload(config, form) {
  return config.fields.reduce((payload, field) => {
    if (field.payload === false) return payload

    const rawValue = form[field.name]
    if (field.type === 'number') {
      payload[field.name] = rawValue === '' ? null : Number(rawValue)
      return payload
    }

    const value = typeof rawValue === 'string' ? rawValue.trim() : rawValue
    payload[field.name] = value === '' ? null : value
    return payload
  }, {})
}

function errorMessage(error) {
  if (error instanceof ApiError) return error.message
  return error?.message || 'Thao tác không thành công'
}

export default function AdminCrudPage({ session, onLogout }) {
  const [activeKey, setActiveKey] = useState(RESOURCE_CONFIGS[0].key)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [search, setSearch] = useState('')
  const [modalState, setModalState] = useState(null)

  const config = useMemo(
    () => RESOURCE_CONFIGS.find((resource) => resource.key === activeKey) || RESOURCE_CONFIGS[0],
    [activeKey],
  )
  const adminName = displayUserName(session.user)

  const loadData = async (nextConfig = config) => {
    setLoading(true)
    setError('')
    try {
      const data = await adminApi.list(session.accessToken, nextConfig.path)
      setItems(Array.isArray(data) ? data : [])
    } catch (loadError) {
      setError(errorMessage(loadError))
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setSearch('')
    setModalState(null)
    loadData(config)
  }, [config.key])

  const filteredItems = useMemo(() => {
    const keyword = search.trim().toLowerCase()
    if (!keyword) return items
    return items.filter((item) => config.searchText(item).toLowerCase().includes(keyword))
  }, [config, items, search])

  const activeCount = items.filter((item) => ['ACTIVE', 'PUBLISHED'].includes(item.status)).length
  const inactiveCount = items.filter((item) => item.status && !['ACTIVE', 'PUBLISHED'].includes(item.status)).length

  const openCreate = () => {
    setError('')
    setModalState({ mode: 'create', item: null })
  }
  const openEdit = (item) => {
    setError('')
    setModalState({ mode: 'edit', item })
  }

  const saveItem = async (form) => {
    setSaving(true)
    setError('')
    try {
      const payload = config.toPayload
        ? config.toPayload(form, modalState.mode)
        : genericPayload(config, form)
      if (modalState.mode === 'edit') {
        await adminApi.update(session.accessToken, config.path, modalState.item.id, payload)
        setNotice(`Đã cập nhật ${config.single}`)
      } else {
        await adminApi.create(session.accessToken, config.path, payload)
        setNotice(`Đã tạo ${config.single}`)
      }
      setModalState(null)
      await loadData(config)
    } catch (saveError) {
      setError(errorMessage(saveError))
    } finally {
      setSaving(false)
    }
  }

  const deleteItem = async (item) => {
    const name = config.nameOf(item) || `#${item.id}`
    if (!window.confirm(`Xóa ${config.single} "${name}"?`)) return

    setError('')
    try {
      await adminApi.remove(session.accessToken, config.path, item.id)
      setNotice(`Đã xóa ${config.single}`)
      await loadData(config)
    } catch (deleteError) {
      setError(errorMessage(deleteError))
    }
  }

  return (
    <div className="teacher-shell admin-shell">
      <aside className="sidebar">
        <div className="brand brand-sidebar">
          <span className="brand-mark"><span>F</span></span>
          <span><strong>FPT Schools</strong><small>Admin Portal</small></span>
        </div>
        <nav className="sidebar-nav" aria-label="Điều hướng admin">
          {RESOURCE_CONFIGS.map((resource) => (
            <button
              className={resource.key === config.key ? 'active' : ''}
              key={resource.key}
              type="button"
              onClick={() => setActiveKey(resource.key)}
            >
              <Icon name={resource.icon} /> {resource.title}
            </button>
          ))}
        </nav>
        <button className="sidebar-logout" type="button" onClick={onLogout}>
          <Icon name="logout" /> Đăng xuất
        </button>
      </aside>

      <main className="teacher-main">
        <header className="topbar">
          <div>
            <span className="breadcrumb">Admin <Icon name="chevron" size={14} /> CRUD</span>
            <h1>Quản trị {config.title.toLowerCase()}</h1>
          </div>
          <div className="teacher-profile">
            <span className="avatar avatar-teacher">{initialOf(adminName, 'A')}</span>
            <div><strong>{adminName}</strong><small>Quản trị hệ thống</small></div>
          </div>
        </header>

        <div className="teacher-content admin-content">
          {notice && <div className="toast-success"><Icon name="check" size={18} /> {notice}</div>}
          {error && (
            <div className="alert alert-error page-alert">
              <Icon name="alert" size={18} />
              {error}
              <button type="button" onClick={() => setError('')}>×</button>
            </div>
          )}

          <section className="stats-grid admin-stats">
            <article className="stat-card stat-orange"><span className="stat-icon"><Icon name={config.icon} /></span><div><small>Tổng bản ghi</small><strong>{items.length}</strong><span>{config.title}</span></div></article>
            <article className="stat-card stat-green"><span className="stat-icon"><Icon name="check" /></span><div><small>ACTIVE</small><strong>{activeCount}</strong><span>{activeCount ? 'đang sử dụng' : 'không có status'}</span></div></article>
            <article className="stat-card stat-blue"><span className="stat-icon"><Icon name="search" /></span><div><small>Đang lọc</small><strong>{filteredItems.length}</strong><span>{inactiveCount} inactive</span></div></article>
          </section>

          <section className="filter-card admin-toolbar">
            <div className="filter-heading">
              <div>
                <span className="section-kicker">CRUD ADMIN</span>
                <h2>{config.title}</h2>
                <p>{config.description}</p>
              </div>
              <button className="primary-button" type="button" onClick={openCreate}>
                <Icon name="plus" size={17} /> Thêm mới
              </button>
            </div>
            <div className="filter-grid admin-filter-grid">
              <div>
                <label className="field-label" htmlFor="admin-search">Tìm kiếm</label>
                <div className="input-shell compact">
                  <Icon name="search" size={18} />
                  <input
                    id="admin-search"
                    placeholder={`Tìm trong ${config.title.toLowerCase()}`}
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                  />
                </div>
              </div>
              <div className="admin-toolbar-actions">
                <button className="secondary-button" type="button" onClick={() => loadData(config)} disabled={loading}>
                  {loading ? <span className="spinner spinner-orange" /> : <Icon name="search" size={17} />}
                  Làm mới
                </button>
              </div>
            </div>
          </section>

          <section className="table-card admin-table-card">
            <div className="table-heading">
              <div>
                <span className="section-kicker">DANH SÁCH</span>
                <h2>{filteredItems.length} {config.single}</h2>
                <p>{search ? `Theo từ khóa "${search}"` : 'Tất cả bản ghi từ backend'}</p>
              </div>
              <span className="status-chip"><span /> {config.path}</span>
            </div>

            <div className="table-scroll">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th className="stt-column">STT</th>
                    {config.columns.map((column) => <th key={column.label}>{column.label}</th>)}
                    <th className="align-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={config.columns.length + 2}><div className="empty-state"><span className="spinner spinner-orange" /> Đang tải dữ liệu...</div></td></tr>
                  ) : filteredItems.length === 0 ? (
                    <tr><td colSpan={config.columns.length + 2}><div className="empty-state"><span className="empty-icon"><Icon name={config.icon} size={28} /></span><strong>Không có dữ liệu</strong><p>Thử làm mới hoặc thêm bản ghi mới.</p></div></td></tr>
                  ) : filteredItems.map((item, index) => (
                    <tr key={item.id}>
                      <td className="stt-column">{index + 1}</td>
                      {config.columns.map((column) => <td key={column.label}>{column.render(item)}</td>)}
                      <td>
                        <div className="row-actions">
                          <button type="button" onClick={() => openEdit(item)} title="Sửa">
                            <Icon name="edit" size={17} />
                          </button>
                          <button className="danger" type="button" onClick={() => deleteItem(item)} title="Xóa">
                            <Icon name="trash" size={17} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </main>

      {modalState && (
        <ResourceModal
          config={config}
          item={modalState.item}
          mode={modalState.mode}
          error={error}
          saving={saving}
          onClose={() => setModalState(null)}
          onSubmit={saveItem}
        />
      )}
    </div>
  )
}

function ResourceModal({ config, item, mode, error, saving, onClose, onSubmit }) {
  const [form, setForm] = useState(() => buildForm(config, item))

  useEffect(() => {
    setForm(buildForm(config, item))
  }, [config.key, item?.id])

  const updateField = (name, value) => {
    setForm((current) => ({ ...current, [name]: value }))
  }

  const submit = (event) => {
    event.preventDefault()
    onSubmit(form)
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <div className="modal-card admin-modal" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <div>
            <span className="section-kicker">{mode === 'edit' ? 'CẬP NHẬT' : 'THÊM MỚI'}</span>
            <h2>{mode === 'edit' ? `Sửa ${config.single}` : `Thêm ${config.single}`}</h2>
          </div>
          <button className="icon-button" type="button" onClick={onClose} title="Đóng">
            <Icon name="close" size={18} />
          </button>
        </div>
        <form onSubmit={submit}>
          {error && (
            <div className="alert alert-error admin-modal-alert">
              <Icon name="alert" size={18} /> {error}
            </div>
          )}
          <div className="admin-form-grid">
            {config.fields.map((field) => (
              <div className={field.full ? 'admin-field-full' : ''} key={field.name}>
                <label className="field-label" htmlFor={`admin-${field.name}`}>{field.label}</label>
                <AdminField
                  field={field}
                  id={`admin-${field.name}`}
                  mode={mode}
                  value={form[field.name] ?? ''}
                  onChange={(value) => updateField(field.name, value)}
                />
              </div>
            ))}
          </div>
          <div className="modal-actions">
            <button className="secondary-button" type="button" onClick={onClose} disabled={saving}>Hủy</button>
            <button className="primary-button" type="submit" disabled={saving}>
              {saving ? <span className="spinner" /> : <Icon name="check" size={17} />}
              Lưu
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function AdminField({ field, id, mode, value, onChange }) {
  const required = field.required || (mode === 'create' && field.requiredOnCreate)

  if (field.type === 'textarea') {
    return (
      <textarea
        className="textarea-control"
        id={id}
        placeholder={field.placeholder}
        required={required}
        rows={field.rows || 4}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    )
  }

  if (field.type === 'select') {
    return (
      <select
        className="select-control"
        id={id}
        required={required}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {!required && <option value="">Không chọn</option>}
        {field.options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    )
  }

  return (
    <input
      className="admin-input"
      id={id}
      min={field.min}
      placeholder={field.placeholder}
      required={required}
      type={field.type || 'text'}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  )
}
