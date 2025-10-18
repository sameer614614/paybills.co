import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { resetPassword } from '../api/auth'
import { useAuth } from '../hooks/useAuth'

const resetSchema = z
  .object({
    token: z.string().min(10, 'Reset link is required'),
    newPassword: z
      .string()
      .min(8, 'Use at least 8 characters')
      .regex(/[A-Z]/, 'Include one uppercase letter')
      .regex(/[a-z]/, 'Include one lowercase letter')
      .regex(/[0-9]/, 'Include one number')
      .regex(/[!@#$%^&*(),.?":{}|<>\[\];'`~\\/+-=_]/, 'Include one symbol'),
    confirmPassword: z.string().min(8, 'Confirm your new password'),
  })
  .superRefine((values, ctx) => {
    if (values.newPassword !== values.confirmPassword) {
      ctx.addIssue({
        path: ['confirmPassword'],
        code: z.ZodIssueCode.custom,
        message: 'Passwords must match',
      })
    }
  })

type ResetPasswordFormValues = z.infer<typeof resetSchema>

export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const { setAuthState } = useAuth()
  const [searchParams] = useSearchParams()
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetSchema),
    defaultValues: {
      token: '',
      newPassword: '',
      confirmPassword: '',
    },
  })

  useEffect(() => {
    const token = searchParams.get('token')
    if (token) {
      setValue('token', token)
    }
  }, [searchParams, setValue])

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null)
    try {
      const auth = await resetPassword(values)
      setAuthState(auth)
      navigate('/dashboard', { replace: true })
    } catch (error) {
      if (error instanceof Error) {
        setServerError(error.message)
        return
      }
      setServerError('Unable to reset password right now. Try again or request a new link.')
    }
  })

  return (
    <div className="bg-white">
      <div className="mx-auto flex min-h-[80vh] max-w-4xl flex-col justify-center px-6 py-16">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-lg">
          <Link to="/login" className="text-sm font-semibold text-brand hover:text-brand-dark">
            ← Back to sign in
          </Link>
          <h1 className="mt-4 text-3xl font-semibold text-slate-900">Choose a new password</h1>
          <p className="mt-2 text-sm text-slate-600">
            Create a new password to regain access to your account. The reset link becomes invalid after it&apos;s used once.
          </p>

          <form className="mt-8 space-y-6" onSubmit={onSubmit}>
            <input type="hidden" {...register('token')} />

            <div className="space-y-2">
              <label htmlFor="newPassword" className="text-sm font-medium text-slate-700">
                New password
              </label>
              <input
                id="newPassword"
                type="password"
                autoComplete="new-password"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                {...register('newPassword')}
              />
              {errors.newPassword && <p className="text-sm text-red-600">{errors.newPassword.message}</p>}
            </div>

            <div className="space-y-2">
              <label htmlFor="confirmPassword" className="text-sm font-medium text-slate-700">
                Confirm new password
              </label>
              <input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                {...register('confirmPassword')}
              />
              {errors.confirmPassword && <p className="text-sm text-red-600">{errors.confirmPassword.message}</p>}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-full bg-brand px-6 py-2 text-sm font-semibold text-white shadow-sm transition-transform hover:-translate-y-0.5 hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? 'Updating password…' : 'Reset password'}
            </button>
          </form>

          {serverError && (
            <p className="mt-4 text-sm text-red-600">{serverError}</p>
          )}
        </div>
      </div>
    </div>
  )
}
