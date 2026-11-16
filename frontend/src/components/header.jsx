import { useEffect, useState } from 'react'
import { Badge, Divider, Drawer, IconButton, Menu, MenuItem } from '@mui/material'
import PersonOutlineRoundedIcon from '@mui/icons-material/PersonOutlineRounded'
import ShoppingBagOutlinedIcon from '@mui/icons-material/ShoppingBagOutlined'
import MenuRoundedIcon from '@mui/icons-material/MenuRounded'
import CloseRoundedIcon from '@mui/icons-material/CloseRounded'
import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined'
import LightModeOutlinedIcon from '@mui/icons-material/LightModeOutlined'
import FavoriteBorderRoundedIcon from '@mui/icons-material/FavoriteBorderRounded'
import { useDispatch, useSelector } from 'react-redux'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import HeaderSearch from './HeaderSearch'
import { logout } from '../toolkit/authSlice'
import { openCart, toggleTheme } from '../toolkit/uiSlice'
import useMoney from '../hooks/useMoney'
import { FREE_SHIPPING_MINIMUM } from '../utils/format'
import CurrencySwitcher from './CurrencySwitcher'

const navLinkClass = (isActive) =>
  `relative py-2 text-[12px] font-semibold uppercase tracking-[0.18em] transition-colors hover:text-gold after:absolute after:inset-x-0 after:bottom-0 after:h-px after:origin-left after:bg-current after:transition-transform after:duration-300 ${
    isActive ? 'after:scale-x-100' : 'after:scale-x-0 hover:after:scale-x-100'
  }`

function Logo({ className = '' }) {
  return (
    <Link to="/" className={`whitespace-nowrap font-display text-[23px] font-semibold tracking-tight sm:text-[26px] md:text-[30px] ${className}`}>
      good<span className="font-normal italic">things</span>
      <span className="text-gold">.</span>
    </Link>
  )
}

function Header() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const itemCount = useSelector((state) =>
    state.cart.items.reduce((total, item) => total + (item.quantity ?? 1), 0),
  )
  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated)
  const user = useSelector((state) => state.auth.user)
  const theme = useSelector((state) => state.ui.theme)
  const wishlistCount = useSelector((state) => state.wishlist.ids.length)
  // The free-shipping threshold in the shopper's selected currency.
  const { formatWhole } = useMoney()

  const [menuOpen, setMenuOpen] = useState(false)
  // The bag icon bounces whenever its count changes after the page loads.
  const [initialCount] = useState(itemCount)
  // A soft shadow under the header once the page is scrolled.
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  const [accountAnchor, setAccountAnchor] = useState(null)

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
        Complimentary shipping over {formatWhole(FREE_SHIPPING_MINIMUM)}
        <span className="hidden sm:inline">
          <span className="mx-2 text-gold-light">✦</span> 30-day returns
        </span>
      </div>

      <header
        className={`sticky top-0 z-40 border-b backdrop-blur-md transition-all duration-500 ${
          scrolled ? 'border-line/60 bg-ivory/80 shadow-[0_12px_40px_-24px_rgba(0,0,0,0.35)]' : 'border-line bg-ivory/90'
        }`}
      >
        {/* Row 1: logo, the search bar (desktop), and the shopper's controls. */}
        <div className="container-x flex h-16 items-center gap-3 md:h-[72px] lg:gap-8">
          <div className="flex shrink-0 items-center gap-1">
            <IconButton className="lg:hidden" edge="start" onClick={() => setMenuOpen(true)} aria-label="Open menu">
              <MenuRoundedIcon />
            </IconButton>
            <Logo />
          </div>

          <HeaderSearch className="hidden lg:flex" />

          <div className="ml-auto flex shrink-0 items-center justify-end gap-0 sm:gap-1">
            <CurrencySwitcher compact />
            <IconButton
              className="hidden sm:inline-flex"
              onClick={() => dispatch(toggleTheme())}
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
            >
              {theme === 'dark' ? <LightModeOutlinedIcon /> : <DarkModeOutlinedIcon />}
            </IconButton>

            {isAuthenticated ? (
              <>
                <button
                  type="button"
                  onClick={(event) => setAccountAnchor(event.currentTarget)}
                  aria-haspopup="menu"
                  aria-label="Account menu"
                  className="hidden items-center gap-2 rounded-full py-1 pl-1 pr-1 transition hover:bg-sand sm:flex sm:pr-3"
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
                  <MenuItem onClick={() => handleAccountNavigate('/account')}>Your account</MenuItem>
                  <MenuItem onClick={() => handleAccountNavigate('/account?tab=orders')}>Orders</MenuItem>
                  <MenuItem onClick={() => handleAccountNavigate('/wishlist')}>Wishlist</MenuItem>
                  <MenuItem onClick={() => handleAccountNavigate('/cart')}>Your bag</MenuItem>
                  <MenuItem onClick={() => handleAccountNavigate('/checkout')}>Checkout</MenuItem>
                  <Divider />
                  <MenuItem onClick={handleLogout}>Sign out</MenuItem>
                </Menu>
              </>
            ) : (
              <IconButton component={Link} to="/login" aria-label="Sign in" className="hidden sm:inline-flex">
                <PersonOutlineRoundedIcon />
              </IconButton>
            )}

            {isAuthenticated && (
              <IconButton component={Link} to="/wishlist" aria-label={`Wishlist, ${wishlistCount} saved`} className="hidden sm:inline-flex">
                <Badge badgeContent={wishlistCount} color="primary" max={99}>
                  <FavoriteBorderRoundedIcon />
                </Badge>
              </IconButton>
            )}

            <IconButton onClick={() => dispatch(openCart())} aria-label={`Open bag, ${itemCount} items`}>
              <Badge badgeContent={itemCount} color="primary" max={99}>
                <span key={itemCount} className={`inline-flex ${itemCount !== initialCount ? 'animate-bump' : ''}`}>
                  <ShoppingBagOutlinedIcon />
                </span>
              </Badge>
            </IconButton>
          </div>
        </div>

        {/* Phones and tablets: the search bar gets its own full-width row. */}
        <div className="container-x pb-3 lg:hidden">
          <HeaderSearch />
        </div>

        {/* Desktop row 2: the main links, like a department bar under the search. */}
        <nav className="hidden border-t border-line/70 lg:block" aria-label="Main navigation">
          <div className="container-x flex h-11 items-center justify-center gap-10">
            <NavLink to="/" end className={({ isActive }) => navLinkClass(isActive)}>
              Home
            </NavLink>
            <NavLink to="/shop" className={({ isActive }) => navLinkClass(isActive)}>
              Shop
            </NavLink>
            <NavLink to="/about" className={({ isActive }) => navLinkClass(isActive)}>
              About
            </NavLink>
            {!isAuthenticated && (
              <NavLink to="/signup" className={({ isActive }) => navLinkClass(isActive)}>
                Sign up
              </NavLink>
            )}
          </div>
        </nav>
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
              { to: '/shop', label: 'Shop all' },
              { to: '/about', label: 'Our story' },
              { to: '/cart', label: 'Your bag' },
              ...(isAuthenticated
                ? [
                    { to: '/wishlist', label: 'Wishlist' },
                    { to: '/account', label: 'Your account' },
                  ]
                : []),
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
          </nav>

          <div className="mt-auto space-y-3 pt-10">
            <button
              type="button"
              onClick={() => dispatch(toggleTheme())}
              className="flex w-full items-center justify-between border-y border-line py-4 text-sm font-medium"
            >
              <span>{theme === 'dark' ? 'Dark mode' : 'Light mode'}</span>
              <span className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-stone">
                {theme === 'dark' ? <LightModeOutlinedIcon sx={{ fontSize: 18 }} /> : <DarkModeOutlinedIcon sx={{ fontSize: 18 }} />}
                Switch
              </span>
            </button>
            {isAuthenticated ? (
              <>
                <p className="pt-2 text-sm text-stone">
                  Signed in as <span className="font-medium text-ink">{user?.email}</span>
                </p>
                <Link to="/checkout" onClick={() => setMenuOpen(false)} className="btn-primary w-full">
                  Checkout
                </Link>
                <button type="button" onClick={handleLogout} className="btn-outline w-full">
                  Sign out
                </button>
              </>
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
