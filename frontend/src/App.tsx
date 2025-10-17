import { useEffect, type ReactNode } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { Phone } from 'lucide-react'
import { useAuth } from './hooks/useAuth'

const navigation = [
  { name: 'Home', href: '/' },
  { name: 'Providers', href: '/#providers' },
  { name: 'How it works', href: '/#process' },
  { name: 'FAQs', href: '/#faq' },
]

function App() {
  const location = useLocation()
  useEffect(() => {
    if (location.hash) {
      const target = document.querySelector(location.hash)
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [location.pathname, location.hash])

  const isSignupRoute = location.pathname.startsWith('/signup')

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      {!isSignupRoute && <CallToActionFooter />}
      <Footer />
    </div>
  )
}

function Header() {
  const { token, logout } = useAuth()
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link to="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand text-white">
            <span className="text-lg font-semibold">PB</span>
          </div>
          <div>
            <p className="text-lg font-semibold text-slate-900">Pay Bills With Us</p>
            <p className="text-xs text-slate-500">Nationwide 25% bill savings</p>
          </div>
        </Link>
        <nav className="hidden items-center gap-6 text-sm font-medium text-slate-600 md:flex">
          {navigation.map((item) => (
            <HeaderLink key={item.name} href={item.href}>
              {item.name}
            </HeaderLink>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <a
            href="tel:+18001231234"
            className="hidden items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:border-brand hover:text-brand md:inline-flex"
          >
            <Phone size={16} aria-hidden />
            1-800-123-1234
          </a>
          {token ? (
            <>
              <Link
                to="/dashboard"
                className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:border-brand hover:text-brand"
              >
                Dashboard
              </Link>
              <button
                type="button"
                onClick={logout}
                className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white shadow-sm transition-transform hover:-translate-y-0.5 hover:bg-brand-dark"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="hidden rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:border-brand hover:text-brand md:inline-flex"
              >
                Sign in
              </Link>
              <Link
                to="/signup"
                className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white shadow-sm transition-transform hover:-translate-y-0.5 hover:bg-brand-dark"
              >
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  )
}

function CallToActionFooter() {
  const { token } = useAuth()
  return (
    <section className="border-y border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-6 py-10 text-center md:flex-row md:text-left">
        <div className="flex-1">
          <p className="text-sm font-semibold uppercase tracking-wide text-brand">Get started today</p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-900">
            Let our team manage your bills and keep 25% more in your pocket each month.
          </h2>
          <p className="mt-3 text-slate-600">
            Create your secure account to share the essentials. An agent will confirm details and finish setup by
            phone within one business day.
          </p>
        </div>
        <div className="flex flex-col items-center gap-3 md:items-end">
          {token ? (
            <Link
              to="/dashboard"
              className="inline-flex items-center justify-center rounded-full bg-brand px-6 py-3 text-sm font-semibold text-white shadow-sm transition-transform hover:-translate-y-0.5 hover:bg-brand-dark"
            >
              Go to your dashboard
            </Link>
          ) : (
            <Link
              to="/signup"
              className="inline-flex items-center justify-center rounded-full bg-brand px-6 py-3 text-sm font-semibold text-white shadow-sm transition-transform hover:-translate-y-0.5 hover:bg-brand-dark"
            >
              Complete secure sign up
            </Link>
          )}
          <a
            href="tel:+18001231234"
            className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 px-6 py-3 text-sm font-semibold text-slate-700 transition-colors hover:border-brand hover:text-brand"
          >
            <Phone size={18} aria-hidden /> Call now for your discount
          </a>
        </div>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-slate-100">
      <div className="mx-auto max-w-6xl px-6 py-8 text-sm text-slate-600">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <p>© {new Date().getFullYear()} Pay Bills With Us. All rights reserved.</p>
          <div className="flex flex-wrap gap-4">
            <Link to="/signup" className="transition-colors hover:text-brand">
              Create account
            </Link>
            <a href="tel:+18001231234" className="transition-colors hover:text-brand">
              Speak with an agent
            </a>
            <a href="mailto:hello@paybillswithus.com" className="transition-colors hover:text-brand">
              hello@paybillswithus.com
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}

type HeaderLinkProps = {
  href: string
  children: ReactNode
}

function HeaderLink({ href, children }: HeaderLinkProps) {
  const location = useLocation()
  const isActive = location.pathname === '/' && href === '/'

  return (
    <Link
      to={href}
      className={`transition-colors hover:text-brand ${isActive ? 'text-brand font-semibold' : ''}`}
    >
      {children}
    </Link>
  )
}

export default App
