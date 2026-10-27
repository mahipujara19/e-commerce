import {
  AppBar,
  Badge,
  Box,
  Button,
  IconButton,
  InputBase,
  Toolbar,
  Typography,
} from '@mui/material'
import SearchRoundedIcon from '@mui/icons-material/SearchRounded'
import PersonOutlineRoundedIcon from '@mui/icons-material/PersonOutlineRounded'
import ShoppingBagOutlinedIcon from '@mui/icons-material/ShoppingBagOutlined'
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded'
import { useSelector, useDispatch } from 'react-redux'
import { Link, useNavigate } from 'react-router-dom'
import { setSearchQuery } from '../toolkit/searchSlice'
import { logout } from '../toolkit/authSlice'

/**
 * Header component — site-wide navigation bar.
 *
 * Adapts based on authentication state:
 * - Logged out: shows "Sign up" nav link + person icon → /signup
 * - Logged in: shows user's first name + logout button
 *
 * The search bar dispatches setSearchQuery on every keystroke.
 * Product.jsx filters the product list using that query in real time.
 */
function Header() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const cartItems = useSelector((state) => state.cart.items)
  const itemCount = cartItems.reduce((total, item) => total + (item.quantity ?? 1), 0)
  const searchQuery = useSelector((state) => state.search.query)

  // Auth state — determines what the header shows
  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated)
  const user = useSelector((state) => state.auth.user)

  // Handle logout — clears auth state and navigates home
  const handleLogout = () => {
    dispatch(logout())
    navigate('/')
  }

  return (
    <>
      {/* Top announcement bar */}
      <div className="announcement-bar">
        A little treat from us — enjoy free shipping on orders over $75
      </div>
      <AppBar position="static" elevation={0} className="site-header">
        <Toolbar disableGutters className="header-toolbar">
          {/* Brand logo — links back to home */}
          <Typography component={Link} to="/" className="brand-mark">
            good<span>things</span>
            <span className="brand-period">.</span>
          </Typography>

          {/* Main navigation links — adapts based on auth state */}
          <Box component="nav" className="main-navigation" aria-label="Main navigation">
            <Button component={Link} to="/" className="nav-link">Home</Button>
            <Button component={Link} to="/about" className="nav-link">About</Button>
            {!isAuthenticated && (
              <Button component={Link} to="/signup" className="nav-link nav-link-highlight">
                Sign up
              </Button>
            )}
          </Box>

          <div className="header-actions">
            {/* Search bar — dispatches setSearchQuery on every keystroke */}
            <div className="header-search">
              <SearchRoundedIcon aria-hidden="true" />
              <InputBase
                placeholder="Search"
                slotProps={{ htmlInput: { 'aria-label': 'Search products' } }}
                value={searchQuery}
                onChange={(e) => dispatch(setSearchQuery(e.target.value))}
              />
            </div>

            {/*
             * Auth section in header:
             * - Logged in → shows "Hi, Name" chip + logout icon
             * - Logged out → shows person icon linking to signup
             */}
            {isAuthenticated ? (
              <div className="header-user">
                <Button
                  component={Link}
                  to="/checkout"
                  className="header-user-name"
                  size="small"
                >
                  Hi, {user?.firstName}
                </Button>
                <IconButton
                  onClick={handleLogout}
                  aria-label="Sign out"
                  className="header-icon"
                  title="Sign out"
                >
                  <LogoutRoundedIcon />
                </IconButton>
              </div>
            ) : (
              <IconButton
                component={Link}
                to="/login"
                aria-label="Sign in"
                className="header-icon"
              >
                <PersonOutlineRoundedIcon />
              </IconButton>
            )}

            {/* Shopping bag icon — shows item count badge, links to cart */}
            <IconButton
              component={Link}
              to="/cart"
              aria-label={`Shopping bag with ${itemCount} items`}
              className="header-icon"
            >
              <Badge badgeContent={itemCount} color="primary" showZero>
                <ShoppingBagOutlinedIcon />
              </Badge>
            </IconButton>
          </div>
        </Toolbar>
      </AppBar>
    </>
  )
}

export default Header
