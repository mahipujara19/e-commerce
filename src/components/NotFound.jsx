import { Button, Typography } from '@mui/material'
import { Link } from 'react-router-dom'
import SearchOffRoundedIcon from '@mui/icons-material/SearchOffRounded'

/**
 * ──────────────────────────────────────────────
 * NotFound — Custom 404 page
 * ──────────────────────────────────────────────
 *
 * Shown when the user navigates to a URL that doesn't match any route.
 * Provides a friendly message and a clear path back to the shop.
 */
function NotFound() {
  return (
    <section className="not-found-page" aria-labelledby="not-found-title">
      <div className="not-found-card">
        {/* Decorative icon */}
        <div className="not-found-icon-wrap">
          <SearchOffRoundedIcon className="not-found-icon" />
        </div>

        {/* Large 404 number */}
        <Typography className="not-found-code" aria-hidden="true">
          404
        </Typography>

        {/* Friendly heading */}
        <Typography component="h1" id="not-found-title" className="not-found-title">
          Page not found
        </Typography>

        {/* Helpful description */}
        <Typography className="not-found-description">
          The page you&apos;re looking for doesn&apos;t exist or may have been moved.
          Let&apos;s get you back to something good.
        </Typography>

        {/* Action buttons */}
        <div className="not-found-actions">
          <Button
            component={Link}
            to="/"
            variant="contained"
            className="not-found-home-btn"
          >
            Back to shop
          </Button>
          <Button
            component={Link}
            to="/"
            variant="outlined"
            className="not-found-browse-btn"
          >
            Browse products
          </Button>
        </div>
      </div>
    </section>
  )
}

export default NotFound
