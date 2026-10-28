import { useState } from 'react'
import { Badge, Divider, Drawer, IconButton, Menu, MenuItem } from '@mui/material'
import SearchRoundedIcon from '@mui/icons-material/SearchRounded'
import PersonOutlineRoundedIcon from '@mui/icons-material/PersonOutlineRounded'
import ShoppingBagOutlinedIcon from '@mui/icons-material/ShoppingBagOutlined'
import MenuRoundedIcon from '@mui/icons-material/MenuRounded'
import CloseRoundedIcon from '@mui/icons-material/CloseRounded'
import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined'
import LightModeOutlinedIcon from '@mui/icons-material/LightModeOutlined'
import { useDispatch, useSelector } from 'react-redux'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { setSearchQuery } from '../toolkit/searchSlice'
import { logout } from '../toolkit/authSlice'
import { openCart, toggleTheme } from '../toolkit/uiSlice'
import { goToShop } from '../utils/format'

const navLinkClass = (isActive) =>
  `relative py-2 text-[12px] font-semibold uppercase tracking-[0.18em] transition-colors hover:text-gold after:absolute after:inset-x-0 after:bottom-0 after:h-px after:origin-left after:bg-current after:transition-transform after:duration-300 ${
    isActive ? 'after:scale-x-100' : 'after:scale-x-0 hover:after:scale-x-100'
  }`

function Logo({ className = '' }) {
  return (
    <Link to="/" className={`font-display text-[26px] font-semibold tracking-tight md:text-[30px] ${className}`}>
      good<span className="font-normal italic">things</span>
      <span className="text-gold">.</span>
    </Link>
  )
}

function Header() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const itemCount = useSelector((state) =>
    state.cart.items.reduce((total, item) => total + (item.quantity ?? 1), 0),
  )
  const searchQuery = useSelector((state) => state.search.query)
  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated)
  const user = useSelector((state) => state.auth.user)
  const theme = useSelector((state) => state.ui.theme)

  const [menuOpen, setMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [accountAnchor, setAccountAnchor] = useState(null)

  const handleShop = () => {
    setMenuOpen(false)
    goToShop(navigate, pathname)
  }

  const handleSearchSubmit = (event) => {
    event.preventDefault()
    setSearchOpen(false)
    goToShop(navigate, pathname)
  }

  const handleAccountNavigate = (to) => {
    setAccountAnchor(null)
    navigate(to)
  }

  const handleLogout = () => {
    setAccountAnchor(null)
    setMenuOpen(false)
    dispatch(logout())
    navigate('/')
  }

  const initials = `${user?.firstName?.[0] ?? ''}${user?.lastName?.[0] ?? ''}`.toUpperCase()

  return (
    <>
      <div className="bg-night px-4 py-2.5 text-center text-[10px] font-medium uppercase tracking-[0.22em] text-cream/90 sm:text-[11px]">
        Complimentary shipping over $75 <span className="mx-2 text-gold-light">✦</span> 30-day returns
      </div>

      <header className="sticky top-0 z-40 border-b border-line bg-ivory/90 backdrop-blur-md">
        <div className="container-x grid h-[72px] grid-cols-[1fr_auto_1fr] items-center md:h-20">
          <div className="flex items-center gap-9">
            <IconButton className="lg:hidden" edge="start" onClick={() => setMenuOpen(true)} aria-label="Open menu">
              <MenuRoundedIcon />
            </IconButton>
            <nav className="hidden items-center gap-9 lg:flex" aria-label="Main navigation">
              <NavLink to="/" end className={({ isActive }) => navLinkClass(isActive)}>
                Home
              </NavLink>
              <button type="button" onClick={handleShop} className={navLinkClass(false)}>
                Shop
              </button>
              <NavLink to="/about" className={({ isActive }) => navLinkClass(isActive)}>
                About
              </NavLink>
              {!isAuthenticated && (
                <NavLink to="/signup" className={({ isActive }) => navLinkClass(isActive)}>
                  Sign up
                </NavLink>
              )}
            </nav>
          </div>

          <Logo />

          <div className="flex items-center justify-end gap-1 sm:gap-2">
            <IconButton
              onClick={() => dispatch(toggleTheme())}
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
            >
              {theme === 'dark' ? <LightModeOutlinedIcon /> : <DarkModeOutlinedIcon />}
            </IconButton>
            <IconButton onClick={() => setSearchOpen((value) => !value)} aria-label="Search products" aria-expanded={searchOpen}>
              {searchOpen ? <CloseRoundedIcon /> : <SearchRoundedIcon />}
            </IconButton>

            {isAuthenticated ? (
              <>
                <button
                  type="button"
                  onClick={(event) => setAccountAnchor(event.currentTarget)}
                  aria-haspopup="menu"
                  aria-label="Account menu"
                  className="flex items-center gap-2 rounded-full py-1 pl-1 pr-1 transition hover:bg-sand sm:pr-3"
                >
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-ink text-[11px] font-semibold text-ivory">
                    {initials || 'GT'}
                  </span>
                  <span className="hidden text-sm font-medium sm:inline">Hi, {user?.firstName}</span>
                </button>
                <Menu
                  anchorEl={accountAnchor}
                  open={Boolean(accountAnchor)}
                  onClose={() => setAccountAnchor(null)}
                  anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                  transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                  slotProps={{ paper: { sx: { mt: 1, minWidth: 220, borderRadius: 0, border: '1px solid rgb(var(--line))' } } }}
                >
                  <div className="px-4 pb-3 pt-2">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-stone">Signed in as</p>
                    <p className="mt-1 truncate text-sm font-medium">{user?.email}</p>
                  </div>
                  <Divider />
                  <MenuItem onClick={() => handleAccountNavigate('/cart')}>Your bag</MenuItem>
                  <MenuItem onClick={() => handleAccountNavigate('/checkout')}>Checkout</MenuItem>
                  <Divider />
                  <MenuItem onClick={handleLogout}>Sign out</MenuItem>
                </Menu>
              </>
            ) : (
              <IconButton component={Link} to="/login" aria-label="Sign in">
                <PersonOutlineRoundedIcon />
              </IconButton>
            )}

            <IconButton onClick={() => dispatch(openCart())} aria-label={`Open bag, ${itemCount} items`}>
              <Badge badgeContent={itemCount} color="primary" max={99}>
                <ShoppingBagOutlinedIcon />
              </Badge>
            </IconButton>
          </div>
        </div>

        {searchOpen && (
          <div className="animate-fade-in border-t border-line bg-ivory">
            <form onSubmit={handleSearchSubmit} className="container-x flex items-center gap-4 py-5" role="search">
              <SearchRoundedIcon className="text-stone" />
              <input
                autoFocus
                value={searchQuery}
                onChange={(event) => dispatch(setSearchQuery(event.target.value))}
                placeholder="Search watches, fragrances, jewellery…"
                aria-label="Search products"
                className="h-12 min-w-0 flex-1 bg-transparent font-display text-xl outline-none placeholder:text-stone/60 md:text-2xl"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => dispatch(setSearchQuery(''))}
                  className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone hover:text-ink"
                >
                  Clear
                </button>
              )}
              <button type="submit" className="btn-primary hidden sm:inline-flex">
                Search
              </button>
            </form>
          </div>
        )}
      </header>

      <Drawer
        anchor="left"
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        slotProps={{ paper: { sx: { width: 'min(88vw, 360px)', bgcolor: 'rgb(var(--ivory))', backgroundImage: 'none' } } }}
      >
        <div className="flex h-full flex-col px-7 py-6">
          <div className="flex items-center justify-between">
            <Logo className="!text-2xl" />
            <IconButton onClick={() => setMenuOpen(false)} aria-label="Close menu" edge="end">
              <CloseRoundedIcon />
            </IconButton>
          </div>

          <nav className="mt-12 flex flex-col gap-1" aria-label="Mobile navigation">
            {[
              { to: '/', label: 'Home' },
              { to: '/about', label: 'Our story' },
              { to: '/cart', label: 'Your bag' },
            ].map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) =>
                  `border-b border-line py-4 font-display text-3xl transition-colors hover:text-gold ${isActive ? 'text-gold' : ''}`
                }
              >
                {link.label}
              </NavLink>
            ))}
            <button type="button" onClick={handleShop} className="border-b border-line py-4 text-left font-display text-3xl transition-colors hover:text-gold">
              Shop all
            </button>
          </nav>

          <div className="mt-auto space-y-3 pt-10">
            {isAuthenticated ? (
              <button type="button" onClick={handleLogout} className="btn-outline w-full">
                Sign out
              </button>
            ) : (
              <>
                <Link to="/login" onClick={() => setMenuOpen(false)} className="btn-primary w-full">
                  Sign in
                </Link>
                <Link to="/signup" onClick={() => setMenuOpen(false)} className="btn-outline w-full">
                  Create account
                </Link>
              </>
            )}
          </div>
        </div>
      </Drawer>
    </>
  )
}

export default Header
