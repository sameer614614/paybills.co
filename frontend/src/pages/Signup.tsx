import { Link } from 'react-router-dom'
import { Calendar, Clock3, Phone } from 'lucide-react'
import SignupForm from '../components/forms/SignupForm'

export default function SignupPage() {
  return (
    <div className="bg-gradient-to-b from-white via-white to-slate-100">
      <section className="mx-auto flex max-w-6xl flex-col gap-10 px-6 py-16 lg:flex-row">
        <div className="lg:w-2/5">
          <Link to="/" className="text-sm font-semibold text-brand hover:underline">
            ← Back to website
          </Link>
          <h1 className="mt-4 text-3xl font-semibold text-slate-900 sm:text-4xl">
            Create your secure Pay Bills With Us account
          </h1>
          <p className="mt-3 text-base text-slate-600">
            Share the details below so your assigned agent can verify you with providers and unlock your guaranteed 25%
            savings. We never share your information outside of onboarding.
          </p>
          <div className="mt-8 space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="mt-1 flex h-10 w-10 items-center justify-center rounded-full bg-brand/10 text-brand">
                <Phone size={20} aria-hidden />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">Need help?</p>
                <p className="text-sm text-slate-600">
                  Call our onboarding hotline at{' '}
                  <a href="tel:+18001231234" className="font-semibold text-brand">
                    1-800-123-1234
                  </a>{' '}
                  for live support Monday–Saturday, 8am–8pm ET.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="mt-1 flex h-10 w-10 items-center justify-center rounded-full bg-brand/10 text-brand">
                <Calendar size={20} aria-hidden />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">What happens next</p>
                <p className="text-sm text-slate-600">
                  An agent reviews your submission within one business day, then schedules a short verification call to
                  confirm each biller and funding source.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="mt-1 flex h-10 w-10 items-center justify-center rounded-full bg-brand/10 text-brand">
                <Clock3 size={20} aria-hidden />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">Typical onboarding timeline</p>
                <p className="text-sm text-slate-600">
                  Most households are fully managed within 3–5 business days after your call. You can monitor progress in
                  the customer portal we activate for you.
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className="lg:w-3/5">
          <SignupForm />
        </div>
      </section>
    </div>
  )
}
