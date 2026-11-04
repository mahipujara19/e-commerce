import { Suspense, useEffect, useState } from 'react'
import { CircularProgress, Drawer, IconButton, Tooltip } from '@mui/material'
import MenuRoundedIcon from '@mui/icons-material/MenuRounded'
import CloseRoundedIcon from '@mui/icons-material/CloseRounded'
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded'
import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined'
import LightModeOutlinedIcon from '@mui/icons-material/LightModeOutlined'
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { logout } from '../../toolkit/authSlice'
import { fetchCustomers } from '../../toolkit/customerSlice'
import { fetchAllOrders } from '../../toolkit/orderSlice'
import { fetchproduct } from '../../toolkit/productslice'
import { toggleTheme } from '../../toolkit/uiSlice'
import { LOW_STOCK_THRESHOLD } from '../../utils/format'
import PageLoader from '../PageLoader'
import { ADMIN_SECTIONS, adminPath, canAccess } from './adminSections'

function AdminLogo() {
  const role = useSelector((state) => state.auth.user?.role)
  return (
    <Link to="/admin" className="flex items-baseline gap-3">
      <span className="font-display text-2xl font-semibold tracking-tight">
        good<span className="font-normal italic">things</span>
        <span className="text-gold-light">.</span>
      </span>
      <span className="text-[10px] font-semibold uppercase tracking-[0.24em] text-gold-light">{role === 'staff' ? 'Staff' : 'Admin'}</span>
    </Link>
  )
}

// Live counts beside nav items, so the sidebar doubles as a status overview.
function useSectionBadges() {
  const openOrders = useSelector(
    (state) => state.orders.all.items.filter((order) => order.status === 'pending' || order.status === 'processing').length,
  )
  const lowStock = useSelector((state) => state.products.items.filter((product) => product.stock <= LOW_STOCK_THRESHOLD).length)
  return { orders: openOrders, inventory: lowStock }
}

function Sidebar({ onNavigate }) {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const user = useSelector((state) => state.auth.user)
  const theme = useSelector((state) => state.ui.theme)
  const badges = useSectionBadges()
  const sections = ADMIN_SECTIONS.filter((section) => canAccess(section, user?.role))

  // Wait for the session to clear first, or the storefront would still see an admin and send them back here.
  const handleLogout = async () => {
    await dispatch(logout())
    navigate('/login')
  }

  return (
    <div className="flex h-full flex-col bg-night px-5 py-7 text-cream">
      <div className="px-3">
        <AdminLogo />
      </div>

      <nav className="mt-12 flex flex-col gap-1" aria-label="Admin sections">
        <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.24em] text-cream/40">Manage</p>
        {sections.map(({ path, label, icon: Icon }) => (
          <NavLink
            key={path || 'index'}
            to={adminPath(path)}
            end={!path}
            onClick={onNavigate}
            className={({ isActive }) =>
              `group relative flex items-center gap-3 px-3 py-2.5 text-sm transition-colors ${
                isActive ? 'bg-white/[0.08] text-cream' : 'text-cream/60 hover:bg-white/[0.04] hover:text-cream'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && <span className="absolute inset-y-1.5 left-0 w-px bg-gold-light" aria-hidden="true" />}
                <Icon sx={{ fontSize: 19 }} className={isActive ? 'text-gold-light' : ''} />
                <span className="flex-1 font-medium">{label}</span>
                {badges[path] > 0 && (
                  <span className="min-w-[22px] rounded-full bg-gold-light/15 px-1.5 py-0.5 text-center text-[10px] font-semibold text-gold-light">
                    {badges[path]}
                  </span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto space-y-1 border-t border-white/10 pt-5">
        <div className="flex items-center gap-3 px-3 pb-4">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gold-light/20 text-[11px] font-semibold text-gold-light">
            {`${user?.firstName?.[0] ?? ''}${user?.lastName?.[0] ?? ''}`.toUpperCase() || 'A'}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{user?.firstName} {user?.lastName}</p>
            <p className="truncate text-xs text-cream/50">{user?.email}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => dispatch(toggleTheme())}
          className="flex w-full items-center gap-3 px-3 py-2 text-sm text-cream/60 transition-colors hover:text-cream"
        >
          {theme === 'dark' ? <LightModeOutlinedIcon sx={{ fontSize: 18 }} /> : <DarkModeOutlinedIcon sx={{ fontSize: 18 }} />}
          {theme === 'dark' ? 'Light mode' : 'Dark mode'}
        </button>
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-3 px-3 py-2 text-sm text-cream/60 transition-colors hover:text-cream"
        >
          <LogoutRoundedIcon sx={{ fontSize: 18 }} /> Sign out
        </button>
      </div>
    </div>
  )
}

function AdminLayout() {
  const dispatch = useDispatch()
  const { pathname } = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const refreshing = useSelector(
    (state) => state.orders.all.status === 'loading' || state.customers.status === 'loading' || state.products.status === 'loading',
  )

  const current = [...ADMIN_SECTIONS].reverse().find((section) => pathname.startsWith(adminPath(section.path)))

  // Admin data is loaded once for the whole area; every screen reads it from the store.
  useEffect(() => {
    dispatch(fetchAllOrders())
    dispatch(fetchCustomers())
  }, [dispatch])

  const refreshAll = () => {
    dispatch(fetchAllOrders())
    dispatch(fetchCustomers())
    dispatch(fetchproduct({ force: true }))
  }

  return (
    <div className="min-h-screen bg-ivory lg:grid lg:grid-cols-[264px_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-screen lg:block">
        <Sidebar />
      </aside>

      <Drawer
        anchor="left"
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        slotProps={{ paper: { sx: { width: 'min(85vw, 300px)', bgcolor: '#171412', backgroundImage: 'none' } } }}
      >
        <div className="absolute right-3 top-5 z-10">
          <IconButton onClick={() => setMenuOpen(false)} aria-label="Close menu" sx={{ color: '#faf7f2' }}>
            <CloseRoundedIcon />
          </IconButton>
        </div>
        <Sidebar onNavigate={() => setMenuOpen(false)} />
      </Drawer>

      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-line bg-ivory/90 px-5 backdrop-blur-md sm:px-8 lg:px-10">
          <IconButton className="lg:!hidden" edge="start" onClick={() => setMenuOpen(true)} aria-label="Open admin menu">
            <MenuRoundedIcon />
          </IconButton>
          <nav aria-label="Breadcrumb" className="flex min-w-0 flex-1 items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-stone">
            <Link to="/admin" className="hover:text-ink">Admin</Link>
            {current?.path && (
              <>
                <span aria-hidden="true">/</span>
                <span className="truncate text-ink" aria-current="page">{current.label}</span>
              </>
            )}
          </nav>
          <Tooltip title="Refresh data">
            <span>
              <IconButton onClick={refreshAll} disabled={refreshing} aria-label="Refresh admin data">
                {refreshing ? <CircularProgress size={18} color="inherit" /> : <RefreshRoundedIcon />}
              </IconButton>
            </span>
          </Tooltip>
        </header>

        <main className="mx-auto w-full max-w-[1400px] flex-1 px-5 pb-20 pt-8 sm:px-8 lg:px-10 lg:pt-10">
          <Suspense fallback={<PageLoader />}>
            <div key={current?.path ?? 'other'} className="animate-fade-in">
              <Outlet />
            </div>
          </Suspense>
        </main>
      </div>
    </div>
  )
}

export default AdminLayout
