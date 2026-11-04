import SearchOffRoundedIcon from '@mui/icons-material/SearchOffRounded'
import { Link } from 'react-router-dom'
import { AdminEmpty } from './AdminUI'

function AdminNotFound() {
  return (
    <AdminEmpty
      icon={SearchOffRoundedIcon}
      title="This screen doesn't exist"
      description="It may have moved. Use the navigation to find what you need."
      action={<Link to="/admin" className="btn-primary">Back to dashboard</Link>}
    />
  )
}

export default AdminNotFound
