import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link } from 'react-router-dom'
import { requestPasswordReset } from '../api/auth'

const forgotPasswordSchema = z.object({
  ssnLast4: z.string().regex(/^\d{4}$/, 'Enter the last four digits only'),
  dateOfBirth: z.string().min(1, 'Enter your date of birth'),
  customerNumber: z.string().optional(),
})

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>

type ServerDetails = {
  fieldErrors?: Record<string, string[]>
  formErrors?: string[]
}

export default function ForgotPasswordPage() {
  const [serverMessage, setServerMessage] = useState<string | null>(null)
  const [devToken, setDevToken] = useState<string | null>(null)
  const [devEmail, setDevEmail] = useState<string | null>(null)
  const [submittedCustomer, setSubmittedCustomer] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      ssnLast4: '',
      dateOfBirth: '',
      customerNumber: '',
    },
  })

  const onSubmit = handleSubmit(async (values) => {
    setServerMessage(null)
    setDevToken(null)
    setDevEmail(null)
    try {
      const response = await requestPasswordReset({
        ssnLast4: values.ssnLast4,
        dateOfBirth: values.dateOfBirth,
        customerNumber: values.customerNumber?.trim() ? values.customerNumber.trim().toUpperCase() : undefined,
      })
      setServerMessage('Check your email for a password reset link. It expires in one hour.')
      if (values.customerNumber) {
        setSubmittedCustomer(values.customerNumber.trim().toUpperCase())
      } else {
        setSubmittedCustomer(null)
      }
      if (response.token) {
        setDevToken(response.token)
      }
      if (response.email) {
        setDevEmail(response.email)
      }
    } catch (error) {
      if (error instanceof Error) {
        const serverError = error as Error & { details?: ServerDetails }
        if (serverError.details?.fieldErrors) {
          Object.entries(serverError.details.fieldErrors).forEach(([field, messages]) => {
            const message = messages?.[0]
            if (!message) return
            const formField = field as keyof ForgotPasswordFormValues
            setError(formField, { type: 'server', message })
          })
        }
        setServerMessage(serverError.message)
        return
      }
      setServerMessage('Unable to process the request right now. Please try again.')
    }
  })

  return (
    <div className="bg-white">
      <div className="mx-auto flex min-h-[80vh] max-w-4xl flex-col justify-center px-6 py-16">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-lg">
          <Link to="/login" className="text-sm font-semibold text-brand hover:text-brand-dark">
            ← Back to sign in
          </Link>
          <h1 className="mt-4 text-3xl font-semibold text-slate-900">Reset your password</h1>
          <p className="mt-2 text-sm text-slate-600">
            Confirm your identity with the last four of your SSN and your date of birth. We&apos;ll send the reset link to the email
            we already have on file.
          </p>

          <form className="mt-8 space-y-6" onSubmit={onSubmit}>
            <div className="space-y-2">
              <label htmlFor="ssnLast4" className="text-sm font-medium text-slate-700">
                Last four of SSN
              </label>
              <input
                id="ssnLast4"
                type="text"
                inputMode="numeric"
                maxLength={4}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                {...register('ssnLast4')}
              />
              {errors.ssnLast4 && <p className="text-sm text-red-600">{errors.ssnLast4.message}</p>}
            </div>

            <div className="space-y-2">
              <label htmlFor="dateOfBirth" className="text-sm font-medium text-slate-700">
                Date of birth
              </label>
              <input
                id="dateOfBirth"
                type="date"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                {...register('dateOfBirth')}
              />
              {errors.dateOfBirth && <p className="text-sm text-red-600">{errors.dateOfBirth.message}</p>}
            </div>

            <div className="space-y-2">
              <label htmlFor="customerNumber" className="text-sm font-medium text-slate-700">
                Customer number (optional)
              </label>
              <input
                id="customerNumber"
                type="text"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                placeholder="CUST-12345"
                {...register('customerNumber')}
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-full bg-brand px-6 py-2 text-sm font-semibold text-white shadow-sm transition-transform hover:-translate-y-0.5 hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? 'Sending secure link…' : 'Send reset link'}
            </button>
          </form>

          {serverMessage && (
            <div className="mt-6 rounded-2xl border border-brand/30 bg-brand/10 p-4 text-sm text-brand">
              <p>{serverMessage}</p>
              {submittedCustomer && (
                <p className="mt-1 text-xs text-brand/80">
                  Request tied to customer number <span className="font-semibold">{submittedCustomer}</span>.
                </p>
              )}
              {devToken && (
                <p className="mt-2 text-xs text-brand/80">
                  Dev token: <span className="font-mono">{devToken}</span>
                </p>
              )}
              {devEmail && (
                <p className="mt-1 text-xs text-brand/80">
                  Dev email on file: <span className="font-semibold">{devEmail}</span>
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
