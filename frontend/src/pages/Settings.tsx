import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { changePassword, fetchProfile, type Profile, updateProfile } from '../api/auth'
import { useAuth } from '../hooks/useAuth'

const profileSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  phone: z.string().optional(),
  addressLine1: z.string().min(3, 'Enter your street address'),
  addressLine2: z.string().optional(),
  city: z.string().min(2, 'Enter your city'),
  state: z.string().min(2, 'Enter your state'),
  postalCode: z.string().min(3, 'Enter your ZIP or postal code'),
})

type ProfileFormValues = z.infer<typeof profileSchema>

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Enter your current password'),
    newPassword: z
      .string()
      .min(8, 'Use at least 8 characters')
      .regex(/[A-Z]/, 'Include one uppercase letter')
      .regex(/[a-z]/, 'Include one lowercase letter')
      .regex(/[0-9]/, 'Include one number')
      .regex(/[!@#$%^&*(),.?":{}|<>\[\];'`~\\/+-=_]/, 'Include one symbol'),
    confirmNewPassword: z.string().min(8, 'Confirm your new password'),
  })
  .superRefine((values, ctx) => {
    if (values.newPassword !== values.confirmNewPassword) {
      ctx.addIssue({
        path: ['confirmNewPassword'],
        code: z.ZodIssueCode.custom,
        message: 'Passwords must match',
      })
    }
  })

type PasswordFormValues = z.infer<typeof passwordSchema>

export default function SettingsPage() {
  const { token, logout, updateUser } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [profileMessage, setProfileMessage] = useState<string | null>(null)
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null)

  const { data: profileResponse } = useQuery<{ user: Profile }>({
    queryKey: ['profile'],
    queryFn: () => fetchProfile(token!),
    enabled: Boolean(token),
  })

  const profile = useMemo(() => profileResponse?.user ?? null, [profileResponse])

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      email: '',
      phone: '',
      addressLine1: '',
      addressLine2: '',
      city: '',
      state: '',
      postalCode: '',
    },
  })

  useEffect(() => {
    if (profile) {
      reset({
        email: profile.email ?? '',
        phone: profile.phone ?? '',
        addressLine1: profile.addressLine1 ?? '',
        addressLine2: profile.addressLine2 ?? '',
        city: profile.city ?? '',
        state: profile.state ?? '',
        postalCode: profile.postalCode ?? '',
      })
    }
  }, [profile, reset])

  const {
    register: registerPassword,
    handleSubmit: handleSubmitPassword,
    reset: resetPasswordForm,
    formState: { errors: passwordErrors, isSubmitting: isSubmittingPassword },
  } = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmNewPassword: '',
    },
  })

  const onSubmitProfile = handleSubmit(async (values) => {
    if (!token) return
    setProfileMessage(null)
    try {
      const payload = {
        email: values.email.trim(),
        phone: values.phone?.trim() ? values.phone.trim() : null,
        addressLine1: values.addressLine1.trim(),
        addressLine2: values.addressLine2?.trim() ? values.addressLine2.trim() : null,
        city: values.city.trim(),
        state: values.state.trim(),
        postalCode: values.postalCode.trim(),
      }
      const response = await updateProfile(token, payload)
      queryClient.invalidateQueries({ queryKey: ['profile'] })
      updateUser(response.user)
      if (response.requiresReauthentication) {
        setProfileMessage('Email updated. Please sign in again with your new email address.')
        logout()
        navigate('/login', { replace: true, state: { message: 'Sign in again with your updated email.' } })
        return
      }
      setProfileMessage('Contact information updated successfully.')
    } catch (error) {
      if (error instanceof Error) {
        const serverError = error as Error & {
          details?: { fieldErrors?: Record<string, string[]>; formErrors?: string[] }
        }
        if (serverError.details?.fieldErrors) {
          Object.entries(serverError.details.fieldErrors).forEach(([field, messages]) => {
            const message = messages?.[0]
            if (!message) return
            const formField = field as keyof ProfileFormValues
            setError(formField, { type: 'server', message })
          })
        }
        setProfileMessage(serverError.message)
        return
      }
      setProfileMessage('Unable to update profile right now. Please try again later.')
    }
  })

  const onSubmitPassword = handleSubmitPassword(async (values) => {
    if (!token) return
    setPasswordMessage(null)
    try {
      const response = await changePassword(token, values)
      resetPasswordForm()
      setPasswordMessage('Password updated. Please sign in again.')
      if (response.requiresReauthentication) {
        logout()
        navigate('/login', { replace: true, state: { message: 'Password updated. Sign in with your new password.' } })
      }
    } catch (error) {
      if (error instanceof Error) {
        setPasswordMessage(error.message)
        return
      }
      setPasswordMessage('Unable to change password right now. Please try again later.')
    }
  })

  return (
    <div className="bg-slate-50 pb-16">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <header className="mb-8">
          <h1 className="text-3xl font-semibold text-slate-900">Account settings</h1>
          <p className="mt-2 text-sm text-slate-600">
            Update how we reach you and keep your password secure. Changes to email or password will require you to sign in again.
          </p>
        </header>

        <div className="grid gap-8 lg:grid-cols-2">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Contact information</h2>
            <p className="mt-1 text-sm text-slate-600">
              Keep your email and service address up to date so agents can reach you quickly.
            </p>

            <form className="mt-6 space-y-4" onSubmit={onSubmitProfile}>
              <div>
                <label className="text-sm font-medium text-slate-700" htmlFor="email">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                  {...register('email')}
                />
                {errors.email && <p className="text-sm text-red-600">{errors.email.message}</p>}
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700" htmlFor="phone">
                  Phone number
                </label>
                <input
                  id="phone"
                  type="tel"
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                  {...register('phone')}
                />
                {errors.phone && <p className="text-sm text-red-600">{errors.phone.message}</p>}
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700" htmlFor="addressLine1">
                  Street address
                </label>
                <input
                  id="addressLine1"
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                  {...register('addressLine1')}
                />
                {errors.addressLine1 && <p className="text-sm text-red-600">{errors.addressLine1.message}</p>}
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700" htmlFor="addressLine2">
                  Apt, suite, etc. (optional)
                </label>
                <input
                  id="addressLine2"
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                  {...register('addressLine2')}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <label className="text-sm font-medium text-slate-700" htmlFor="city">
                    City
                  </label>
                  <input
                    id="city"
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                    {...register('city')}
                  />
                  {errors.city && <p className="text-sm text-red-600">{errors.city.message}</p>}
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700" htmlFor="state">
                    State
                  </label>
                  <input
                    id="state"
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                    {...register('state')}
                  />
                  {errors.state && <p className="text-sm text-red-600">{errors.state.message}</p>}
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700" htmlFor="postalCode">
                    Postal code
                  </label>
                  <input
                    id="postalCode"
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                    {...register('postalCode')}
                  />
                  {errors.postalCode && <p className="text-sm text-red-600">{errors.postalCode.message}</p>}
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-full bg-brand px-6 py-2 text-sm font-semibold text-white shadow-sm transition-transform hover:-translate-y-0.5 hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? 'Saving…' : 'Save changes'}
              </button>
            </form>

            {profileMessage && <p className="mt-4 text-sm text-brand">{profileMessage}</p>}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Password</h2>
            <p className="mt-1 text-sm text-slate-600">
              Choose a strong password to protect your customer dashboard.
            </p>

            <form className="mt-6 space-y-4" onSubmit={onSubmitPassword}>
              <div>
                <label className="text-sm font-medium text-slate-700" htmlFor="currentPassword">
                  Current password
                </label>
                <input
                  id="currentPassword"
                  type="password"
                  autoComplete="current-password"
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                  {...registerPassword('currentPassword')}
                />
                {passwordErrors.currentPassword && (
                  <p className="text-sm text-red-600">{passwordErrors.currentPassword.message}</p>
                )}
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700" htmlFor="newPassword">
                  New password
                </label>
                <input
                  id="newPassword"
                  type="password"
                  autoComplete="new-password"
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                  {...registerPassword('newPassword')}
                />
                {passwordErrors.newPassword && (
                  <p className="text-sm text-red-600">{passwordErrors.newPassword.message}</p>
                )}
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700" htmlFor="confirmNewPassword">
                  Confirm new password
                </label>
                <input
                  id="confirmNewPassword"
                  type="password"
                  autoComplete="new-password"
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                  {...registerPassword('confirmNewPassword')}
                />
                {passwordErrors.confirmNewPassword && (
                  <p className="text-sm text-red-600">{passwordErrors.confirmNewPassword.message}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={isSubmittingPassword}
                className="w-full rounded-full bg-brand px-6 py-2 text-sm font-semibold text-white shadow-sm transition-transform hover:-translate-y-0.5 hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmittingPassword ? 'Updating…' : 'Update password'}
              </button>
            </form>

            {passwordMessage && <p className="mt-4 text-sm text-brand">{passwordMessage}</p>}
          </section>
        </div>
      </div>
    </div>
  )
}
