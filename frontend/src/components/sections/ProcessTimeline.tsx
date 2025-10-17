import { CalendarClock, CheckCircle2, PhoneCall, Wallet } from 'lucide-react'

const steps = [
  {
    title: 'Schedule your onboarding call',
    description:
      'Choose a convenient time after submitting the form. We assign a licensed agent to confirm the bills you want us to manage.',
    icon: CalendarClock,
  },
  {
    title: 'Verify identity & providers',
    description:
      'Share last four of SSN, date of birth, and addresses. Provide account numbers or copies of your latest statements.',
    icon: CheckCircle2,
  },
  {
    title: 'Authorize wallet funding',
    description:
      'Securely add the card or bank account you want us to use. You can store multiple payment methods and set funding limits.',
    icon: Wallet,
  },
  {
    title: 'Relax & review savings',
    description:
      'Your agent pays everything on time, uploads receipts, and negotiates lower rates. Track the 25% guarantee in your customer portal.',
    icon: PhoneCall,
  },
]

export default function ProcessTimeline() {
  return (
    <section className="bg-white" id="process">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <div className="max-w-2xl">
          <h2 className="text-3xl font-semibold text-slate-900">What happens after you sign up?</h2>
          <p className="mt-3 text-lg text-slate-600">
            We emphasize transparency and communication. Here’s the exact journey from submitting your details to seeing
            lower monthly bills.
          </p>
        </div>
        <ol className="mt-10 space-y-6">
          {steps.map((step, index) => (
            <li key={step.title} className="relative rounded-3xl border border-slate-200 bg-slate-50 p-6">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand/10 text-brand">
                  <step.icon size={24} aria-hidden />
                </div>
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wide text-brand/80">Step {index + 1}</p>
                  <h3 className="mt-1 text-xl font-semibold text-slate-900">{step.title}</h3>
                  <p className="mt-2 text-sm text-slate-600">{step.description}</p>
                </div>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
