import { lazy } from 'react'
import SpaceDashboardOutlinedIcon from '@mui/icons-material/SpaceDashboardOutlined'
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined'
import SellOutlinedIcon from '@mui/icons-material/SellOutlined'
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined'
import PeopleAltOutlinedIcon from '@mui/icons-material/PeopleAltOutlined'
import AdminPanelSettingsOutlinedIcon from '@mui/icons-material/AdminPanelSettingsOutlined'
import { orderNumber } from '../../utils/format'
import { STAFF_ROLES } from '../../utils/roles'

const ADMIN_ONLY = ['admin']

/**
 * Single source of truth for the admin area: App.jsx builds the routes from this list
 * and the sidebar builds its navigation from it. To add a screen, add one entry here.
 * `path: ''` is the index route (/admin). `roles` decides who sees the screen; the API enforces the same rules.
 */
export const ADMIN_SECTIONS = [
  {
    path: '',
    label: 'Dashboard',
    icon: SpaceDashboardOutlinedIcon,
    roles: STAFF_ROLES,
    component: lazy(() => import('./AdminDashboard.jsx')),
  },
  {
    path: 'orders',
    label: 'Orders',
    icon: ReceiptLongOutlinedIcon,
    roles: STAFF_ROLES,
    component: lazy(() => import('./AdminOrders.jsx')),
  },
  {
    path: 'products',
    label: 'Products',
    icon: SellOutlinedIcon,
    roles: ADMIN_ONLY,
    component: lazy(() => import('./AdminProducts.jsx')),
  },
  {
    path: 'inventory',
    label: 'Inventory',
    icon: Inventory2OutlinedIcon,
    roles: STAFF_ROLES,
    component: lazy(() => import('./AdminInventory.jsx')),
  },
  {
    path: 'customers',
    label: 'Customers',
    icon: PeopleAltOutlinedIcon,
    roles: STAFF_ROLES,
    component: lazy(() => import('./AdminCustomers.jsx')),
  },
  {
    path: 'team',
    label: 'Team',
    icon: AdminPanelSettingsOutlinedIcon,
    roles: ADMIN_ONLY,
    component: lazy(() => import('./AdminTeam.jsx')),
  },
]

export const canAccess = (section, role) => section.roles.includes(role)

export const adminPath = (path) => (path ? `/admin/${path}` : '/admin')

// Opens the orders screen filtered to one order with its details expanded.
export const orderLink = (order) => `/admin/orders?q=${orderNumber(order.id)}&order=${order.id}`
