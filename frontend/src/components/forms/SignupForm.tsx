import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { CheckCircle2, Loader2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { usStates } from '../../data/states'
import { isAdult } from '../../lib/date'
import { registerUser, loginUser } from '../../api/auth'
import { useAuth } from '../../hooks/useAuth'

const signupSchema = z
  .object({
    firstName: z.string().min(2, 'Enter your first name'),
    lastName: z.string().min(2, 'Enter your last name'),
    email: z.string().email('Enter a valid email address'),
    phone: z
      .string()
      .min(10, 'Enter a valid phone number')
      .regex(/^[0-9\-()\s+]+$/, 'Only numbers and phone characters are allowed'),
    password: z
      .string()
      .min(8, 'Use at least 8 characters')
      .regex(/[A-Z]/, 'Include one uppercase letter')
      .regex(/[a-z]/, 'Include one lowercase letter')
      .regex(/[0-9]/, 'Include one number'),
    confirmPassword: z.string().min(8, 'Confirm your password'),
    ssnLast4: z.string().regex(/^\d{4}$/, 'Enter the last four digits only'),
    dob: z.string().min(1, 'Date of birth is required'),
    street: z.string().min(3, 'Enter your street address'),
    unit: z.string().optional(),
    city: z.string().min(2, 'Enter your city'),
    state: z.string().length(2, 'Select a state'),
    zip: z.string().regex(/^\d{5}$/, 'Enter a 5-digit ZIP code'),
    communicationOptIn: z.boolean().optional(),
    terms: z.boolean(),
  })
  .superRefine((values, ctx) => {
    if (values.password !== values.confirmPassword) {
      ctx.addIssue({
        path: ['confirmPassword'],
        code: z.ZodIssueCode.custom,
        message: 'Passwords must match',
      })
    }

    if (!isAdult(values.dob)) {
      ctx.addIssue({
        path: ['dob'],
        code: z.ZodIssueCode.custom,
        message: 'You must be at least 18 years old',
      })
    }

    if (!values.terms) {
      ctx.addIssue({
        path: ['terms'],
        code: z.ZodIssueCode.custom,
        message: 'You must agree to the service terms to continue',
      })
    }
  })

export type SignupFormValues = z.infer<typeof signupSchema>

const defaultValues: SignupFormValues = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  password: '',
  confirmPassword: '',
  ssnLast4: '',
  dob: '',
  street: '',
  unit: '',
  city: '',
  state: '',
  zip: '',
  communicationOptIn: true,
  terms: false,
}

export default function SignupForm() {
  const [submissionId, setSubmissionId] = useState<string | null>(null)
  const [serverError, setServerError] = useState<string | null>(null)
  const navigate = useNavigate()
  const { setAuthState } = useAuth()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues,
  })

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null)
    try {
      const response = await registerUser({
        email: values.email,
        password: values.password,
        firstName: values.firstName,
        lastName: values.lastName,
        dateOfBirth: values.dob,
        ssnLast4: values.ssnLast4,
        phone: values.phone,
        addressLine1: values.street,
        addressLine2: values.unit || undefined,
        city: values.city,
        state: values.state,
        postalCode: values.zip,
      })

      const auth = await loginUser({ email: values.email, password: values.password })
      setAuthState(auth)
      setSubmissionId(`PBW-${response.user.id.slice(0, 8).toUpperCase()}`)
      reset(defaultValues)
      setTimeout(() => navigate('/dashboard'), 1200)
    } catch (error) {
      setServerError(error instanceof Error ? error.message : 'Unable to complete enrollment right now.')
    }
  })

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
      <form className="space-y-8" onSubmit={onSubmit} noValidate>
        <section>
          <p className="text-sm font-semibold uppercase tracking-wide text-brand">Primary contact</p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Field label="First name" error={errors.firstName?.message}>
              <input
                {...register('firstName')}
                type="text"
                autoComplete="given-name"
                className="input"
                placeholder="Jordan"
              />
            </Field>
            <Field label="Last name" error={errors.lastName?.message}>
              <input
                {...register('lastName')}
                type="text"
                autoComplete="family-name"
                className="input"
                placeholder="Lee"
              />
            </Field>
            <Field label="Email" error={errors.email?.message}>
              <input
                {...register('email')}
                type="email"
                autoComplete="email"
                className="input"
                placeholder="you@example.com"
              />
            </Field>
            <Field label="Phone" error={errors.phone?.message}>
              <input
                {...register('phone')}
                type="tel"
                autoComplete="tel"
                className="input"
                placeholder="(555) 123-4567"
              />
            </Field>
          </div>
        </section>

        <section>
          <p className="text-sm font-semibold uppercase tracking-wide text-brand">Identity verification</p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Field label="Last four of SSN" error={errors.ssnLast4?.message}>
              <input
                {...register('ssnLast4')}
                type="text"
                inputMode="numeric"
                maxLength={4}
                className="input"
                placeholder="1234"
              />
            </Field>
            <Field label="Date of birth" error={errors.dob?.message}>
              <input
                {...register('dob')}
                type="date"
                className="input"
              />
            </Field>
          </div>
        </section>

        <section>
          <p className="text-sm font-semibold uppercase tracking-wide text-brand">Service address</p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Field label="Street address" error={errors.street?.message} className="md:col-span-2">
              <input
                {...register('street')}
                type="text"
                autoComplete="address-line1"
                className="input"
                placeholder="742 Evergreen Terrace"
              />
            </Field>
            <Field label="Apt, suite, etc." error={errors.unit?.message}>
              <input
                {...register('unit')}
                type="text"
                autoComplete="address-line2"
                className="input"
                placeholder="Unit 5"
              />
            </Field>
            <Field label="City" error={errors.city?.message}>
              <input
                {...register('city')}
                type="text"
                autoComplete="address-level2"
                className="input"
                placeholder="Atlanta"
              />
            </Field>
            <Field label="State" error={errors.state?.message}>
              <select {...register('state')} className="input">
                <option value="">Select</option>
                {usStates.map((state) => (
                  <option key={state.value} value={state.value}>
                    {state.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="ZIP code" error={errors.zip?.message}>
              <input
                {...register('zip')}
                type="text"
                inputMode="numeric"
                maxLength={5}
                autoComplete="postal-code"
                className="input"
                placeholder="30301"
              />
            </Field>
          </div>
        </section>

        <section>
          <p className="text-sm font-semibold uppercase tracking-wide text-brand">Account security</p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Field label="Password" error={errors.password?.message}>
              <input
                {...register('password')}
                type="password"
                autoComplete="new-password"
                className="input"
                placeholder="Create a strong password"
              />
            </Field>
            <Field label="Confirm password" error={errors.confirmPassword?.message}>
              <input
                {...register('confirmPassword')}
                type="password"
                autoComplete="new-password"
                className="input"
                placeholder="Re-enter password"
              />
            </Field>
          </div>
        </section>

        <section className="space-y-3">
          <label className="flex items-start gap-3 text-sm text-slate-600">
            <input
              type="checkbox"
              {...register('communicationOptIn')}
              className="mt-1 h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand"
            />
            <span>
              Keep me in the loop with text and email updates about provider promotions and onboarding reminders.
            </span>
          </label>
          <label className="flex items-start gap-3 text-sm text-slate-600">
            <input
              type="checkbox"
              {...register('terms')}
              className="mt-1 h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand"
            />
            <span>
              I authorize Pay Bills With Us to begin onboarding my accounts and agree to the{' '}
              <a href="#" className="text-brand underline">
                service terms
              </a>
              .
              {errors.terms && <span className="mt-1 block font-semibold text-red-600">{errors.terms.message}</span>}
            </span>
          </label>
        </section>

        <button
          type="submit"
          className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand px-6 py-3 text-base font-semibold text-white shadow-sm transition-transform hover:-translate-y-0.5 hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> Processing
            </>
          ) : (
            'Submit secure enrollment'
          )}
        </button>
        {serverError && <p className="text-sm text-red-600">{serverError}</p>}
      </form>

      {submissionId && (
        <div className="mt-8 rounded-2xl border border-green-200 bg-green-50 p-6 text-sm text-green-700">
          <div className="flex items-center gap-2 font-semibold text-green-800">
            <CheckCircle2 size={18} aria-hidden />
            Enrollment received!
          </div>
          <p className="mt-2">
            Thank you for trusting us with your bills. Your onboarding confirmation number is{' '}
            <span className="font-semibold">{submissionId}</span>. We&apos;re redirecting you to your dashboard so you can
            add payment methods right away. Our agents will call within one business day to confirm provider details.
          </p>
        </div>
      )}
    </div>
  )
}

type FieldProps = {
  label: string
  error?: string
  children: React.ReactNode
  className?: string
}

function Field({ label, error, children, className = '' }: FieldProps) {
  return (
    <label className={`flex flex-col gap-1 text-sm text-slate-600 ${className}`}>
      <span className="font-semibold text-slate-900">{label}</span>
      {children}
      {error && <span className="text-xs font-medium text-red-600">{error}</span>}
    </label>
  )
}
