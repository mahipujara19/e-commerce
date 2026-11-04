// Mirrors backend/config/roles.js. The server enforces these; the UI only uses them to decide what to show.
export const ROLES = ['admin', 'staff', 'customer']
export const STAFF_ROLES = ['admin', 'staff']

export const ROLE_LABELS = { admin: 'Administrator', staff: 'Staff', customer: 'Customer' }

export const isStaff = (user) => STAFF_ROLES.includes(user?.role)
