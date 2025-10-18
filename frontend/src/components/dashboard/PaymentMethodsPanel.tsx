import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  addPaymentMethod,
  deletePaymentMethod,
  getPaymentMethods,
  updatePaymentMethod,
  type CreatePaymentMethodInput,
  type PaymentMethod,
} from '../../api/paymentMethods'
import { useAuth } from '../../hooks/useAuth'
import type { Profile } from '../../api/auth'

type ApiValidationDetails = {
  fieldErrors?: Record<string, string[]> | undefined
  formErrors?: string[] | undefined
}

type ApiError = Error & { details?: ApiValidationDetails }

function extractValidationMessages(error: unknown): string[] {
  if (!error || typeof error !== 'object') {
    return []
  }

  const details = (error as ApiError).details
  if (!details) {
    return []
  }

  const messages = new Set<string>()
  if (details.formErrors) {
    details.formErrors.filter(Boolean).forEach((message) => messages.add(message))
  }

  if (details.fieldErrors) {
    Object.values(details.fieldErrors).forEach((fieldMessages) => {
      fieldMessages?.filter(Boolean).forEach((message) => messages.add(message))
    })
  }

  return Array.from(messages)
}

const billingAddressFormSchema = z.object({
  line1: z.string().min(1, 'Address line 1 is required'),
  line2: z.string().optional(),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(2, 'State is required'),
  postalCode: z.string().min(3, 'Postal code is required'),
})

const paymentMethodFormSchema = z
  .object({
    type: z.enum(['CREDIT_CARD', 'DEBIT_CARD', 'BANK_ACCOUNT']),
    provider: z.string().min(1, 'Provider is required'),
    cardholderName: z.string().optional(),
    accountNumber: z.string().min(4, 'Account number is required'),
    confirmAccountNumber: z.string().min(4, 'Re-enter the account number'),
    nickname: z.string().optional(),
    expMonth: z.string().optional(),
    expYear: z.string().optional(),
    brand: z.string().optional(),
    securityCode: z.string().optional(),
    routingNumber: z.string().optional(),
    accountType: z.enum(['CHECKING', 'SAVINGS', 'BUSINESS']).optional(),
    ownerName: z.string().optional(),
    useProfileAddress: z.boolean(),
    billingAddress: billingAddressFormSchema.optional(),
    isDefault: z.boolean().optional(),
  })
  .superRefine((data, ctx) => {
    const digitsOnly = data.accountNumber.replace(/\D/g, '')
    const confirmDigits = data.confirmAccountNumber.replace(/\D/g, '')

    if (data.type === 'BANK_ACCOUNT' && digitsOnly !== confirmDigits) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['confirmAccountNumber'],
        message: 'Account numbers must match.',
      })
    }

    if (data.type === 'BANK_ACCOUNT' && digitsOnly.length < 4) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['accountNumber'],
        message: 'Bank account numbers must have at least 4 digits.',
      })
    }

    if (data.type !== 'BANK_ACCOUNT' && digitsOnly.length < 12) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['accountNumber'],
        message: 'Card numbers must have at least 12 digits.',
      })
    }

    if (data.type !== 'BANK_ACCOUNT') {
      if (!data.cardholderName || data.cardholderName.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['cardholderName'],
          message: 'Card holder name is required.',
        })
      }

      if (!data.expMonth || !/^\d{1,2}$/.test(data.expMonth) || Number(data.expMonth) < 1 || Number(data.expMonth) > 12) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['expMonth'],
          message: 'Use a month between 1 and 12.',
        })
      }

      const currentYear = new Date().getFullYear()
      if (
        !data.expYear ||
        !/^\d{4}$/.test(data.expYear) ||
        Number(data.expYear) < currentYear ||
        Number(data.expYear) > currentYear + 15
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['expYear'],
          message: `Use a four digit year between ${currentYear} and ${currentYear + 15}.`,
        })
      }

      if (!data.securityCode || !/^\d{3,4}$/.test(data.securityCode)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['securityCode'],
          message: 'CVV must be 3 or 4 digits.',
        })
      }

      if (!data.useProfileAddress && !data.billingAddress) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['billingAddress'],
          message: 'Provide a billing address or choose the profile address.',
        })
      }
    } else {
      if (!data.routingNumber || !/^\d{9}$/.test(data.routingNumber.replace(/\s+/g, ''))) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['routingNumber'],
          message: 'Routing numbers must be 9 digits.',
        })
      }

      if (!data.accountType) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['accountType'],
          message: 'Select an account type.',
        })
      }

      if (!data.ownerName || data.ownerName.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['ownerName'],
          message: 'Account owner name is required.',
        })
      }
    }
  })

type PaymentMethodFormValues = z.infer<typeof paymentMethodFormSchema>

type EditState = {
  id: string
  type: PaymentMethod['type']
  provider: string
  cardholderName: string
  nickname: string
  expMonth: string
  expYear: string
  brand: string
  billingAddress: {
    line1: string
    line2: string
    city: string
    state: string
    postalCode: string
  }
  useProfileAddress: boolean
  accountNumber: string
  routingNumber: string
  accountType: 'CHECKING' | 'SAVINGS' | 'BUSINESS' | ''
  ownerName: string
  isDefault: boolean
}

const ACCOUNT_TYPE_OPTIONS = [
  { value: 'CHECKING', label: 'Checking' },
  { value: 'SAVINGS', label: 'Savings' },
  { value: 'BUSINESS', label: 'Business checking' },
]

function formatCardNumber(input: string) {
  const digitsOnly = input.replace(/\D/g, '').slice(0, 19)
  const groups = digitsOnly.match(/.{1,4}/g)
  return groups ? groups.join(' ') : ''
}

function formatAccountType(type: string | null) {
  if (!type) return null
  const match = ACCOUNT_TYPE_OPTIONS.find((option) => option.value === type)
  return match ? match.label : type
}

function normalizeAccountType(value: string | null): 'CHECKING' | 'SAVINGS' | 'BUSINESS' | '' {
  if (value === 'CHECKING' || value === 'SAVINGS' || value === 'BUSINESS') {
    return value
  }
  return ''
}

function buildProfileAddress(profile: Profile | null) {
  if (!profile) return null
  return {
    line1: profile.addressLine1 ?? '',
    line2: profile.addressLine2 ?? '',
    city: profile.city ?? '',
    state: profile.state ?? '',
    postalCode: profile.postalCode ?? '',
  }
}

function PaymentMethodsPanel({ profile }: { profile: Profile | null }) {
  const { token } = useAuth()
  const queryClient = useQueryClient()
  const profileAddress = useMemo(() => buildProfileAddress(profile), [profile])
  const [activeTab, setActiveTab] = useState<'saved' | 'add'>('saved')
  const [editing, setEditing] = useState<EditState | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<PaymentMethodFormValues>({
    resolver: zodResolver(paymentMethodFormSchema),
    defaultValues: {
      type: 'CREDIT_CARD',
      provider: '',
      cardholderName: '',
      accountNumber: '',
      confirmAccountNumber: '',
      nickname: '',
      expMonth: '',
      expYear: '',
      brand: '',
      securityCode: '',
      routingNumber: '',
      accountType: 'CHECKING',
      ownerName: '',
      billingAddress: {
        line1: '',
        line2: '',
        city: '',
        state: '',
        postalCode: '',
      },
      useProfileAddress: true,
      isDefault: true,
    },
  })

  const selectedType = watch('type')
  const useProfileBilling = watch('useProfileAddress')
  const accountNumberValue = watch('accountNumber')
  const routingNumberValue = watch('routingNumber')

  useEffect(() => {
    if (selectedType !== 'BANK_ACCOUNT') {
      setValue('confirmAccountNumber', accountNumberValue, { shouldDirty: true })
    }
  }, [selectedType, accountNumberValue, setValue])

  useEffect(() => {
    if (selectedType === 'BANK_ACCOUNT') {
      setValue('expMonth', '', { shouldDirty: false })
      setValue('expYear', '', { shouldDirty: false })
      setValue('securityCode', '', { shouldDirty: false })
      setValue('brand', '', { shouldDirty: false })
    } else {
      setValue('routingNumber', '', { shouldDirty: false })
      setValue('ownerName', '', { shouldDirty: false })
      setValue('accountType', 'CHECKING', { shouldDirty: false })
      setValue('confirmAccountNumber', accountNumberValue, { shouldDirty: false })
    }
  }, [selectedType, setValue, accountNumberValue])

  useEffect(() => {
    if (selectedType === 'BANK_ACCOUNT' && routingNumberValue) {
      const digitsOnly = routingNumberValue.replace(/\D/g, '').slice(0, 9)
      if (digitsOnly !== routingNumberValue) {
        setValue('routingNumber', digitsOnly, { shouldDirty: true })
      }
    }
  }, [routingNumberValue, selectedType, setValue])

  const accountNumberRegister = register('accountNumber', {
    onChange: (event) => {
      if (selectedType === 'BANK_ACCOUNT') {
        const digitsOnly = event.target.value.replace(/\D/g, '').slice(0, 17)
        if (digitsOnly !== event.target.value) {
          setValue('accountNumber', digitsOnly, { shouldDirty: true })
        }
        return
      }

      const formatted = formatCardNumber(event.target.value)
      if (formatted !== event.target.value) {
        setValue('accountNumber', formatted, { shouldDirty: true })
      }
    },
  })

  const confirmAccountNumberRegister = register('confirmAccountNumber', {
    onChange: (event) => {
      if (selectedType === 'BANK_ACCOUNT') {
        const digitsOnly = event.target.value.replace(/\D/g, '').slice(0, 17)
        if (digitsOnly !== event.target.value) {
          setValue('confirmAccountNumber', digitsOnly, { shouldDirty: true })
        }
      }
    },
  })

  useEffect(() => {
    if (!useProfileBilling && profileAddress) {
      setValue('billingAddress', profileAddress)
    }
  }, [useProfileBilling, profileAddress, setValue])

  const { data, isLoading, error } = useQuery({
    queryKey: ['payment-methods'],
    queryFn: () => getPaymentMethods(token!),
    enabled: Boolean(token),
  })

  useEffect(() => {
    if (data?.paymentMethods.length === 0) {
      setValue('isDefault', true)
    }
  }, [data?.paymentMethods.length, setValue])

  const createMutation = useMutation({
    mutationFn: (values: PaymentMethodFormValues) => {
      const sanitizedAccount = values.accountNumber.replace(/\s+/g, '')
      const digitsOnly = sanitizedAccount.replace(/\D/g, '')
      const routingDigits = values.routingNumber?.replace(/\D/g, '') ?? null
      const expMonthValue =
        values.type === 'BANK_ACCOUNT' || !values.expMonth ? null : Number(values.expMonth)
      const expYearValue =
        values.type === 'BANK_ACCOUNT' || !values.expYear ? null : Number(values.expYear)
      const cardholderValue = values.cardholderName?.trim() ?? ''
      const brandValue = values.brand?.trim() ?? ''
      const ownerNameValue = values.ownerName?.trim() ?? ''
      const billingAddress =
        values.useProfileAddress || !values.billingAddress
          ? undefined
          : {
              line1: values.billingAddress.line1.trim(),
              line2: values.billingAddress.line2?.trim() || null,
              city: values.billingAddress.city.trim(),
              state: values.billingAddress.state.trim(),
              postalCode: values.billingAddress.postalCode.trim(),
            }
      const payload = {
        type: values.type,
        provider: values.provider.trim(),
        accountNumber: digitsOnly,
        cardholderName: values.type === 'BANK_ACCOUNT' ? (cardholderValue || null) : cardholderValue,
        nickname: values.nickname?.trim() ? values.nickname.trim() : null,
        expMonth: expMonthValue,
        expYear: expYearValue,
        brand: brandValue ? brandValue : null,
        securityCode:
          values.type === 'BANK_ACCOUNT'
            ? undefined
            : values.securityCode && values.securityCode.trim().length > 0
              ? values.securityCode.trim()
              : undefined,
        routingNumber: values.type === 'BANK_ACCOUNT' ? routingDigits : undefined,
        accountType: values.type === 'BANK_ACCOUNT' ? values.accountType ?? 'CHECKING' : undefined,
        ownerName:
          values.type === 'BANK_ACCOUNT'
            ? ownerNameValue.length > 0
              ? ownerNameValue
              : undefined
            : undefined,
        billingAddress,
        useProfileAddress: values.useProfileAddress,
        isDefault: values.isDefault,
      }

      return addPaymentMethod(token!, payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-methods'] })
      reset({
        type: 'CREDIT_CARD',
        provider: '',
        cardholderName: '',
        accountNumber: '',
        confirmAccountNumber: '',
        nickname: '',
        expMonth: '',
        expYear: '',
        brand: '',
        securityCode: '',
        routingNumber: '',
        accountType: 'CHECKING',
        ownerName: '',
        billingAddress: {
          line1: '',
          line2: '',
          city: '',
          state: '',
          postalCode: '',
        },
        useProfileAddress: true,
        isDefault: false,
      })
      setActiveTab('saved')
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      updates,
    }: {
      id: string
      updates: Partial<CreatePaymentMethodInput> & { isDefault?: boolean }
    }) => updatePaymentMethod(token!, id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-methods'] })
      setEditing(null)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deletePaymentMethod(token!, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-methods'] })
    },
  })

  const onSubmit = (values: PaymentMethodFormValues) => {
    createMutation.mutate(values)
  }

  const handleEdit = (method: PaymentMethod) => {
    const usesProfileBilling = !method.billingAddressLine1 && !method.billingCity && !method.billingState
    setEditing({
      id: method.id,
      type: method.type,
      provider: method.provider,
      cardholderName: method.cardholderName ?? '',
      nickname: method.nickname ?? '',
      expMonth: method.expMonth ? String(method.expMonth) : '',
      expYear: method.expYear ? String(method.expYear) : '',
      brand: method.brand ?? '',
      billingAddress: {
        line1: method.billingAddressLine1 ?? profileAddress?.line1 ?? '',
        line2: method.billingAddressLine2 ?? profileAddress?.line2 ?? '',
        city: method.billingCity ?? profileAddress?.city ?? '',
        state: method.billingState ?? profileAddress?.state ?? '',
        postalCode: method.billingPostalCode ?? profileAddress?.postalCode ?? '',
      },
      useProfileAddress: usesProfileBilling,
      accountNumber: '',
      routingNumber: method.routingNumber ?? '',
      accountType: normalizeAccountType(method.accountType),
      ownerName: method.ownerName ?? '',
      isDefault: method.isDefault,
    })
  }

  const handleEditFieldChange = (field: keyof EditState, value: string | boolean) => {
    setEditing((prev) => {
      if (!prev) return prev
      if (field === 'useProfileAddress' && typeof value === 'boolean') {
        return {
          ...prev,
          useProfileAddress: value,
          billingAddress: value && profileAddress
            ? { ...prev.billingAddress, ...profileAddress }
            : prev.billingAddress,
        }
      }
      if (field === 'isDefault' && typeof value === 'boolean') {
        return { ...prev, isDefault: value }
      }
      if (typeof value === 'string') {
        if (field === 'accountNumber' && prev.type !== 'BANK_ACCOUNT') {
          return { ...prev, accountNumber: formatCardNumber(value) }
        }
        if (field === 'accountNumber' && prev.type === 'BANK_ACCOUNT') {
          return { ...prev, accountNumber: value.replace(/\D/g, '').slice(0, 17) }
        }
        if (field === 'routingNumber') {
          return { ...prev, routingNumber: value.replace(/\D/g, '').slice(0, 9) }
        }
        return { ...prev, [field]: value }
      }
      return prev
    })
  }

  const handleEditAddressChange = (field: keyof EditState['billingAddress'], value: string) => {
    setEditing((prev) => {
      if (!prev) return prev
      return { ...prev, billingAddress: { ...prev.billingAddress, [field]: value } }
    })
  }

  const handleEditSubmit = () => {
    if (!editing) return

    const sanitizedAccount = editing.accountNumber.replace(/\s+/g, '')
    const digitsOnly = sanitizedAccount.replace(/\D/g, '')

    const updates: Partial<CreatePaymentMethodInput> & { isDefault?: boolean } = {
      provider: editing.provider.trim(),
      nickname: editing.nickname.trim() ? editing.nickname.trim() : null,
      cardholderName:
        editing.type === 'BANK_ACCOUNT' ? editing.cardholderName.trim() || null : editing.cardholderName.trim() || null,
      expMonth:
        editing.type === 'BANK_ACCOUNT' || !editing.expMonth ? null : Number(editing.expMonth),
      expYear:
        editing.type === 'BANK_ACCOUNT' || !editing.expYear ? null : Number(editing.expYear),
      brand: editing.brand.trim() ? editing.brand.trim() : null,
      useProfileAddress: editing.useProfileAddress,
      isDefault: editing.isDefault,
    }

    if (!editing.useProfileAddress) {
      updates.billingAddress = {
        line1: editing.billingAddress.line1.trim(),
        line2: editing.billingAddress.line2.trim() ? editing.billingAddress.line2.trim() : null,
        city: editing.billingAddress.city.trim(),
        state: editing.billingAddress.state.trim(),
        postalCode: editing.billingAddress.postalCode.trim(),
      }
    }

    if (digitsOnly.length) {
      updates.accountNumber = digitsOnly
    }

    if (editing.type === 'BANK_ACCOUNT') {
      if (editing.routingNumber.trim()) {
        updates.routingNumber = editing.routingNumber.replace(/\D/g, '').slice(0, 9)
      }
      updates.accountType = editing.accountType || undefined
      updates.ownerName = editing.ownerName.trim() ? editing.ownerName.trim() : null
    }

    updateMutation.mutate({ id: editing.id, updates })
  }

  const handleDelete = (id: string) => {
    if (confirm('Remove this payment method?')) {
      deleteMutation.mutate(id)
    }
  }

  const handleMakeDefault = (method: PaymentMethod) => {
    updateMutation.mutate({ id: method.id, updates: { isDefault: true } })
  }

  const formatAddress = (method: PaymentMethod) => {
    const parts = [method.billingAddressLine1, method.billingAddressLine2, method.billingCity]
      .filter(Boolean)
      .join(', ')
    const statePostal = [method.billingState, method.billingPostalCode].filter(Boolean).join(' ')
    const display = [parts, statePostal].filter(Boolean).join(' • ')
    if (display) return display
    if (!profileAddress) return 'Billing address on file with our team.'
    return `${profileAddress.line1}${profileAddress.line2 ? `, ${profileAddress.line2}` : ''} • ${[
      profileAddress.city,
      profileAddress.state,
    ]
      .filter(Boolean)
      .join(', ')} ${profileAddress.postalCode}`
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <header className="flex flex-col gap-2 border-b border-slate-100 pb-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Payment methods</h2>
          <p className="text-sm text-slate-600">
            Store the cards or bank accounts you want our agents to use. You can add, edit, delete, or choose a default anytime.
          </p>
        </div>
      </header>

      <nav className="mt-4 flex w-full gap-2 rounded-full bg-slate-100 p-1 text-sm font-semibold text-slate-600 lg:hidden">
        <button
          type="button"
          onClick={() => setActiveTab('saved')}
          className={`flex-1 rounded-full px-3 py-2 transition ${
            activeTab === 'saved' ? 'bg-white text-slate-900 shadow-sm' : 'hover:text-slate-900'
          }`}
        >
          Saved methods
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('add')}
          className={`flex-1 rounded-full px-3 py-2 transition ${
            activeTab === 'add' ? 'bg-white text-slate-900 shadow-sm' : 'hover:text-slate-900'
          }`}
        >
          Add new
        </button>
      </nav>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr,0.8fr]">
        <div className={`${activeTab === 'saved' ? 'block' : 'hidden'} lg:block`}>
          {isLoading && <p className="text-sm text-slate-500">Loading payment methods…</p>}
          {error && (
            <p className="text-sm text-red-600">
              {error instanceof Error ? error.message : 'Unable to load payment methods'}
            </p>
          )}
          <ul className="mt-4 space-y-4">
            {data?.paymentMethods.map((method) => (
              <li key={method.id} className="rounded-xl border border-slate-200 p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-semibold text-slate-900">
                      {method.provider}{' '}
                      <span className="text-sm font-normal text-slate-500">•••• {method.last4}</span>
                    </p>
                    <p className="text-sm text-slate-500">
                      {method.type === 'BANK_ACCOUNT' ? 'Bank account' : 'Card'}
                      {method.brand ? ` · ${method.brand}` : ''}
                      {method.expMonth && method.expYear ? ` · Expires ${String(method.expMonth).padStart(2, '0')}/${method.expYear}` : ''}
                    </p>
                    {method.cardholderName && (
                      <p className="text-sm text-slate-500">Card holder: {method.cardholderName}</p>
                    )}
                    {method.type === 'BANK_ACCOUNT' && method.ownerName && (
                      <p className="text-sm text-slate-500">Account owner: {method.ownerName}</p>
                    )}
                    {method.type === 'BANK_ACCOUNT' && method.routingNumber && (
                      <p className="text-sm text-slate-500">Routing #: {method.routingNumber}</p>
                    )}
                    {method.type === 'BANK_ACCOUNT' && method.accountType && (
                      <p className="text-sm text-slate-500">Type: {formatAccountType(method.accountType)}</p>
                    )}
                    <p className="text-xs text-slate-400">{formatAddress(method)}</p>
                    {method.isDefault && (
                      <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-brand/10 px-3 py-1 text-xs font-semibold text-brand">
                        Default method
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 text-sm">
                    {!method.isDefault && (
                      <button
                        type="button"
                        className="rounded-full border border-brand px-3 py-1 font-semibold text-brand transition-colors hover:bg-brand hover:text-white"
                        onClick={() => handleMakeDefault(method)}
                        disabled={updateMutation.isPending}
                      >
                        Make default
                      </button>
                    )}
                    <button
                      type="button"
                      className="rounded-full border border-slate-200 px-3 py-1 font-semibold text-slate-700 transition-colors hover:border-brand hover:text-brand"
                      onClick={() => handleEdit(method)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="rounded-full border border-red-200 px-3 py-1 font-semibold text-red-600 transition-colors hover:border-red-500 hover:bg-red-50"
                      onClick={() => handleDelete(method.id)}
                      disabled={deleteMutation.isPending && deleteMutation.variables === method.id}
                    >
                      Remove
                    </button>
                  </div>
                </div>

                {editing?.id === method.id && (
                  <div className="mt-4 space-y-3 rounded-xl bg-slate-50 p-4">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="flex flex-col text-sm font-medium text-slate-700">
                        Provider
                        <input
                          value={editing.provider}
                          onChange={(event) => handleEditFieldChange('provider', event.target.value)}
                          className="mt-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                        />
                      </label>
                      <label className="flex flex-col text-sm font-medium text-slate-700">
                        Nickname (optional)
                        <input
                          value={editing.nickname}
                          onChange={(event) => handleEditFieldChange('nickname', event.target.value)}
                          className="mt-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                        />
                      </label>
                      {editing.type !== 'BANK_ACCOUNT' && (
                        <label className="flex flex-col text-sm font-medium text-slate-700">
                          Card holder name
                          <input
                            value={editing.cardholderName}
                            onChange={(event) => handleEditFieldChange('cardholderName', event.target.value)}
                            className="mt-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                          />
                        </label>
                      )}
                      <label className="flex flex-col text-sm font-medium text-slate-700">
                        Brand (optional)
                        <input
                          value={editing.brand}
                          onChange={(event) => handleEditFieldChange('brand', event.target.value)}
                          className="mt-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                        />
                      </label>
                      {editing.type !== 'BANK_ACCOUNT' ? (
                        <div className="grid grid-cols-2 gap-3">
                          <label className="flex flex-col text-sm font-medium text-slate-700">
                            Exp. month
                            <input
                              value={editing.expMonth}
                              onChange={(event) => handleEditFieldChange('expMonth', event.target.value)}
                              onFocus={() => {
                                if (!editing.expMonth) {
                                  handleEditFieldChange('expMonth', '')
                                }
                              }}
                              placeholder="MM"
                              className="mt-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                            />
                          </label>
                          <label className="flex flex-col text-sm font-medium text-slate-700">
                            Exp. year
                            <input
                              value={editing.expYear}
                              onChange={(event) => handleEditFieldChange('expYear', event.target.value)}
                              onFocus={() => {
                                if (!editing.expYear) {
                                  handleEditFieldChange('expYear', '')
                                }
                              }}
                              placeholder="YYYY"
                              className="mt-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                            />
                          </label>
                        </div>
                      ) : (
                        <div className="grid gap-3 sm:grid-cols-2">
                          <label className="flex flex-col text-sm font-medium text-slate-700 sm:col-span-2">
                            Account owner name
                            <input
                              value={editing.ownerName}
                              onChange={(event) => handleEditFieldChange('ownerName', event.target.value)}
                              className="mt-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                            />
                          </label>
                          <label className="flex flex-col text-sm font-medium text-slate-700">
                            Routing number
                            <input
                              value={editing.securityCode}
                              onChange={(event) => handleEditFieldChange('securityCode', event.target.value)}
                              onFocus={() => {
                                if (!editing.securityCode) {
                                  handleEditFieldChange('securityCode', '')
                                }
                              }}
                              placeholder="CVV"
                              className="mt-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                            />
                          </label>
                          <label className="flex flex-col text-sm font-medium text-slate-700">
                            Account type
                            <select
                              value={editing.accountType}
                              onChange={(event) => handleEditFieldChange('accountType', event.target.value)}
                              className="mt-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                            >
                              <option value="">Select type</option>
                              {ACCOUNT_TYPE_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </label>
                        </div>
                      )}
                      <label className="flex flex-col text-sm font-medium text-slate-700">
                        Replace card/account number
                        <span className="text-xs font-normal text-slate-500">
                          Current ending in •••• {method.last4}
                        </span>
                        <input
                          value={editing.accountNumber}
                          onChange={(event) => handleEditFieldChange('accountNumber', event.target.value)}
                          onFocus={() => {
                            if (!editing.accountNumber) {
                              handleEditFieldChange('accountNumber', '')
                            }
                          }}
                          placeholder="Enter the full number to replace on file"
                          className="mt-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                        />
                      </label>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-white p-3 text-sm">
                      <p className="font-semibold text-slate-800">Billing address</p>
                      <div className="mt-2 flex flex-col gap-2">
                        <label className="inline-flex items-center gap-2 text-sm">
                          <input
                            type="radio"
                            checked={editing.useProfileAddress}
                            onChange={() => handleEditFieldChange('useProfileAddress', true)}
                          />
                          <span>Use profile address</span>
                        </label>
                        <label className="inline-flex items-center gap-2 text-sm">
                          <input
                            type="radio"
                            checked={!editing.useProfileAddress}
                            onChange={() => handleEditFieldChange('useProfileAddress', false)}
                          />
                          <span>Use a different billing address</span>
                        </label>
                      </div>

                      {!editing.useProfileAddress && (
                        <div className="mt-3 grid gap-3 sm:grid-cols-2">
                          <label className="flex flex-col text-sm font-medium text-slate-700 sm:col-span-2">
                            Address line 1
                            <input
                              value={editing.billingAddress.line1}
                              onChange={(event) => handleEditAddressChange('line1', event.target.value)}
                              className="mt-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                            />
                          </label>
                          <label className="flex flex-col text-sm font-medium text-slate-700 sm:col-span-2">
                            Address line 2 (optional)
                            <input
                              value={editing.billingAddress.line2}
                              onChange={(event) => handleEditAddressChange('line2', event.target.value)}
                              className="mt-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                            />
                          </label>
                          <label className="flex flex-col text-sm font-medium text-slate-700">
                            City
                            <input
                              value={editing.billingAddress.city}
                              onChange={(event) => handleEditAddressChange('city', event.target.value)}
                              className="mt-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                            />
                          </label>
                          <label className="flex flex-col text-sm font-medium text-slate-700">
                            State
                            <input
                              value={editing.billingAddress.state}
                              onChange={(event) => handleEditAddressChange('state', event.target.value)}
                              className="mt-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                            />
                          </label>
                          <label className="flex flex-col text-sm font-medium text-slate-700">
                            Postal code
                            <input
                              value={editing.billingAddress.postalCode}
                              onChange={(event) => handleEditAddressChange('postalCode', event.target.value)}
                              className="mt-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                            />
                          </label>
                        </div>
                      )}
                    </div>

                    <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
                      <input
                        type="checkbox"
                        checked={editing.isDefault}
                        onChange={(event) => handleEditFieldChange('isDefault', event.target.checked)}
                      />
                      <span>Set as default payment method</span>
                    </label>

                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white shadow-sm transition-transform hover:-translate-y-0.5 hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60"
                        onClick={handleEditSubmit}
                        disabled={updateMutation.isPending}
                      >
                        {updateMutation.isPending ? 'Saving…' : 'Save changes'}
                      </button>
                      <button
                        type="button"
                        className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-400"
                        onClick={() => setEditing(null)}
                      >
                        Cancel
                      </button>
                    </div>
                    {updateMutation.isError && (
                      <p className="text-sm text-red-600">
                        {updateMutation.error instanceof Error ? updateMutation.error.message : 'Unable to update method'}
                      </p>
                    )}
                  </div>
                )}
              </li>
            ))}

            {!isLoading && !data?.paymentMethods.length && (
              <li className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
                No payment methods saved yet. Add one using the form.
              </li>
            )}
          </ul>
        </div>

        <div className={`${activeTab === 'add' ? 'block' : 'hidden'} lg:block`}>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
            <h3 className="text-base font-semibold text-slate-900">Add a new method</h3>
            <p className="mt-1 text-sm text-slate-600">
              Card details are encrypted in transit and at rest. Agents will confirm any updates by phone before activation.
            </p>

            <form className="mt-5 space-y-4" onSubmit={handleSubmit(onSubmit)}>
              <label className="flex flex-col text-sm font-medium text-slate-700">
                Type
                <select
                  className="mt-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                  {...register('type')}
                >
                  <option value="CREDIT_CARD">Credit card</option>
                  <option value="DEBIT_CARD">Debit card</option>
                  <option value="BANK_ACCOUNT">Bank account</option>
                </select>
              </label>

              <label className="flex flex-col text-sm font-medium text-slate-700">
                {selectedType === 'BANK_ACCOUNT' ? 'Bank name' : 'Provider'}
                <input
                  className="mt-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                  {...register('provider')}
                />
                {errors.provider && <span className="text-sm text-red-600">{errors.provider.message}</span>}
              </label>

              {selectedType !== 'BANK_ACCOUNT' && (
                <label className="flex flex-col text-sm font-medium text-slate-700">
                  Card holder name
                  <input
                    className="mt-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                    {...register('cardholderName')}
                  />
                  {errors.cardholderName && <span className="text-sm text-red-600">{errors.cardholderName.message}</span>}
                </label>
              )}

              <label className="flex flex-col text-sm font-medium text-slate-700">
                {selectedType === 'BANK_ACCOUNT' ? 'Account number' : 'Card number'}
                <input
                  className="mt-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                  {...accountNumberRegister}
                />
                {errors.accountNumber && <span className="text-sm text-red-600">{errors.accountNumber.message}</span>}
              </label>

              {selectedType === 'BANK_ACCOUNT' && (
                <label className="flex flex-col text-sm font-medium text-slate-700">
                  Confirm account number
                  <input
                    className="mt-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                    {...confirmAccountNumberRegister}
                  />
                  {errors.confirmAccountNumber && (
                    <span className="text-sm text-red-600">{errors.confirmAccountNumber.message}</span>
                  )}
                </label>
              )}

              <label className="flex flex-col text-sm font-medium text-slate-700">
                Nickname (optional)
                <input
                  className="mt-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                  {...register('nickname')}
                />
              </label>

              {selectedType !== 'BANK_ACCOUNT' && (
                <div className="grid gap-4 sm:grid-cols-3">
                  <label className="flex flex-col text-sm font-medium text-slate-700">
                    Expiration month
                    <input
                      className="mt-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                      placeholder="MM"
                      {...register('expMonth')}
                    />
                    {errors.expMonth && <span className="text-sm text-red-600">{errors.expMonth.message}</span>}
                  </label>
                  <label className="flex flex-col text-sm font-medium text-slate-700">
                    Expiration year
                    <input
                      className="mt-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                      placeholder="YYYY"
                      {...register('expYear')}
                    />
                    {errors.expYear && <span className="text-sm text-red-600">{errors.expYear.message}</span>}
                  </label>
                  <label className="flex flex-col text-sm font-medium text-slate-700">
                    CVV
                    <input
                      className="mt-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                      placeholder="CVV"
                      {...register('securityCode')}
                    />
                    {errors.securityCode && <span className="text-sm text-red-600">{errors.securityCode.message}</span>}
                  </label>
                </div>
              )}

              {selectedType !== 'BANK_ACCOUNT' && (
                <label className="flex flex-col text-sm font-medium text-slate-700">
                  Card brand (optional)
                  <input
                    className="mt-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                    {...register('brand')}
                  />
                </label>
              )}

              {selectedType === 'BANK_ACCOUNT' && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="flex flex-col text-sm font-medium text-slate-700 sm:col-span-2">
                    Account owner name
                    <input
                      className="mt-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                      {...register('ownerName')}
                    />
                    {errors.ownerName && <span className="text-sm text-red-600">{errors.ownerName.message}</span>}
                  </label>
                  <label className="flex flex-col text-sm font-medium text-slate-700">
                    Routing number
                    <input
                      className="mt-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                      {...register('routingNumber')}
                    />
                    {errors.routingNumber && <span className="text-sm text-red-600">{errors.routingNumber.message}</span>}
                  </label>
                  <label className="flex flex-col text-sm font-medium text-slate-700">
                    Account type
                    <select
                      className="mt-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                      {...register('accountType')}
                    >
                      <option value="CHECKING">Checking</option>
                      <option value="SAVINGS">Savings</option>
                      <option value="BUSINESS">Business checking</option>
                    </select>
                    {errors.accountType && <span className="text-sm text-red-600">{errors.accountType.message}</span>}
                  </label>
                </div>
              )}

              <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm">
                <p className="font-semibold text-slate-800">Billing address</p>
                <p className="mt-1 text-xs text-slate-500">
                  {profileAddress
                    ? `${profileAddress.line1}${profileAddress.line2 ? `, ${profileAddress.line2}` : ''}, ${[
                        profileAddress.city,
                        profileAddress.state,
                      ]
                        .filter(Boolean)
                        .join(', ')} ${profileAddress.postalCode}`
                    : 'Manage your profile to add an address we can reuse.'}
                </p>
                <div className="mt-3 space-y-2">
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="radio"
                      checked={useProfileBilling}
                      onChange={() => setValue('useProfileAddress', true)}
                    />
                    <span>Use profile address</span>
                  </label>
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="radio"
                      checked={!useProfileBilling}
                      onChange={() => setValue('useProfileAddress', false)}
                    />
                    <span>Use a different billing address</span>
                  </label>
                </div>

                {!useProfileBilling && (
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <label className="flex flex-col text-sm font-medium text-slate-700 sm:col-span-2">
                      Address line 1
                      <input
                        className="mt-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                        {...register('billingAddress.line1')}
                      />
                      {errors.billingAddress?.line1 && (
                        <span className="text-sm text-red-600">{errors.billingAddress.line1.message}</span>
                      )}
                    </label>
                    <label className="flex flex-col text-sm font-medium text-slate-700 sm:col-span-2">
                      Address line 2 (optional)
                      <input
                        className="mt-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                        {...register('billingAddress.line2')}
                      />
                    </label>
                    <label className="flex flex-col text-sm font-medium text-slate-700">
                      City
                      <input
                        className="mt-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                        {...register('billingAddress.city')}
                      />
                      {errors.billingAddress?.city && (
                        <span className="text-sm text-red-600">{errors.billingAddress.city.message}</span>
                      )}
                    </label>
                    <label className="flex flex-col text-sm font-medium text-slate-700">
                      State
                      <input
                        className="mt-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                        {...register('billingAddress.state')}
                      />
                      {errors.billingAddress?.state && (
                        <span className="text-sm text-red-600">{errors.billingAddress.state.message}</span>
                      )}
                    </label>
                    <label className="flex flex-col text-sm font-medium text-slate-700">
                      Postal code
                      <input
                        className="mt-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                        {...register('billingAddress.postalCode')}
                      />
                      {errors.billingAddress?.postalCode && (
                        <span className="text-sm text-red-600">{errors.billingAddress.postalCode.message}</span>
                      )}
                    </label>
                  </div>
                )}
              </div>

              <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
                <input type="checkbox" {...register('isDefault')} />
                <span>Set as default payment method</span>
              </label>

              <button
                type="submit"
                className="w-full rounded-full bg-brand px-6 py-2 text-sm font-semibold text-white shadow-sm transition-transform hover:-translate-y-0.5 hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60"
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? 'Saving…' : 'Save method'}
              </button>
              {createMutation.isError && (
                <div className="space-y-1 text-sm text-red-600">
                  <p>
                    {createMutation.error instanceof Error
                      ? createMutation.error.message
                      : 'Unable to save payment method'}
                  </p>
                  {extractValidationMessages(createMutation.error).map((message) => (
                    <p key={message} className="text-xs text-red-500">
                      {message}
                    </p>
                  ))}
                </div>
              )}
              {createMutation.isSuccess && !createMutation.isPending && (
                <p className="text-sm text-green-600">Payment method saved successfully.</p>
              )}
            </form>
          </div>
        </div>
      </div>
    </section>
  )
}

export default PaymentMethodsPanel
