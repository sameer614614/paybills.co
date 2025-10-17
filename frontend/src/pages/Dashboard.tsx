import { useQuery } from '@tanstack/react-query'
import { fetchProfile, type Profile } from '../api/auth'
import { useAuth } from '../hooks/useAuth'
import PaymentMethodsPanel from '../components/dashboard/PaymentMethodsPanel'
import BillersPanel from '../components/dashboard/BillersPanel'
import ReceiptsPanel from '../components/dashboard/ReceiptsPanel'

function DashboardPage() {
  const { user, token, logout } = useAuth()
  const { data: profile } = useQuery<{ user: Profile }>({
    queryKey: ['profile'],
    queryFn: () => fetchProfile(token!),
    enabled: Boolean(token),
  })
  const userProfile = profile?.user

  return (
    <div className="bg-slate-50 pb-16">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <header className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-brand">Account dashboard</p>
            <h1 className="mt-2 text-2xl font-semibold text-slate-900">Welcome back, {user?.firstName ?? 'valued member'}.</h1>
            <p className="mt-2 text-sm text-slate-600">
              From here you can add or remove payment methods anytime and review the billers and receipts our agents manage.
              Contact us if you need to change any biller details.
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            <p className="font-semibold text-slate-700">Profile</p>
            <p>{userProfile?.firstName} {userProfile?.lastName}</p>
            <p>{userProfile?.email}</p>
            {userProfile?.customerNumber && (
              <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Customer #: {userProfile.customerNumber}
              </p>
            )}
            {userProfile?.addressLine1 && <p className="mt-1">{userProfile.addressLine1}</p>}
            {userProfile?.addressLine2 && <p>{userProfile.addressLine2}</p>}
            {(userProfile?.city || userProfile?.state || userProfile?.postalCode) && (
              <p>
                {[userProfile?.city, userProfile?.state].filter(Boolean).join(', ')}{' '}
                {userProfile?.postalCode}
              </p>
            )}
            <button
              type="button"
              onClick={logout}
              className="mt-3 inline-flex items-center justify-center rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:border-brand hover:text-brand"
            >
              Sign out
            </button>
          </div>
        </header>

        <div className="mt-8 space-y-8">
          <PaymentMethodsPanel profile={userProfile ?? null} />
          <BillersPanel />
          <ReceiptsPanel />
        </div>
      </div>
    </div>
  )
}

export default DashboardPage
