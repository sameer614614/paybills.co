import { useQuery } from '@tanstack/react-query'
import { getReceipts } from '../../api/receipts'
import { useAuth } from '../../hooks/useAuth'

const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })

function ReceiptsPanel() {
  const { token } = useAuth()
  const { data, isLoading, error } = useQuery({
    queryKey: ['receipts'],
    queryFn: () => getReceipts(token!),
    enabled: Boolean(token),
  })

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <header className="border-b border-slate-100 pb-4">
        <h2 className="text-lg font-semibold text-slate-900">Payment receipts</h2>
        <p className="text-sm text-slate-600">
          Download receipts from the payments we&apos;ve made on your behalf. For changes or disputes, please call our support team.
        </p>
      </header>

      <div className="mt-4">
        {isLoading && <p className="text-sm text-slate-500">Loading receipts…</p>}
        {error && <p className="text-sm text-red-600">{error instanceof Error ? error.message : 'Unable to load receipts'}</p>}

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Biller</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Confirmation</th>
                <th className="px-4 py-3">Receipt</th>
                <th className="px-4 py-3">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {data?.receipts.map((receipt) => (
                <tr key={receipt.id} className="text-slate-700">
                  <td className="px-4 py-3">{new Date(receipt.paidOn).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-slate-900">{receipt.biller.name}</p>
                      <p className="text-xs text-slate-500">{receipt.biller.category}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">{currency.format(Number(receipt.amount))}</td>
                  <td className="px-4 py-3">{receipt.confirmation}</td>
                  <td className="px-4 py-3">
                    {receipt.downloadUrl ? (
                      <a
                        href={receipt.downloadUrl}
                        className="font-semibold text-brand hover:text-brand-dark"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        View PDF
                      </a>
                    ) : (
                      <span className="text-xs text-slate-400">Agent upload pending</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">{receipt.notes ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {!isLoading && !data?.receipts.length && (
            <p className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
              No receipts yet. You&apos;ll see payment history and downloadable confirmations here once bills are processed.
            </p>
          )}
        </div>
      </div>
    </section>
  )
}

export default ReceiptsPanel
