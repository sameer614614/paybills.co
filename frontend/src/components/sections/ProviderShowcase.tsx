import { useMemo, useState } from 'react'
import type { ChangeEvent } from 'react'
import { Building2, MapPin, Search } from 'lucide-react'
import { providerCatalog } from '../../data/providerCatalog'

export default function ProviderShowcase() {
  const [zip, setZip] = useState('')

  const trimmedZip = zip.trim()
  const isZipValid = /^\d{5}$/.test(trimmedZip)

  const results = useMemo(() => {
    if (!isZipValid) {
      return providerCatalog
    }
    // In a real build this would query an API. For now, return filtered categories with note.
    return providerCatalog.map((category) => ({
      ...category,
      providers: category.providers.slice(0, 6),
    }))
  }, [isZipValid])

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { value } = event.target
    if (value.length <= 5) {
      setZip(value.replace(/[^\d]/g, ''))
    }
  }

  return (
    <section className="border-y border-slate-200 bg-slate-50" id="providers">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-brand">Zip-based availability</p>
          <h2 className="mt-2 text-3xl font-semibold text-slate-900">Check who we support in your area</h2>
          <p className="mt-3 text-lg text-slate-600">
            Enter your ZIP code to preview providers before talking with an agent. No ZIP? See our most requested billers
            across every category.
          </p>
        </div>
        <div className="mx-auto mt-8 flex max-w-lg items-center rounded-full border border-slate-200 bg-white px-4 py-2 shadow-sm">
          <Search size={18} aria-hidden className="text-slate-400" />
          <input
            value={zip}
            onChange={handleChange}
            inputMode="numeric"
            maxLength={5}
            className="ml-3 flex-1 border-none text-base outline-none"
            placeholder="Enter ZIP code"
            aria-label="ZIP code"
          />
          <MapPin size={18} aria-hidden className="text-brand" />
        </div>
        <p className="mt-3 text-center text-sm text-slate-500">
          {isZipValid
            ? 'Showing top providers we service in your area. Your agent will confirm additional options during onboarding.'
            : 'Showing our most requested providers. Enter a 5-digit ZIP to personalize this list.'}
        </p>
        <div className="mt-12 grid gap-6 md:grid-cols-2">
          {results.map((category) => (
            <article key={category.id} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand/10 text-brand">
                  <Building2 size={22} aria-hidden />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-slate-900">{category.label}</h3>
                  <p className="text-sm text-slate-500">{category.description}</p>
                </div>
              </div>
              <ul className="mt-4 grid grid-cols-1 gap-2 text-sm text-slate-600 sm:grid-cols-2">
                {category.providers.map((provider) => (
                  <li key={provider} className="rounded-full bg-slate-100 px-3 py-1 text-center text-slate-700">
                    {provider}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
