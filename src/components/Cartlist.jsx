import ShoppingBagOutlinedIcon from '@mui/icons-material/ShoppingBagOutlined'
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded'
import LockOutlinedIcon from '@mui/icons-material/LockOutlined'
import AutorenewRoundedIcon from '@mui/icons-material/AutorenewRounded'
import VerifiedOutlinedIcon from '@mui/icons-material/VerifiedOutlined'
import { useDispatch, useSelector } from 'react-redux'
import { Link } from 'react-router-dom'
import { changeQuantity, removeItem } from '../toolkit/slice'
import { cartTotals, formatCategory, money } from '../utils/format'
import FreeShippingMeter from './FreeShippingMeter'
import QuantityControl from './QuantityControl'

function Cartlist() {
  const dispatch = useDispatch()
  const cartItems = useSelector((state) => state.cart.items)
  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated)
  const { count, subtotal, shipping, tax, total } = cartTotals(cartItems)

  if (cartItems.length === 0) {
    return (
      <div className="container-x py-24 text-center md:py-32">
        <span className="mx-auto grid h-24 w-24 place-items-center rounded-full bg-sand text-gold">
          <ShoppingBagOutlinedIcon sx={{ fontSize: 36 }} />
        </span>
        <h1 className="mt-8 font-display text-4xl md:text-5xl">Your bag is empty</h1>
        <p className="mx-auto mt-4 max-w-sm text-stone">Discover pieces made to be kept — they&apos;ll wait for you here.</p>
        <Link to="/" className="btn-primary mt-10">Discover the collection</Link>
      </div>
    )
  }

  return (
    <div className="container-x pb-24 pt-10 md:pt-14">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-8">
        <div>
          <p className="eyebrow">Your selection</p>
          <h1 className="mt-3 font-display text-4xl md:text-5xl">Shopping bag</h1>
        </div>
        <p className="text-sm text-stone">{count} {count === 1 ? 'item' : 'items'}</p>
      </header>

      <div className="mt-10 grid gap-12 lg:grid-cols-[1fr_400px] lg:gap-16">
        <ul className="divide-y divide-line">
          {cartItems.map((item) => {
            const quantity = item.quantity ?? 1
            return (
              <li key={item.id} className="flex gap-5 py-8 first:pt-0 sm:gap-8">
                <Link to={`/productitem/${item.id}`} className="h-36 w-28 shrink-0 bg-sand p-3 sm:h-44 sm:w-36">
                  <img src={item.thumbnail} alt={item.title} className="h-full w-full object-contain" />
                </Link>
                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-stone">{item.brand || formatCategory(item.category)}</p>
                      <Link to={`/productitem/${item.id}`} className="mt-1.5 block font-display text-xl leading-snug hover:text-gold">
                        {item.title}
                      </Link>
                      <p className="mt-1 text-sm text-stone">{money(item.price)} each</p>
                    </div>
                    <p className="shrink-0 font-semibold">{money(item.price * quantity)}</p>
                  </div>
                  <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-6">
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
                      aria-label={`Remove ${item.title} from bag`}
                      className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.16em] text-stone underline-offset-4 hover:text-red-700 hover:underline"
                    >
                      <DeleteOutlineRoundedIcon sx={{ fontSize: 16 }} /> Remove
                    </button>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>

        <aside className="lg:sticky lg:top-28 lg:self-start" aria-labelledby="summary-title">
          <div className="bg-white p-7 ring-1 ring-line sm:p-8">
            <h2 id="summary-title" className="font-display text-2xl">Order summary</h2>
            <div className="mt-6">
              <FreeShippingMeter subtotal={subtotal} />
            </div>
            <dl className="mt-8 space-y-3 text-sm">
              <div className="flex justify-between"><dt className="text-stone">Subtotal</dt><dd>{money(subtotal)}</dd></div>
              <div className="flex justify-between"><dt className="text-stone">Shipping</dt><dd>{shipping === 0 ? 'Complimentary' : money(shipping)}</dd></div>
              <div className="flex justify-between"><dt className="text-stone">Estimated tax (8%)</dt><dd>{money(tax)}</dd></div>
              <div className="flex items-baseline justify-between border-t border-line pt-4">
                <dt className="font-semibold uppercase tracking-[0.14em]">Total</dt>
                <dd className="font-display text-3xl">{money(total)}</dd>
              </div>
            </dl>

            {!isAuthenticated && (
              <p className="mt-6 flex items-start gap-3 bg-sand p-4 text-sm text-stone">
                <LockOutlinedIcon sx={{ fontSize: 18 }} className="mt-0.5 text-ink" />
                Sign in or create an account to complete your purchase.
              </p>
            )}
            <Link
              to={isAuthenticated ? '/checkout' : '/login'}
              state={isAuthenticated ? undefined : { from: '/checkout' }}
              className="btn-primary mt-6 w-full"
            >
              {isAuthenticated ? 'Proceed to checkout' : 'Sign in to checkout'}
            </Link>
            <Link to="/" className="btn-outline mt-3 w-full">Continue shopping</Link>

            <ul className="mt-8 space-y-3 border-t border-line pt-6 text-xs text-stone">
              <li className="flex items-center gap-2"><LockOutlinedIcon sx={{ fontSize: 16 }} className="text-gold" /> Secure, encrypted checkout</li>
              <li className="flex items-center gap-2"><AutorenewRoundedIcon sx={{ fontSize: 16 }} className="text-gold" /> 30-day returns</li>
              <li className="flex items-center gap-2"><VerifiedOutlinedIcon sx={{ fontSize: 16 }} className="text-gold" /> Authenticity guaranteed</li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  )
}

export default Cartlist
