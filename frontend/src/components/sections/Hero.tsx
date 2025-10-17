import { Link } from 'react-router-dom'
import { ArrowRight, ShieldCheck, Sparkles } from 'lucide-react'

export default function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-slate-200 bg-gradient-to-b from-white via-white to-slate-100">
      <div className="absolute inset-0 bg-hero-pattern" aria-hidden />
      <div className="relative mx-auto grid max-w-6xl gap-12 px-6 py-20 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full bg-brand/10 px-4 py-1 text-sm font-semibold text-brand">
            <Sparkles size={16} aria-hidden /> Keep 25% of every bill
          </span>
          <h1 className="mt-6 text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
            Let our experts manage every household bill and guarantee monthly savings.
          </h1>
          <p className="mt-4 text-lg text-slate-600">
            Pay Bills With Us negotiates, optimizes, and pays on your behalf. You fund one secure wallet, and we handle
            the rest—covering internet, mobile, energy, TV, and more without missed due dates.
          </p>
          <div className="mt-8 flex flex-col gap-4 sm:flex-row">
            <Link
              to="/signup"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-brand px-6 py-3 text-sm font-semibold text-white shadow-sm transition-transform hover:-translate-y-0.5 hover:bg-brand-dark"
            >
              Create your account
              <ArrowRight size={16} aria-hidden />
            </Link>
            <a
              href="tel:+18001231234"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 px-6 py-3 text-sm font-semibold text-slate-700 transition-colors hover:border-brand hover:text-brand"
            >
              Talk with an agent
              <ShieldCheck size={16} aria-hidden />
            </a>
          </div>
          <dl className="mt-12 grid gap-6 sm:grid-cols-3">
            <div>
              <dt className="text-sm font-medium uppercase tracking-wide text-slate-500">Average savings</dt>
              <dd className="mt-1 text-3xl font-semibold text-slate-900">$142/mo</dd>
            </div>
            <div>
              <dt className="text-sm font-medium uppercase tracking-wide text-slate-500">Bills managed</dt>
              <dd className="mt-1 text-3xl font-semibold text-slate-900">15,000+</dd>
            </div>
            <div>
              <dt className="text-sm font-medium uppercase tracking-wide text-slate-500">U.S. coverage</dt>
              <dd className="mt-1 text-3xl font-semibold text-slate-900">50 states</dd>
            </div>
          </dl>
        </div>
        <div className="relative rounded-3xl bg-white p-6 shadow-xl shadow-brand/10">
          <div className="absolute inset-0 rounded-3xl border border-brand/20" aria-hidden />
          <div className="relative flex flex-col gap-6">
            <h2 className="text-2xl font-semibold text-slate-900">How it works</h2>
            <ol className="space-y-4 text-sm text-slate-600">
              <li>
                <span className="font-semibold text-slate-900">1. Secure sign up</span> – Provide your verified contact, identity,
                and service address details so our agents can represent you with providers.
              </li>
              <li>
                <span className="font-semibold text-slate-900">2. Connect by phone</span> – Your dedicated agent confirms the
                bills you want managed and requests any supporting documents or portal access.
              </li>
              <li>
                <span className="font-semibold text-slate-900">3. Fund your wallet</span> – Load one card or bank account. We pay
                every provider on time, track receipts, and report savings inside your customer portal.
              </li>
            </ol>
            <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
              <p className="font-semibold text-slate-900">Security promise</p>
              <p className="mt-1">
                Admin and agent tools stay on separate portals, protected with multi-factor authentication and encrypted
                vault storage, so your credentials are never exposed.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
