import { IconButton } from '@mui/material'
import CloseRoundedIcon from '@mui/icons-material/CloseRounded'
import ShoppingBagOutlinedIcon from '@mui/icons-material/ShoppingBagOutlined'
import { useDispatch, useSelector } from 'react-redux'
import { Link } from 'react-router-dom'
import { changeQuantity, clearItem, removeItem } from '../toolkit/slice'
import { cartTotals, formatCategory, money } from '../utils/format'
import QuantityControl from './QuantityControl'
import FreeShippingMeter from './FreeShippingMeter'

function Addtocart({ onClose }) {
  const dispatch = useDispatch()
  const cartItems = useSelector((state) => state.cart.items)
  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated)
  const { count, subtotal } = cartTotals(cartItems)

  return (
    <div className="flex h-full flex-col bg-ivory">
      <div className="flex items-center justify-between border-b border-line px-6 py-5">
        <h2 className="font-display text-2xl">
          Your bag <span className="font-body text-sm text-stone">({count})</span>
        </h2>
        <IconButton onClick={onClose} aria-label="Close bag" edge="end">
          <CloseRoundedIcon />
        </IconButton>
      </div>

      {count === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
          <span className="grid h-20 w-20 place-items-center rounded-full bg-sand text-gold">
            <ShoppingBagOutlinedIcon sx={{ fontSize: 32 }} />
          </span>
          <p className="mt-6 font-display text-2xl">Your bag is empty</p>
          <p className="mt-2 text-sm text-stone">Pieces you add will appear here.</p>
          <button type="button" onClick={onClose} className="btn-primary mt-8">
            Continue shopping
          </button>
        </div>
      ) : (
        <>
          <div className="border-b border-line px-6 py-4">
            <FreeShippingMeter subtotal={subtotal} />
          </div>

          <ul className="flex-1 divide-y divide-line overflow-y-auto px-6">
            {cartItems.map((item) => {
              const quantity = item.quantity ?? 1
              return (
                <li key={item.id} className="flex gap-4 py-5">
                  <Link to={`/productitem/${item.id}`} onClick={onClose} className="h-24 w-20 shrink-0 bg-sand p-2">
                    <img src={item.thumbnail} alt={item.title} className="h-full w-full object-contain" />
                  </Link>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="flex justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[10px] uppercase tracking-[0.18em] text-stone">
                          {item.brand || formatCategory(item.category)}
                        </p>
                        <Link to={`/productitem/${item.id}`} onClick={onClose} className="mt-1 line-clamp-2 font-display text-base leading-snug hover:text-gold">
                          {item.title}
                        </Link>
                      </div>
                      <p className="shrink-0 text-sm font-semibold">{money(item.price * quantity)}</p>
                    </div>
                    <div className="mt-auto flex items-center justify-between pt-3">
                      <QuantityControl
                        size="sm"
                        value={quantity}
                        label={item.title}
                        onDecrease={() => dispatch(changeQuantity({ id: item.id, change: -1 }))}
                        onIncrease={() => dispatch(changeQuantity({ id: item.id, change: 1 }))}
                        canIncrease={item.stock == null || quantity < item.stock}
                      />
                      <button
                        type="button"
                        onClick={() => dispatch(removeItem(item))}
                        className="text-[11px] uppercase tracking-[0.16em] text-stone underline-offset-4 hover:text-ink hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>

          <div className="border-t border-line bg-surface px-6 py-6">
            <div className="flex items-baseline justify-between">
              <span className="text-sm uppercase tracking-[0.16em] text-stone">Subtotal</span>
              <span className="font-display text-2xl">{money(subtotal)}</span>
            </div>
            <p className="mt-1 text-xs text-stone">Shipping and taxes calculated at checkout.</p>
            <Link
              to={isAuthenticated ? '/checkout' : '/login'}
              state={isAuthenticated ? undefined : { from: '/checkout' }}
              onClick={onClose}
              className="btn-primary mt-5 w-full"
            >
              Checkout
            </Link>
            <Link to="/cart" onClick={onClose} className="btn-outline mt-3 w-full">
              View bag
            </Link>
            <button
              type="button"
              onClick={() => dispatch(clearItem())}
              className="mx-auto mt-4 block text-[11px] uppercase tracking-[0.16em] text-stone underline-offset-4 hover:text-ink hover:underline"
            >
              Clear bag
            </button>
          </div>
        </>
      )}
    </div>
  )
}

export default Addtocart
