import { Link } from 'react-router-dom'

function NotFound() {
  return (
    <section className="container-x grid min-h-[70vh] place-items-center py-24 text-center" aria-labelledby="not-found-title">
      <div className="max-w-lg animate-fade-up">
        <p aria-hidden="true" className="font-display text-[120px] leading-none text-ink/10 md:text-[180px]">
          404
        </p>
        <h1 id="not-found-title" className="-mt-4 font-display text-4xl md:text-5xl">
          This page has wandered off
        </h1>
        <p className="mt-5 leading-relaxed text-stone">
          The page you&apos;re looking for doesn&apos;t exist or may have moved. Let&apos;s get you back to something good.
        </p>
        <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
          <Link to="/" className="btn-primary">Back to home</Link>
          <Link to="/shop" className="btn-outline">Browse the collection</Link>
        </div>
      </div>
    </section>
  )
}

export default NotFound
