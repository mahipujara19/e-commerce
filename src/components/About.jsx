import { Button, Typography } from '@mui/material'
import { Link } from 'react-router-dom'
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined'
import VerifiedOutlinedIcon from '@mui/icons-material/VerifiedOutlined'
import FavoriteBorderRoundedIcon from '@mui/icons-material/FavoriteBorderRounded'
import RecyclingRoundedIcon from '@mui/icons-material/RecyclingRounded'

/**
 * ──────────────────────────────────────────────
 * About — Brand story and values page
 * ──────────────────────────────────────────────
 *
 * A static page that gives the store a complete feel.
 * Includes the brand story, core values (with icons),
 * and a CTA to browse the shop.
 */
function About() {
  return (
    <section className="about-page" aria-labelledby="about-title">
      {/* ── Hero section — brand story ── */}
      <div className="about-hero">
        <span className="eyebrow">OUR STORY</span>
        <Typography component="h1" id="about-title" className="about-hero-title">
          Made for the everyday.
        </Typography>
        <Typography className="about-hero-text">
          goodthings started with a simple idea — that the objects we use every day
          should be thoughtfully designed, responsibly made, and built to last.
          We believe small changes in the things you keep close can make a real
          difference in how your day feels.
        </Typography>
      </div>

      {/* ── Values grid — four pillars ── */}
      <div className="about-values">
        <div className="about-value-card">
          <div className="about-value-icon">
            <VerifiedOutlinedIcon />
          </div>
          <Typography component="h3" className="about-value-title">
            Quality first
          </Typography>
          <Typography className="about-value-text">
            Every product is tested, refined, and held to a standard
            that puts durability and craftsmanship above everything else.
          </Typography>
        </div>

        <div className="about-value-card">
          <div className="about-value-icon">
            <RecyclingRoundedIcon />
          </div>
          <Typography component="h3" className="about-value-title">
            Sustainably sourced
          </Typography>
          <Typography className="about-value-text">
            We work with suppliers who share our commitment to ethical
            production, fair wages, and minimal environmental impact.
          </Typography>
        </div>

        <div className="about-value-card">
          <div className="about-value-icon">
            <FavoriteBorderRoundedIcon />
          </div>
          <Typography component="h3" className="about-value-title">
            Designed with care
          </Typography>
          <Typography className="about-value-text">
            From the shape of a handle to the scent of a candle,
            every detail is intentional — designed to make your day a little better.
          </Typography>
        </div>

        <div className="about-value-card">
          <div className="about-value-icon">
            <LocalShippingOutlinedIcon />
          </div>
          <Typography component="h3" className="about-value-title">
            Free shipping over $75
          </Typography>
          <Typography className="about-value-text">
            We keep shipping simple. Orders over $75 ship free,
            and everything is packaged with recycled materials.
          </Typography>
        </div>
      </div>

      {/* ── Mission statement ── */}
      <div className="about-mission">
        <Typography className="about-mission-quote">
          &ldquo;We don&apos;t chase trends. We make things worth keeping.&rdquo;
        </Typography>
        <Typography className="about-mission-attribution">
          — The goodthings team
        </Typography>
      </div>

      {/* ── CTA — link back to the shop ── */}
      <div className="about-cta">
        <Typography className="about-cta-text">
          Ready to find your next everyday favourite?
        </Typography>
        <Button
          component={Link}
          to="/"
          variant="contained"
          className="about-cta-btn"
        >
          Browse the collection
        </Button>
      </div>
    </section>
  )
}

export default About
