import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link } from 'react-router-dom'
import { requestPasswordReset } from '../api/auth'

const forgotPasswordSchema = z.object({
  email: z.string().email('Enter the email associated with your account'),
  ssnLast4: z.string().regex(/^\d{4}$/, 'Enter the last four digits only'),
  dateOfBirth: z.string().min(1, 'Enter your date of birth'),
})

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>

type ServerDetails = {
  fieldErrors?: Record<string, string[]>
  formErrors?: string[]
}

export default function ForgotPasswordPage() {
  const [serverMessage, setServerMessage] = useState<string | null>(null)
  const [devToken, setDevToken] = useState<string | null>(null)
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
      ssnLast4: '',
      dateOfBirth: '',
    },
  })

  const onSubmit = handleSubmit(async (values) => {
    setServerMessage(null)
    setDevToken(null)
    try {
      const response = await requestPasswordReset({
        email: values.email,
        ssnLast4: values.ssnLast4,
        dateOfBirth: values.dateOfBirth,
      })
      setServerMessage('Check your email for a password reset link. It expires in one hour.')
      setSubmittedEmail(values.email)
      if (response.token) {
        setDevToken(response.token)
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
            We&apos;ll send a secure reset link to the email on file once we verify your identity.
          </p>

          <form className="mt-8 space-y-6" onSubmit={onSubmit}>
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-slate-700">
                Email on file
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                {...register('email')}
              />
              {errors.email && <p className="text-sm text-red-600">{errors.email.message}</p>}
            </div>

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
              {submittedEmail && (
                <p className="mt-1 text-xs text-brand/80">
                  We&apos;ll use the email we have on file for <span className="font-semibold">{submittedEmail}</span>.
                </p>
              )}
              {devToken && (
                <p className="mt-2 text-xs text-brand/80">
                  Dev token: <span className="font-mono">{devToken}</span>
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
