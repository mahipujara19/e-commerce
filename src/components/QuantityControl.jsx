import AddRoundedIcon from '@mui/icons-material/AddRounded'
import RemoveRoundedIcon from '@mui/icons-material/RemoveRounded'

function QuantityControl({ value, label, onDecrease, onIncrease, canDecrease = true, canIncrease = true, size = 'md' }) {
  const height = size === 'sm' ? 'h-9' : 'h-12'
  const buttonWidth = size === 'sm' ? 'w-8' : 'w-11'
  const buttonClass = `grid h-full ${buttonWidth} place-items-center text-ink transition hover:bg-sand disabled:cursor-not-allowed disabled:opacity-30`

  return (
    <div className={`inline-flex ${height} items-center border border-line bg-surface`} role="group" aria-label={`Quantity for ${label}`}>
      <button type="button" className={buttonClass} onClick={onDecrease} disabled={!canDecrease} aria-label={`Decrease quantity of ${label}`}>
        <RemoveRoundedIcon sx={{ fontSize: 16 }} />
      </button>
      <span className="min-w-[2rem] text-center text-sm font-medium tabular-nums" aria-live="polite">
        {value}
      </span>
      <button type="button" className={buttonClass} onClick={onIncrease} disabled={!canIncrease} aria-label={`Increase quantity of ${label}`}>
        <AddRoundedIcon sx={{ fontSize: 16 }} />
      </button>
    </div>
  )
}

export default QuantityControl
