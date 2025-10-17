import { type FormEvent, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createCustomerBiller,
  createCustomerPaymentMethod,
  deleteCustomerBiller,
  deleteCustomerPaymentMethod,
  fetchCustomer,
  searchCustomers,
  updateCustomerBiller,
  updateCustomerPaymentMethod,
  type BillerPayload,
  type CustomerDetail,
  type CustomerSummary,
  type PaymentMethodPayload,
  type PaymentMethodUpdatePayload,
} from './api/agent.js';
import { useAgentAuth } from './hooks/useAgentAuth.js';
import { LoginPage } from './pages/Login.js';

const defaultBiller: BillerPayload = {
  name: '',
  category: 'OTHER',
  accountId: '',
  contactInfo: '',
};

type PaymentDraft = {
  type: PaymentMethodPayload['type'];
  provider: string;
  accountNumber: string;
  nickname: string;
  cardholderName: string;
  brand: string;
  securityCode: string;
  expMonth: string;
  expYear: string;
  useProfileAddress: boolean;
  isDefault: boolean;
  billingAddress: {
    line1: string;
    line2: string;
    city: string;
    state: string;
    postalCode: string;
  };
};

const defaultPayment: PaymentDraft = {
  type: 'BANK_ACCOUNT',
  provider: '',
  accountNumber: '',
  nickname: '',
  cardholderName: '',
  brand: '',
  securityCode: '',
  expMonth: '',
  expYear: '',
  useProfileAddress: true,
  isDefault: false,
  billingAddress: {
    line1: '',
    line2: '',
    city: '',
    state: '',
    postalCode: '',
  },
};

export default function App() {
  const { token, agent, logout } = useAgentAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [billerDraft, setBillerDraft] = useState<BillerPayload>(defaultBiller);
  const [editingBillerId, setEditingBillerId] = useState<string | null>(null);
  const [paymentDraft, setPaymentDraft] = useState<PaymentDraft>({
    ...defaultPayment,
    billingAddress: { ...defaultPayment.billingAddress },
  });
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);

  const resetPaymentDraft = () =>
    setPaymentDraft({
      ...defaultPayment,
      billingAddress: { ...defaultPayment.billingAddress },
    });

  const customersQuery = useQuery({
    queryKey: ['agent-customers', searchTerm],
    queryFn: () => searchCustomers(token!, searchTerm || undefined),
    enabled: Boolean(token),
  });

  const customerQuery = useQuery({
    queryKey: ['agent-customer', selectedCustomerId],
    queryFn: () => fetchCustomer(token!, selectedCustomerId!),
    enabled: Boolean(token) && Boolean(selectedCustomerId),
  });

  const buildCreatePaymentPayload = (): PaymentMethodPayload => {
    const sanitizedAccount = paymentDraft.accountNumber.replace(/\s+/g, '');
    const expMonth = paymentDraft.expMonth ? Number(paymentDraft.expMonth) : undefined;
    const expYear = paymentDraft.expYear ? Number(paymentDraft.expYear) : undefined;

    return {
      type: paymentDraft.type,
      provider: paymentDraft.provider.trim(),
      accountNumber: sanitizedAccount,
      nickname: paymentDraft.nickname.trim() ? paymentDraft.nickname.trim() : undefined,
      cardholderName: paymentDraft.cardholderName.trim() ? paymentDraft.cardholderName.trim() : undefined,
      brand: paymentDraft.brand.trim() ? paymentDraft.brand.trim() : undefined,
      securityCode: paymentDraft.securityCode.trim() ? paymentDraft.securityCode.trim() : undefined,
      expMonth,
      expYear,
      useProfileAddress: paymentDraft.useProfileAddress,
      isDefault: paymentDraft.isDefault,
      billingAddress: paymentDraft.useProfileAddress
        ? undefined
        : {
            line1: paymentDraft.billingAddress.line1.trim(),
            line2: paymentDraft.billingAddress.line2.trim() || undefined,
            city: paymentDraft.billingAddress.city.trim(),
            state: paymentDraft.billingAddress.state.trim(),
            postalCode: paymentDraft.billingAddress.postalCode.trim(),
          },
    };
  };

  const buildUpdatePaymentPayload = (): PaymentMethodUpdatePayload => {
    const payload: PaymentMethodUpdatePayload = {
      provider: paymentDraft.provider.trim(),
      nickname: paymentDraft.nickname.trim() || undefined,
      cardholderName: paymentDraft.cardholderName.trim() || undefined,
      brand: paymentDraft.brand.trim() || undefined,
      securityCode: paymentDraft.securityCode.trim() || undefined,
      expMonth: paymentDraft.expMonth ? Number(paymentDraft.expMonth) : undefined,
      expYear: paymentDraft.expYear ? Number(paymentDraft.expYear) : undefined,
      useProfileAddress: paymentDraft.useProfileAddress,
      isDefault: paymentDraft.isDefault,
      billingAddress: paymentDraft.useProfileAddress
        ? undefined
        : {
            line1: paymentDraft.billingAddress.line1.trim(),
            line2: paymentDraft.billingAddress.line2.trim() || undefined,
            city: paymentDraft.billingAddress.city.trim(),
            state: paymentDraft.billingAddress.state.trim(),
            postalCode: paymentDraft.billingAddress.postalCode.trim(),
          },
    };

    const sanitizedAccount = paymentDraft.accountNumber.replace(/\s+/g, '');
    if (sanitizedAccount) {
      payload.accountNumber = sanitizedAccount;
    }

    return payload;
  };

  const billerMutation = useMutation({
    mutationFn: async (payload: { action: 'create' | 'update'; customerId: string; data: BillerPayload; billerId?: string }) => {
      if (payload.action === 'create') {
        return createCustomerBiller(token!, payload.customerId, payload.data);
      }
      return updateCustomerBiller(token!, payload.customerId, payload.billerId!, payload.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent-customer', selectedCustomerId] });
      setBillerDraft(defaultBiller);
      setEditingBillerId(null);
    },
  });

  const billerDeleteMutation = useMutation({
    mutationFn: (payload: { customerId: string; billerId: string }) =>
      deleteCustomerBiller(token!, payload.customerId, payload.billerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent-customer', selectedCustomerId] });
    },
  });

  const paymentMutation = useMutation({
    mutationFn: async (payload: { action: 'create' | 'update'; customerId: string; paymentMethodId?: string }) => {
      if (payload.action === 'create') {
        return createCustomerPaymentMethod(token!, payload.customerId, buildCreatePaymentPayload());
      }
      return updateCustomerPaymentMethod(
        token!,
        payload.customerId,
        payload.paymentMethodId!,
        buildUpdatePaymentPayload(),
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent-customer', selectedCustomerId] });
      resetPaymentDraft();
      setEditingPaymentId(null);
    },
  });

  const paymentDeleteMutation = useMutation({
    mutationFn: (payload: { customerId: string; paymentMethodId: string }) =>
      deleteCustomerPaymentMethod(token!, payload.customerId, payload.paymentMethodId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent-customer', selectedCustomerId] });
    },
  });

  const customers = useMemo(() => customersQuery.data ?? [], [customersQuery.data]);
  const customer = customerQuery.data ?? null;
  const isCard = paymentDraft.type !== 'BANK_ACCOUNT';

  if (!token || !agent) {
    return <LoginPage />;
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <h1>Agent console</h1>
          <p className="muted">On-call support for verified members</p>
        </div>
        <div className="action-row">
          <span>{agent.fullName ?? agent.username}</span>
          <button type="button" className="secondary" onClick={logout}>
            Sign out
          </button>
        </div>
      </header>
      <main className="app-main">
        <section className="panel">
          <h2>Search customers</h2>
          <input
            className="search"
            placeholder="Name, email, phone or customer number"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
          <CustomerList customers={customers} onSelect={setSelectedCustomerId} selectedId={selectedCustomerId} />
        </section>
        <section className="panel">
          <h2>Customer details</h2>
          {customer ? (
            <CustomerDetails
              customer={customer}
              onEditBiller={(biller) => {
                setEditingBillerId(biller.id);
                setBillerDraft({
                  name: biller.name,
                  category: biller.category as BillerPayload['category'],
                  accountId: biller.accountId,
                  contactInfo: biller.contactInfo ?? '',
                });
              }}
              onDeleteBiller={(billerId) =>
                billerDeleteMutation.mutate({ customerId: customer.id, billerId })
              }
              onEditPayment={(method) => {
                setEditingPaymentId(method.id);
                setPaymentDraft({
                  type: method.type as PaymentMethodPayload['type'],
                  provider: method.provider,
                  accountNumber: '',
                  nickname: method.nickname ?? '',
                  cardholderName: method.cardholderName ?? '',
                  brand: method.brand ?? '',
                  securityCode: '',
                  expMonth: method.expMonth != null ? String(method.expMonth) : '',
                  expYear: method.expYear != null ? String(method.expYear) : '',
                  useProfileAddress: !(
                    method.billingAddressLine1 ||
                    method.billingAddressLine2 ||
                    method.billingCity ||
                    method.billingState ||
                    method.billingPostalCode
                  ),
                  isDefault: method.isDefault,
                  billingAddress: {
                    line1: method.billingAddressLine1 ?? '',
                    line2: method.billingAddressLine2 ?? '',
                    city: method.billingCity ?? '',
                    state: method.billingState ?? '',
                    postalCode: method.billingPostalCode ?? '',
                  },
                });
              }}
              onDeletePayment={(paymentMethodId) =>
                paymentDeleteMutation.mutate({ customerId: customer.id, paymentMethodId })
              }
            />
          ) : (
            <p className="muted">Search and select a customer to begin.</p>
          )}
        </section>
        {customer && (
          <section className="panel">
            <h2>{editingBillerId ? 'Update biller' : 'Add biller'}</h2>
            <form
              className="form-grid"
              onSubmit={(event) => {
                event.preventDefault();
                const payload: BillerPayload = {
                  name: billerDraft.name,
                  category: billerDraft.category,
                  accountId: billerDraft.accountId,
                  contactInfo: billerDraft.contactInfo?.trim() || undefined,
                };
                billerMutation.mutate({
                  action: editingBillerId ? 'update' : 'create',
                  customerId: customer.id,
                  billerId: editingBillerId ?? undefined,
                  data: payload,
                });
              }}
            >
              <label>
                Name
                <input
                  value={billerDraft.name}
                  onChange={(event) => setBillerDraft((prev) => ({ ...prev, name: event.target.value }))}
                  required
                />
              </label>
              <label>
                Category
                <select
                  value={billerDraft.category}
                  onChange={(event) =>
                    setBillerDraft((prev) => ({ ...prev, category: event.target.value as BillerPayload['category'] }))
                  }
                >
                  <option value="INTERNET">Internet</option>
                  <option value="TV">TV</option>
                  <option value="ELECTRIC">Electric</option>
                  <option value="MOBILE">Mobile</option>
                  <option value="HOME">Home</option>
                  <option value="INSURANCE">Insurance</option>
                  <option value="OTHER">Other</option>
                </select>
              </label>
              <label>
                Account ID
                <input
                  value={billerDraft.accountId}
                  onChange={(event) => setBillerDraft((prev) => ({ ...prev, accountId: event.target.value }))}
                  required
                />
              </label>
              <label>
                Contact notes
                <input
                  value={billerDraft.contactInfo ?? ''}
                  onChange={(event) => setBillerDraft((prev) => ({ ...prev, contactInfo: event.target.value }))}
                />
              </label>
              <div className="inline-actions">
                <button type="submit" className="primary" disabled={billerMutation.isPending}>
                  {billerMutation.isPending ? 'Saving…' : editingBillerId ? 'Update biller' : 'Add biller'}
                </button>
                {editingBillerId && (
                  <button
                    type="button"
                    className="secondary"
                    onClick={() => {
                      setEditingBillerId(null);
                      setBillerDraft(defaultBiller);
                    }}
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </section>
        )}
        {customer && (
          <section className="panel">
            <h2>{editingPaymentId ? 'Update payment method' : 'Add payment method'}</h2>
            <form
              className="form-grid"
              onSubmit={(event: FormEvent<HTMLFormElement>) => {
                event.preventDefault();
                paymentMutation.mutate(
                  editingPaymentId
                    ? {
                        action: 'update',
                        customerId: customer.id,
                        paymentMethodId: editingPaymentId,
                      }
                    : { action: 'create', customerId: customer.id },
                );
              }}
            >
              <label>
                Type
                <select
                  value={paymentDraft.type}
                  disabled={Boolean(editingPaymentId)}
                  onChange={(event) => {
                    const nextType = event.target.value as PaymentMethodPayload['type'];
                    setPaymentDraft((prev) => ({
                      ...prev,
                      type: nextType,
                      cardholderName: nextType === 'BANK_ACCOUNT' ? '' : prev.cardholderName,
                      brand: nextType === 'BANK_ACCOUNT' ? '' : prev.brand,
                      securityCode: nextType === 'BANK_ACCOUNT' ? '' : prev.securityCode,
                      expMonth: nextType === 'BANK_ACCOUNT' ? '' : prev.expMonth,
                      expYear: nextType === 'BANK_ACCOUNT' ? '' : prev.expYear,
                      useProfileAddress: nextType === 'BANK_ACCOUNT' ? true : prev.useProfileAddress,
                      billingAddress:
                        nextType === 'BANK_ACCOUNT'
                          ? { ...defaultPayment.billingAddress }
                          : prev.billingAddress,
                    }));
                  }}
                >
                  <option value="BANK_ACCOUNT">Bank account</option>
                  <option value="CREDIT_CARD">Credit card</option>
                  <option value="DEBIT_CARD">Debit card</option>
                </select>
              </label>
              <label>
                Provider
                <input
                  value={paymentDraft.provider}
                  onChange={(event) => setPaymentDraft((prev) => ({ ...prev, provider: event.target.value }))}
                  required
                />
              </label>
              <label>
                Account number
                <input
                  value={paymentDraft.accountNumber}
                  onChange={(event) => setPaymentDraft((prev) => ({ ...prev, accountNumber: event.target.value }))}
                  placeholder={editingPaymentId ? 'Leave blank to keep current' : ''}
                  required={!editingPaymentId}
                />
              </label>
              <label>
                Nickname
                <input
                  value={paymentDraft.nickname}
                  onChange={(event) => setPaymentDraft((prev) => ({ ...prev, nickname: event.target.value }))}
                />
              </label>
              {isCard && (
                <>
                  <label>
                    Cardholder name
                    <input
                      value={paymentDraft.cardholderName}
                      onChange={(event) => setPaymentDraft((prev) => ({ ...prev, cardholderName: event.target.value }))}
                      required={isCard}
                    />
                  </label>
                  <label>
                    Brand
                    <input
                      value={paymentDraft.brand}
                      onChange={(event) => setPaymentDraft((prev) => ({ ...prev, brand: event.target.value }))}
                    />
                  </label>
                  <label>
                    Expiration month
                    <input
                      type="number"
                      min={1}
                      max={12}
                      value={paymentDraft.expMonth}
                      onChange={(event) => setPaymentDraft((prev) => ({ ...prev, expMonth: event.target.value }))}
                      required={isCard}
                    />
                  </label>
                  <label>
                    Expiration year
                    <input
                      type="number"
                      min={new Date().getFullYear()}
                      max={new Date().getFullYear() + 15}
                      value={paymentDraft.expYear}
                      onChange={(event) => setPaymentDraft((prev) => ({ ...prev, expYear: event.target.value }))}
                      required={isCard}
                    />
                  </label>
                  <label>
                    Security code
                    <input
                      value={paymentDraft.securityCode}
                      onChange={(event) => setPaymentDraft((prev) => ({ ...prev, securityCode: event.target.value }))}
                      required={isCard}
                    />
                  </label>
                  <label className="checkbox">
                    <input
                      type="checkbox"
                      checked={paymentDraft.useProfileAddress}
                      onChange={(event) =>
                        setPaymentDraft((prev) => ({ ...prev, useProfileAddress: event.target.checked }))
                      }
                    />
                    Use profile billing address
                  </label>
                  {!paymentDraft.useProfileAddress && (
                    <>
                      <label>
                        Billing address line 1
                        <input
                          value={paymentDraft.billingAddress.line1}
                          onChange={(event) =>
                            setPaymentDraft((prev) => ({
                              ...prev,
                              billingAddress: { ...prev.billingAddress, line1: event.target.value },
                            }))
                          }
                          required={!paymentDraft.useProfileAddress}
                        />
                      </label>
                      <label>
                        Billing address line 2
                        <input
                          value={paymentDraft.billingAddress.line2}
                          onChange={(event) =>
                            setPaymentDraft((prev) => ({
                              ...prev,
                              billingAddress: { ...prev.billingAddress, line2: event.target.value },
                            }))
                          }
                        />
                      </label>
                      <label>
                        City
                        <input
                          value={paymentDraft.billingAddress.city}
                          onChange={(event) =>
                            setPaymentDraft((prev) => ({
                              ...prev,
                              billingAddress: { ...prev.billingAddress, city: event.target.value },
                            }))
                          }
                          required={!paymentDraft.useProfileAddress}
                        />
                      </label>
                      <label>
                        State
                        <input
                          value={paymentDraft.billingAddress.state}
                          onChange={(event) =>
                            setPaymentDraft((prev) => ({
                              ...prev,
                              billingAddress: { ...prev.billingAddress, state: event.target.value },
                            }))
                          }
                          required={!paymentDraft.useProfileAddress}
                        />
                      </label>
                      <label>
                        Postal code
                        <input
                          value={paymentDraft.billingAddress.postalCode}
                          onChange={(event) =>
                            setPaymentDraft((prev) => ({
                              ...prev,
                              billingAddress: { ...prev.billingAddress, postalCode: event.target.value },
                            }))
                          }
                          required={!paymentDraft.useProfileAddress}
                        />
                      </label>
                    </>
                  )}
                </>
              )}
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={paymentDraft.isDefault}
                  onChange={(event) => setPaymentDraft((prev) => ({ ...prev, isDefault: event.target.checked }))}
                />
                Make default payment method
              </label>
              <div className="inline-actions">
                <button type="submit" className="primary" disabled={paymentMutation.isPending}>
                  {paymentMutation.isPending ? 'Saving…' : editingPaymentId ? 'Update method' : 'Add method'}
                </button>
                {editingPaymentId && (
                  <button
                    type="button"
                    className="secondary"
                    onClick={() => {
                      setEditingPaymentId(null);
                      resetPaymentDraft();
                    }}
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </section>
        )}
      </main>
    </div>
  );
}

function CustomerList({
  customers,
  onSelect,
  selectedId,
}: {
  customers: CustomerSummary[];
  onSelect: (id: string) => void;
  selectedId: string | null;
}) {
  if (customers.length === 0) {
    return <p className="muted">No customers match the current search.</p>;
  }
  return (
    <ul className="list">
      {customers.map((customer) => (
        <li key={customer.id}>
          <button
            type="button"
            className={selectedId === customer.id ? 'list-item active' : 'list-item'}
            onClick={() => onSelect(customer.id)}
          >
            <strong>
              {customer.firstName} {customer.lastName}
            </strong>
            <div className="muted">{customer.email}</div>
            <div className="muted">Customer #: {customer.customerNumber}</div>
          </button>
        </li>
      ))}
    </ul>
  );
}

function CustomerDetails({
  customer,
  onEditBiller,
  onDeleteBiller,
  onEditPayment,
  onDeletePayment,
}: {
  customer: CustomerDetail;
  onEditBiller: (biller: CustomerDetail['billers'][number]) => void;
  onDeleteBiller: (billerId: string) => void;
  onEditPayment: (method: CustomerDetail['paymentMethods'][number]) => void;
  onDeletePayment: (paymentMethodId: string) => void;
}) {
  return (
    <div className="detail-card">
      <h3>
        {customer.firstName} {customer.lastName}
      </h3>
      <p className="muted">Customer #: {customer.customerNumber}</p>
      <div className="detail-grid">
        <div className="stack">
          <strong>Profile</strong>
          <span>{customer.email}</span>
          {customer.phone && <span>{customer.phone}</span>}
          <span>{customer.addressLine1}</span>
          {customer.addressLine2 && <span>{customer.addressLine2}</span>}
          <span>
            {customer.city}, {customer.state} {customer.postalCode}
          </span>
        </div>
        <div className="stack">
          <strong>Billers</strong>
          <ul className="pill-list">
            {customer.billers.map((biller) => (
              <li key={biller.id}>
                <div className="stack">
                  <span>{biller.name}</span>
                  <span className="muted">Account: {biller.accountId}</span>
                  <div className="inline-actions">
                    <button type="button" className="secondary" onClick={() => onEditBiller(biller)}>
                      Edit
                    </button>
                    <button type="button" className="secondary" onClick={() => onDeleteBiller(biller.id)}>
                      Delete
                    </button>
                  </div>
                </div>
              </li>
            ))}
            {customer.billers.length === 0 && <li>No billers on file.</li>}
          </ul>
        </div>
        <div className="stack">
          <strong>Payment methods</strong>
          <ul className="pill-list">
              {customer.paymentMethods.map((method) => (
                <li key={method.id}>
                  <div className="stack">
                    <span>{method.nickname ?? method.provider}</span>
                    <span className="muted">{method.type.replace('_', ' ')} · **** {method.last4}</span>
                    {method.cardholderName && <span className="muted">{method.cardholderName}</span>}
                    {method.brand && <span className="muted">{method.brand}</span>}
                    {method.isDefault && <span className="muted">Default method</span>}
                    <div className="inline-actions">
                      <button type="button" className="secondary" onClick={() => onEditPayment(method)}>
                        Edit
                      </button>
                    <button type="button" className="secondary" onClick={() => onDeletePayment(method.id)}>
                      Delete
                    </button>
                  </div>
                </div>
              </li>
            ))}
            {customer.paymentMethods.length === 0 && <li>No payment methods on file.</li>}
          </ul>
        </div>
      </div>
    </div>
  );
}
