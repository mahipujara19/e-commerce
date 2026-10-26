import {
  Button,
  Divider,
  IconButton,
  Typography,
} from '@mui/material'
import AddRoundedIcon from '@mui/icons-material/AddRounded'
import RemoveRoundedIcon from '@mui/icons-material/RemoveRounded'
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded'
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined'
import LockOutlinedIcon from '@mui/icons-material/LockOutlined'
import { useDispatch, useSelector } from 'react-redux'
import { clearItem } from '../toolkit/slice'



function Addtocart() {
    const valofcart = useSelector((state) => state.cart.items)
    
    const dispatch=useDispatch()
  return (
    <aside className="cart-panel" aria-labelledby="cart-title">
      <div className="cart-heading">
        <div>
          <span className="eyebrow">YOUR GOOD THINGS</span>
          <Typography component="h2" id="cart-title" className="cart-title">
            Your bag <span>({valofcart.length?valofcart.length:0})</span>
          </Typography>
        </div>
        <IconButton
          aria-label="Clear cart"
          className="cart-more-button"
          onClick={() => dispatch(clearItem())}
        >
          <DeleteOutlineRoundedIcon />
        </IconButton>
      </div>

      <div className="shipping-progress">
        <div className="shipping-message">
          <LocalShippingOutlinedIcon />
          
        </div>
        <div className="shipping-track"><span /></div>
      </div>

      

      
    </aside>
  )
}

export default Addtocart
