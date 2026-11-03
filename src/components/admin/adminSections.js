import { lazy } from 'react'
import SpaceDashboardOutlinedIcon from '@mui/icons-material/SpaceDashboardOutlined'
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined'
import SellOutlinedIcon from '@mui/icons-material/SellOutlined'
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined'
import PeopleAltOutlinedIcon from '@mui/icons-material/PeopleAltOutlined'
import { orderNumber } from '../../utils/format'

/**
 * Single source of truth for the admin area: App.jsx builds the routes from this list
 * and the sidebar builds its navigation from it. To add a screen, add one entry here.
 * `path: ''` is the index route (/admin).
 */
export const ADMIN_SECTIONS = [
  {
    path: '',
    label: 'Dashboard',
    icon: SpaceDashboardOutlinedIcon,
    component: lazy(() => import('./AdminDashboard.jsx')),
  },
  {
    path: 'orders',
    label: 'Orders',
    icon: ReceiptLongOutlinedIcon,
    component: lazy(() => import('./AdminOrders.jsx')),
  },
  {
    path: 'products',
    label: 'Products',
    icon: SellOutlinedIcon,
    component: lazy(() => import('./AdminProducts.jsx')),
  },
  {
    path: 'inventory',
    label: 'Inventory',
    icon: Inventory2OutlinedIcon,
    component: lazy(() => import('./AdminInventory.jsx')),
  },
  {
    path: 'customers',
    label: 'Customers',
    icon: PeopleAltOutlinedIcon,
    component: lazy(() => import('./AdminCustomers.jsx')),
  },
]

export const adminPath = (path) => (path ? `/admin/${path}` : '/admin')

// Opens the orders screen filtered to one order with its details expanded.
export const orderLink = (order) => `/admin/orders?q=${orderNumber(order.id)}&order=${order.id}`
