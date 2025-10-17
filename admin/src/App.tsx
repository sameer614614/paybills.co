import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAdminAuth } from './hooks/useAdminAuth.js';
import { LoginPage } from './pages/Login.js';
import {
  createAgent,
  deleteAgent,
  fetchAgents,
  fetchBillers,
  fetchCustomer,
  fetchCustomers,
  fetchTransactions,
  updateAgent,
  type AgentSummary,
  type BillerRecord,
  type CustomerDetail,
  type CustomerSummary,
  type TransactionRecord,
} from './api/admin.js';

export default function App() {
  const { token, admin, logout } = useAdminAuth();
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [transactionSearch, setTransactionSearch] = useState('');
  const [billerSearch, setBillerSearch] = useState('');

  const { data: agents } = useQuery({
    queryKey: ['agents'],
    queryFn: () => fetchAgents(token!),
    enabled: Boolean(token),
  });

  const { data: customers } = useQuery({
    queryKey: ['customers', customerSearch],
    queryFn: () => fetchCustomers(token!, customerSearch || undefined),
    enabled: Boolean(token),
  });

  const { data: selectedCustomer } = useQuery({
    queryKey: ['customer', selectedCustomerId],
    queryFn: () => fetchCustomer(token!, selectedCustomerId!),
    enabled: Boolean(token) && Boolean(selectedCustomerId),
  });

  const { data: transactions } = useQuery({
    queryKey: ['transactions', transactionSearch],
    queryFn: () => fetchTransactions(token!, transactionSearch || undefined),
    enabled: Boolean(token),
  });

  const { data: billers } = useQuery({
    queryKey: ['billers', billerSearch],
    queryFn: () => fetchBillers(token!, billerSearch || undefined),
    enabled: Boolean(token),
  });

  const flattenedAgents = useMemo(() => agents ?? [], [agents]);

  if (!token || !admin) {
    return <LoginPage />;
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <h1>Pay Bills With Us · Admin</h1>
          <p>Signed in as {admin.username}. Host-restricted access enforced.</p>
        </div>
        <button type="button" onClick={logout} className="secondary">
          Sign out
        </button>
      </header>
      <main className="app-main">
        <section className="panel">
          <header className="panel-header">
            <div>
              <h2>Agents</h2>
              <p>Provision and monitor active call center agents.</p>
            </div>
          </header>
          <AgentManager agents={flattenedAgents} token={token} />
        </section>

        <section className="panel">
          <header className="panel-header">
            <div>
              <h2>Customers</h2>
              <p>Search by name, email, phone, or customer number to open the profile.</p>
            </div>
            <input
              className="search"
              placeholder="Search customers"
              value={customerSearch}
              onChange={(event) => setCustomerSearch(event.target.value)}
            />
          </header>
          <div className="two-column">
            <div className="column">
              <CustomerList customers={customers ?? []} onSelect={setSelectedCustomerId} selectedId={selectedCustomerId} />
            </div>
            <div className="column">
              {selectedCustomer ? <CustomerDetailPanel customer={selectedCustomer} /> : <p>Select a customer to view details.</p>}
            </div>
          </div>
        </section>

        <section className="panel">
          <header className="panel-header">
            <div>
              <h2>Transactions</h2>
              <p>Audit payment history by customer or confirmation number.</p>
            </div>
            <input
              className="search"
              placeholder="Filter transactions"
              value={transactionSearch}
              onChange={(event) => setTransactionSearch(event.target.value)}
            />
          </header>
          <TransactionTable transactions={transactions ?? []} />
        </section>

        <section className="panel">
          <header className="panel-header">
            <div>
              <h2>Billers</h2>
              <p>Review the payee network and the customer accounts tied to each vendor.</p>
            </div>
            <input
              className="search"
              placeholder="Search billers"
              value={billerSearch}
              onChange={(event) => setBillerSearch(event.target.value)}
            />
          </header>
          <BillerTable billers={billers ?? []} />
        </section>
      </main>
    </div>
  );
}

function AgentManager({ agents, token }: { agents: AgentSummary[]; token: string }) {
  const queryClient = useQueryClient();
  const [drafts, setDrafts] = useState<Record<string, { fullName: string; email: string; phone: string; password: string }>>({});
  const [createForm, setCreateForm] = useState({
    username: '',
    password: '',
    fullName: '',
    email: '',
    phone: '',
  });

  useEffect(() => {
    setDrafts((prev) => {
      const next: Record<string, { fullName: string; email: string; phone: string; password: string }> = {};
      agents.forEach((agent) => {
        next[agent.id] = prev[agent.id] ?? {
          fullName: agent.fullName,
          email: agent.email ?? '',
          phone: agent.phone ?? '',
          password: '',
        };
      });
      return next;
    });
  }, [agents]);

  const createMutation = useMutation({
    mutationFn: (payload: {
      username: string;
      password: string;
      fullName: string;
      email?: string;
      phone?: string;
    }) => createAgent(token, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
      setCreateForm({ username: '', password: '', fullName: '', email: '', phone: '' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (payload: {
      id: string;
      data: { fullName?: string; email?: string | null; phone?: string | null; password?: string };
    }) => updateAgent(token, payload.id, payload.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteAgent(token, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
    },
  });

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const payload = {
      username: createForm.username.trim(),
      password: createForm.password,
      fullName: createForm.fullName.trim(),
      email: createForm.email.trim() ? createForm.email.trim() : undefined,
      phone: createForm.phone.trim() ? createForm.phone.trim() : undefined,
    };
    await createMutation.mutateAsync(payload);
  }

  async function handleSave(id: string) {
    const draft = drafts[id];
    if (!draft) return;
    await updateMutation.mutateAsync({
      id,
      data: {
        fullName: draft.fullName.trim() || undefined,
        email: draft.email.trim() ? draft.email.trim() : null,
        phone: draft.phone.trim() ? draft.phone.trim() : null,
        password: draft.password.trim() ? draft.password.trim() : undefined,
      },
    });
    setDrafts((prev) => ({
      ...prev,
      [id]: { ...prev[id], password: '' },
    }));
  }

  async function handleDelete(id: string) {
    await deleteMutation.mutateAsync(id);
  }

  return (
    <div className="agent-manager">
      {agents.length === 0 ? (
        <p>No agents provisioned yet.</p>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Username</th>
                <th>Name</th>
                <th>Contact</th>
                <th>Customers</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {agents.map((agent) => {
                const draft = drafts[agent.id] ?? { fullName: '', email: '', phone: '', password: '' };
                return (
                  <tr key={agent.id}>
                    <td>{agent.username}</td>
                    <td>
                      <input
                        value={draft.fullName}
                        onChange={(event) =>
                          setDrafts((prev) => ({
                            ...prev,
                            [agent.id]: { ...draft, fullName: event.target.value },
                          }))
                        }
                        required
                      />
                    </td>
                    <td>
                      <div className="stack">
                        <input
                          placeholder="Email"
                          value={draft.email}
                          onChange={(event) =>
                            setDrafts((prev) => ({
                              ...prev,
                              [agent.id]: { ...draft, email: event.target.value },
                            }))
                          }
                          type="email"
                        />
                        <input
                          placeholder="Phone"
                          value={draft.phone}
                          onChange={(event) =>
                            setDrafts((prev) => ({
                              ...prev,
                              [agent.id]: { ...draft, phone: event.target.value },
                            }))
                          }
                        />
                        <input
                          placeholder="New password"
                          type="password"
                          value={draft.password}
                          onChange={(event) =>
                            setDrafts((prev) => ({
                              ...prev,
                              [agent.id]: { ...draft, password: event.target.value },
                            }))
                          }
                        />
                      </div>
                    </td>
                    <td>
                      <ul className="pill-list">
                        {agent.customers.map(({ user }) => (
                          <li key={user.id}>
                            {user.firstName} {user.lastName} · {user.customerNumber}
                          </li>
                        ))}
                        {agent.customers.length === 0 && <li>No assignments</li>}
                      </ul>
                    </td>
                    <td className="agent-actions">
                      <button
                        type="button"
                        onClick={() => handleSave(agent.id)}
                        disabled={updateMutation.isPending && updateMutation.variables?.id === agent.id}
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        className="danger"
                        onClick={() => handleDelete(agent.id)}
                        disabled={deleteMutation.isPending && deleteMutation.variables === agent.id}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <form className="agent-form" onSubmit={handleCreate}>
        <h3>Invite new agent</h3>
        <div className="agent-form-grid">
          <label>
            <span>Username</span>
            <input value={createForm.username} onChange={(event) => setCreateForm((prev) => ({ ...prev, username: event.target.value }))} required />
          </label>
          <label>
            <span>Full name</span>
            <input value={createForm.fullName} onChange={(event) => setCreateForm((prev) => ({ ...prev, fullName: event.target.value }))} required />
          </label>
          <label>
            <span>Password</span>
            <input type="password" value={createForm.password} onChange={(event) => setCreateForm((prev) => ({ ...prev, password: event.target.value }))} required />
          </label>
          <label>
            <span>Email</span>
            <input value={createForm.email} onChange={(event) => setCreateForm((prev) => ({ ...prev, email: event.target.value }))} />
          </label>
          <label>
            <span>Phone</span>
            <input value={createForm.phone} onChange={(event) => setCreateForm((prev) => ({ ...prev, phone: event.target.value }))} />
          </label>
        </div>
        {createMutation.error && <p className="error">{createMutation.error instanceof Error ? createMutation.error.message : 'Unable to create agent'}</p>}
        <button type="submit" disabled={createMutation.isPending}>
          {createMutation.isPending ? 'Creating…' : 'Create agent'}
        </button>
      </form>
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
    return <p>No customers match the current search.</p>;
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
            <span className="list-title">
              {customer.firstName} {customer.lastName}
            </span>
            <span className="list-subtitle">{customer.email}</span>
            <span className="list-subtitle">Customer #: {customer.customerNumber}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

function CustomerDetailPanel({ customer }: { customer: CustomerDetail }) {
  return (
    <div className="detail">
      <h3>
        {customer.firstName} {customer.lastName}
      </h3>
      <p className="muted">Customer #: {customer.customerNumber}</p>
      <div className="detail-grid">
        <div>
          <h4>Profile</h4>
          <p>{customer.email}</p>
          {customer.phone && <p>{customer.phone}</p>}
          <p>{customer.addressLine1}</p>
          {customer.addressLine2 && <p>{customer.addressLine2}</p>}
          <p>
            {customer.city}, {customer.state} {customer.postalCode}
          </p>
        </div>
        <div>
          <h4>Payment methods</h4>
          {customer.paymentMethods.length === 0 ? (
            <p className="muted">No payment methods on file.</p>
          ) : (
            <ul className="pill-list">
              {customer.paymentMethods.map((method) => (
                <li key={method.id}>
                  {method.nickname ?? method.provider} · {method.type.replace('_', ' ')} · ****{method.last4}{' '}
                  {method.isDefault ? '(default)' : ''}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      <div className="detail-grid">
        <div>
          <h4>Billers</h4>
          {customer.billers.length === 0 ? (
            <p className="muted">No billers assigned.</p>
          ) : (
            <ul className="pill-list">
              {customer.billers.map((biller) => (
                <li key={biller.id}>
                  {biller.name} ({biller.accountId})
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <h4>Recent receipts</h4>
          {customer.receipts.length === 0 ? (
            <p className="muted">No receipts recorded.</p>
          ) : (
            <ul className="pill-list">
              {customer.receipts.slice(0, 5).map((receipt) => (
                <li key={receipt.id}>
                  {receipt.biller.name} · ${Number(receipt.amount).toFixed(2)} · {new Date(receipt.paidOn).toLocaleDateString()}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function TransactionTable({ transactions }: { transactions: TransactionRecord[] }) {
  if (transactions.length === 0) {
    return <p>No transactions found for the current criteria.</p>;
  }
  return (
    <div className="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>Paid on</th>
            <th>Customer</th>
            <th>Biller</th>
            <th>Amount</th>
            <th>Confirmation</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((transaction) => (
            <tr key={transaction.id}>
              <td>{new Date(transaction.paidOn).toLocaleString()}</td>
              <td>
                <div className="stack">
                  <span>
                    {transaction.user.firstName} {transaction.user.lastName}
                  </span>
                  <span className="muted">Customer #: {transaction.user.customerNumber}</span>
                </div>
              </td>
              <td>{transaction.biller.name}</td>
              <td>${Number(transaction.amount).toFixed(2)}</td>
              <td>{transaction.confirmation}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BillerTable({ billers }: { billers: BillerRecord[] }) {
  if (billers.length === 0) {
    return <p>No billers matched the search input.</p>;
  }

  return (
    <div className="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>Biller</th>
            <th>Account ID</th>
            <th>Category</th>
            <th>Customer</th>
          </tr>
        </thead>
        <tbody>
          {billers.map((biller) => (
            <tr key={biller.id}>
              <td>
                <div className="stack">
                  <span>{biller.name}</span>
                  {biller.contactInfo && <span className="muted">{biller.contactInfo}</span>}
                </div>
              </td>
              <td>{biller.accountId}</td>
              <td>{biller.category}</td>
              <td>
                {biller.user.firstName} {biller.user.lastName} · {biller.user.customerNumber}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
