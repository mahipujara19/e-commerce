import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined'
import { FREE_SHIPPING_MINIMUM, money } from '../utils/format'

function FreeShippingMeter({ subtotal }) {
  const remaining = Math.max(FREE_SHIPPING_MINIMUM - subtotal, 0)
  const progress = Math.min((subtotal / FREE_SHIPPING_MINIMUM) * 100, 100)

  return (
    <div>
      <p className="flex items-center gap-2 text-sm text-ink">
        <LocalShippingOutlinedIcon sx={{ fontSize: 18 }} className="text-gold" />
        {remaining > 0 ? (
          <span>
            You&apos;re <strong>{money(remaining)}</strong> away from complimentary shipping
          </span>
        ) : (
          <strong>You&apos;ve unlocked complimentary shipping</strong>
        )}
      </p>
      <div
        className="mt-3 h-1 w-full overflow-hidden bg-line"
        role="progressbar"
        aria-label="Progress toward free shipping"
        aria-valuenow={Math.round(progress)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className="h-full bg-gold transition-all duration-500" style={{ width: `${progress}%` }} />
      </div>
    </div>
  )
}

export default FreeShippingMeter
