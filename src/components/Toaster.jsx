import { useEffect } from 'react'
import CheckCircleOutlineRoundedIcon from '@mui/icons-material/CheckCircleOutlineRounded'
import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import CloseRoundedIcon from '@mui/icons-material/CloseRounded'
import { useDispatch, useSelector } from 'react-redux'
import { dismissToast } from '../toolkit/toastSlice'

const DURATION_MS = 4500

const ICONS = {
  success: CheckCircleOutlineRoundedIcon,
  error: ErrorOutlineRoundedIcon,
  info: InfoOutlinedIcon,
}

function Toast({ toast }) {
  const dispatch = useDispatch()
  const Icon = ICONS[toast.severity] ?? InfoOutlinedIcon
  const isError = toast.severity === 'error'

  useEffect(() => {
    const timer = setTimeout(() => dispatch(dismissToast(toast.id)), isError ? DURATION_MS * 1.5 : DURATION_MS)
    return () => clearTimeout(timer)
  }, [dispatch, toast.id, isError])

  return (
    <li
      role={isError ? 'alert' : 'status'}
      className="pointer-events-auto flex w-full animate-fade-up items-start gap-3 bg-night py-4 pl-5 pr-3 text-cream shadow-2xl ring-1 ring-white/10 sm:w-[380px]"
    >
      <Icon sx={{ fontSize: 20 }} className={`mt-0.5 shrink-0 ${isError ? 'text-red-400' : 'text-gold-light'}`} />
      <p className="flex-1 text-sm leading-relaxed">{toast.message}</p>
      <button
        type="button"
        onClick={() => dispatch(dismissToast(toast.id))}
        aria-label="Dismiss notification"
        className="grid h-7 w-7 shrink-0 place-items-center text-cream/50 transition hover:text-cream"
      >
        <CloseRoundedIcon sx={{ fontSize: 16 }} />
      </button>
    </li>
  )
}

function Toaster() {
  const toasts = useSelector((state) => state.toast.items)

  return (
    <ol
      aria-live="polite"
      className="pointer-events-none fixed inset-x-4 bottom-4 z-[1500] flex flex-col items-end gap-3 sm:inset-x-auto sm:bottom-6 sm:right-6"
    >
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} />
      ))}
    </ol>
  )
}

export default Toaster
