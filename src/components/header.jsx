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
import { useSelector } from 'react-redux'
import { Link } from 'react-router-dom'

function Header() {
  const cartItems = useSelector((state) => state.cart.items)
  const itemCount = cartItems.reduce((total, item) => total + (item.quantity ?? 1), 0)
  return (
    <>
      <div className="announcement-bar">
        A little treat from us — enjoy free shipping on orders over $75
      </div>
      <AppBar position="static" elevation={0} className="site-header">
        <Toolbar disableGutters className="header-toolbar">
          <Typography component="a" href="#" className="brand-mark">
            good<span>things</span>
            <span className="brand-period">.</span>
          </Typography>

          <Box component="nav" className="main-navigation" aria-label="Main navigation">
            <Button  component={Link} to="#collection" className="nav-link">Shop all</Button>
            <Button component={Link} to="/" className="nav-link">Home</Button>
            <Button component={Link} to="#collection" className="nav-link">Body &amp; bath</Button>
            <Button component={Link} to="#collection" className="nav-link">Our story</Button>
          </Box>

          <div className="header-actions">
            <div className="header-search">
              <SearchRoundedIcon aria-hidden="true" />
              <InputBase placeholder="Search" inputProps={{ 'aria-label': 'Search products' }} />
            </div>
            <IconButton aria-label="Account" className="header-icon">
              <PersonOutlineRoundedIcon />
            </IconButton>
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
