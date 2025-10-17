import { useQuery } from '@tanstack/react-query'
import { getBillers } from '../../api/billers'
import { useAuth } from '../../hooks/useAuth'

const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })

function formatCategory(category: string) {
  return category
    .split('_')
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(' ')
}

function BillersPanel() {
  const { token } = useAuth()
  const { data, isLoading, error } = useQuery({
    queryKey: ['billers'],
    queryFn: () => getBillers(token!),
    enabled: Boolean(token),
  })

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <header className="border-b border-slate-100 pb-4">
        <h2 className="text-lg font-semibold text-slate-900">Linked billers</h2>
        <p className="text-sm text-slate-600">
          Review the billers our agents manage on your behalf. Call us if anything needs to be updated.
        </p>
      </header>

      <div className="mt-4 space-y-4">
        {isLoading && <p className="text-sm text-slate-500">Loading billers…</p>}
        {error && <p className="text-sm text-red-600">{error instanceof Error ? error.message : 'Unable to load billers'}</p>}

        <ul className="grid gap-4 md:grid-cols-2">
          {data?.billers.map((biller) => (
            <li key={biller.id} className="rounded-xl border border-slate-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-slate-900">{biller.name}</p>
                  <p className="text-sm text-slate-500">{formatCategory(biller.category)}</p>
                  <p className="mt-1 text-xs text-slate-500">Account ID: {biller.accountId}</p>
                </div>
              </div>
              {biller.receipts.length > 0 && (
                <div className="mt-3 text-xs text-slate-500">
                  <p className="font-semibold text-slate-600">Recent receipts</p>
                  <ul className="mt-1 space-y-1">
                    {biller.receipts.map((receipt) => (
                      <li key={receipt.id}>
                        {new Date(receipt.paidOn).toLocaleDateString()} · {currency.format(Number(receipt.amount))} · Confirmation #{receipt.confirmation}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </li>
          ))}
        </ul>

        {!isLoading && !data?.billers.length && (
          <p className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
            No billers have been added yet. Our agent will add them after confirming details with you by phone.
          </p>
        )}
      </div>
    </section>
  )
}

export default BillersPanel
