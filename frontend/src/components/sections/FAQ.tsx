import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { faqs } from '../../data/faqs'

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState(0)

  return (
    <section className="bg-slate-50" id="faq">
      <div className="mx-auto max-w-5xl px-6 py-16">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-brand">Questions answered</p>
          <h2 className="mt-2 text-3xl font-semibold text-slate-900">Everything you need to know before getting started</h2>
          <p className="mt-3 text-lg text-slate-600">
            Still curious? Call us directly at <a href="tel:+18001231234" className="text-brand">1-800-123-1234</a> and
            we will walk you through every step.
          </p>
        </div>
        <div className="mt-10 space-y-4">
          {faqs.map((faq, index) => {
            const isOpen = index === openIndex
            return (
              <div key={faq.question} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <button
                  type="button"
                  className="flex w-full items-center justify-between text-left"
                  onClick={() => setOpenIndex(isOpen ? -1 : index)}
                  aria-expanded={isOpen}
                >
                  <span className="text-lg font-semibold text-slate-900">{faq.question}</span>
                  <ChevronDown
                    size={20}
                    className={`transition-transform ${isOpen ? 'rotate-180 text-brand' : 'text-slate-400'}`}
                    aria-hidden
                  />
                </button>
                {isOpen && <p className="mt-4 text-sm text-slate-600">{faq.answer}</p>}
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
