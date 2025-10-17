import { ClipboardCheck, CreditCard, Shield, Sparkle } from 'lucide-react'

const highlights = [
  {
    icon: Sparkle,
    title: 'Proactive savings playbook',
    description:
      'We scout provider promotions, loyalty offers, and bundling incentives each month to keep your rates dropping.',
  },
  {
    icon: ClipboardCheck,
    title: 'All bills tracked for you',
    description:
      'Electric, internet, mobile, water, security—every bill is logged, scheduled, and receipted within your portal.',
  },
  {
    icon: CreditCard,
    title: 'One wallet, unlimited payments',
    description:
      'Store multiple cards and checking accounts. Fund once and let us disburse to every provider securely.',
  },
  {
    icon: Shield,
    title: 'Bank-grade protection',
    description:
      'Admin, agent, and customer portals stay isolated. Encrypted vault storage and multi-factor approvals protect your data.',
  },
]

export default function FeatureHighlights() {
  return (
    <section className="bg-white" id="features">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <div className="max-w-3xl">
          <h2 className="text-3xl font-semibold text-slate-900">The effortless way to control household spending</h2>
          <p className="mt-3 text-lg text-slate-600">
            We built Pay Bills With Us for busy households who want predictable payments, less time on hold, and a real
            partner watching their bottom line every month.
          </p>
        </div>
        <div className="mt-10 grid gap-6 md:grid-cols-2">
          {highlights.map((item) => (
            <div
              key={item.title}
              className="rounded-3xl border border-slate-200 bg-slate-50 p-6 transition hover:border-brand hover:bg-white hover:shadow-lg"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand/10 text-brand">
                <item.icon size={22} aria-hidden />
              </div>
              <h3 className="mt-4 text-xl font-semibold text-slate-900">{item.title}</h3>
              <p className="mt-2 text-sm text-slate-600">{item.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
