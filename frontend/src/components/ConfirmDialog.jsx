import { CircularProgress, Dialog } from '@mui/material'

const paperSx = { borderRadius: 0, bgcolor: 'rgb(var(--ivory))', backgroundImage: 'none', width: 'calc(100% - 32px)', minWidth: 0, maxWidth: 440, m: 2 }

function ConfirmDialog({ open, title, description, confirmLabel = 'Confirm', busy = false, onConfirm, onClose }) {
  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} slotProps={{ paper: { sx: paperSx } }} aria-labelledby="confirm-title">
      <div className="p-7 sm:p-8">
        <h2 id="confirm-title" className="font-display text-2xl leading-tight">{title}</h2>
        {description && <p className="mt-3 text-sm leading-relaxed text-stone">{description}</p>}
        <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} disabled={busy} className="btn-outline">
            Keep it
          </button>
          <button type="button" onClick={onConfirm} disabled={busy} className="btn-primary min-w-[140px]">
            {busy ? <CircularProgress size={16} color="inherit" /> : confirmLabel}
          </button>
        </div>
      </div>
    </Dialog>
  )
}

export default ConfirmDialog
