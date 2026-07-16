import { useState } from 'react'
import Icon from '../components/Icon.jsx'

export default function LoginPage({ onLogin }) {
  const [form, setForm] = useState({ userName: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    setLoading(true)
    try {
      await onLogin({
        userName: form.userName.trim(),
        password: form.password,
      })
    } catch (err) {
      setError(err.message || 'Đăng nhập không thành công')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="login-page">
      <section className="login-showcase">
        <div className="brand brand-light">
          <span className="brand-mark"><span>F</span></span>
          <span><strong>FPT Schools</strong><small>School Portal</small></span>
        </div>
        <div className="showcase-copy">
          <span className="eyebrow">PRM393 · SCHOOL PORTAL</span>
          <h1>Quản lý học vụ,<br />đúng vai trò.</h1>
          <p>Giáo viên bộ môn nhập điểm và xem lịch dạy. Giáo viên chủ nhiệm phê duyệt đơn từ phụ huynh.</p>
          <div className="showcase-points">
            <span><Icon name="check" size={18} /> Tách quyền GVBM và GVCN</span>
            <span><Icon name="check" size={18} /> GVBM nhập điểm theo môn</span>
            <span><Icon name="check" size={18} /> GVCN duyệt đơn theo lớp</span>
          </div>
        </div>
        <div className="showcase-orb orb-one" />
        <div className="showcase-orb orb-two" />
      </section>

      <section className="login-panel">
        <form className="login-card" onSubmit={submit}>
          <div className="mobile-brand brand">
            <span className="brand-mark"><span>F</span></span>
            <span><strong>FPT Schools</strong><small>School Portal</small></span>
          </div>
          <div className="login-heading">
            <span className="login-icon"><Icon name="grade" size={26} /></span>
            <h2>Đăng nhập hệ thống</h2>
            <p>Sử dụng tài khoản giáo viên bộ môn hoặc giáo viên chủ nhiệm</p>
          </div>

          {error && (
            <div className="alert alert-error" role="alert">
              <Icon name="alert" size={18} />
              <span>{error}</span>
            </div>
          )}

          <label className="field-label" htmlFor="userName">Tên đăng nhập</label>
          <div className="input-shell">
            <Icon name="users" size={19} />
            <input
              id="userName"
              autoComplete="username"
              placeholder="Nhập tên đăng nhập"
              value={form.userName}
              onChange={(event) => setForm({ ...form, userName: event.target.value })}
              required
              autoFocus
            />
          </div>

          <label className="field-label" htmlFor="password">Mật khẩu</label>
          <div className="input-shell">
            <span className="lock-glyph">⌁</span>
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="Nhập mật khẩu"
              value={form.password}
              onChange={(event) => setForm({ ...form, password: event.target.value })}
              required
              minLength={6}
            />
            <button
              className="password-toggle"
              type="button"
              onClick={() => setShowPassword((visible) => !visible)}
              aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
            >
              {showPassword ? 'Ẩn' : 'Hiện'}
            </button>
          </div>

          <button className="primary-button login-button" type="submit" disabled={loading}>
            {loading ? <span className="spinner" /> : <>Đăng nhập <Icon name="chevron" size={18} /></>}
          </button>

          <p className="security-note">Phiên đăng nhập JWT được dùng cho các API theo vai trò của backend</p>
        </form>
      </section>
    </main>
  )
}
