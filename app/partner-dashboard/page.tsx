'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../lib/auth/AuthProvider';
import { createClient } from '../lib/supabase/client';
import TopBar from '../components/TopBar';
import { Users, Loader2, UserPlus, X, Mail, Send, Trash2, Copy, Check, CreditCard } from 'lucide-react';

interface PartnerData {
  id: string;
  name: string;
  created_at: string;
  metadata: any;
}

interface CustomerLink {
  id: number;
  customer_id: string;
  created_at: string;
  metadata: any;
  customer_email?: string;
}

export default function PartnerDashboard() {
  const { user } = useAuth();
  const [partnerData, setPartnerData] = useState<PartnerData | null>(null);
  const [customers, setCustomers] = useState<CustomerLink[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteForm, setInviteForm] = useState({ name: '', email: '' });
  const [isSending, setIsSending] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<CustomerLink | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [resendingId, setResendingId] = useState<number | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  useEffect(() => {
    async function loadPartnerData() {
      if (!user) return;

      try {
        const supabase = createClient();

        // Get partner data
        const { data: partner, error: partnerError } = await supabase
          .from('partners')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (partnerError) {
          console.error('Error loading partner:', partnerError);
          return;
        }

        setPartnerData(partner);

        // Get customers with details from API
        const customersResponse = await fetch(`/api/partners/customers?partner_id=${partner.id}`);
        
        if (!customersResponse.ok) {
          console.error('Error loading customers');
          return;
        }

        const customersData = await customersResponse.json();
        setCustomers(customersData.customers || []);
      } catch (err) {
        console.error('Unexpected error:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadPartnerData();
  }, [user]);

  const handleInviteCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partnerData) return;

    setIsSending(true);
    try {
      const response = await fetch('/api/partners/invite-customer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          partner_id: partnerData.id,
          name: inviteForm.name,
          email: inviteForm.email,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send invitation');
      }

      setInviteSuccess(true);
      setInviteForm({ name: '', email: '' });
      
      // Reload customer list
      const customersResponse = await fetch(`/api/partners/customers?partner_id=${partnerData.id}`);
      if (customersResponse.ok) {
        const customersData = await customersResponse.json();
        setCustomers(customersData.customers || []);
      }
      
      // Close dialog after 2 seconds
      setTimeout(() => {
        setShowInviteDialog(false);
        setInviteSuccess(false);
      }, 2000);
    } catch (error) {
      console.error('Error sending invitation:', error);
      alert('Failed to send invitation. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  const handleResendInvite = async (customer: CustomerLink) => {
    if (!partnerData) return;

    setResendingId(customer.id);
    try {
      const response = await fetch('/api/partners/resend-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: customer.customer_id,
          partner_id: partnerData.id,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to resend invitation');
      }

      // Show success icon for 3 seconds
      setTimeout(() => setResendingId(null), 3000);
    } catch (error) {
      console.error('Error resending invitation:', error);
      alert('Failed to resend invitation. Please try again.');
      setResendingId(null);
    }
  };

  const handleDeleteCustomer = async () => {
    if (!customerToDelete) return;

    setIsDeleting(true);
    try {
      const response = await fetch('/api/partners/delete-customer', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          link_id: customerToDelete.id,
          customer_id: customerToDelete.customer_id,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to delete customer');
      }

      // Update local state
      setCustomers(customers.filter(c => c.id !== customerToDelete.id));
      setShowDeleteDialog(false);
      setCustomerToDelete(null);
    } catch (error) {
      console.error('Error deleting customer:', error);
      alert('Failed to delete customer. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCopyCustomerInfo = async (customer: CustomerLink) => {
    const info = `Name: ${customer.metadata?.name || 'N/A'}
Email: ${customer.metadata?.email || customer.customer_email || 'N/A'}
Customer ID: ${customer.customer_id}`;
    
    try {
      await navigator.clipboard.writeText(info);
      setCopiedId(customer.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
      alert('Failed to copy to clipboard');
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-screen overflow-hidden">
        <TopBar />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 size={32} className="animate-spin" style={{ color: 'var(--accent-primary)' }} />
        </div>
      </div>
    );
  }

  if (!partnerData) {
    return (
      <div className="flex flex-col h-screen overflow-hidden">
        <TopBar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
              Partner account not found
            </h2>
            <p style={{ color: 'var(--text-secondary)' }}>
              Please contact support if you believe this is an error.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <TopBar />
      
      <div className="flex-1 overflow-auto" style={{ background: 'var(--bg-primary)' }}>
        <div className="max-w-7xl mx-auto p-8">
          {/* Header */}
          <div className="mb-8 flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
                Partner Dashboard
              </h1>
              <p className="mb-1" style={{ color: 'var(--text-secondary)' }}>
                Welcome back, {partnerData.name}
              </p>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                Your plan is <span className="font-semibold" style={{ color: 'var(--text-secondary)' }}>standard</span> with €10.90/month for the first customer and €7.90/month for subsequent customers (VAT excluded)
              </p>
            </div>
            <button
              className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors text-sm font-medium"
              style={{ 
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-default)',
                color: 'var(--text-primary)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--bg-hover)';
                e.currentTarget.style.borderColor = 'var(--border-subtle)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'var(--bg-secondary)';
                e.currentTarget.style.borderColor = 'var(--border-default)';
              }}
            >
              <CreditCard size={16} />
              Configure Billing
            </button>
          </div>

          {/* Customers Table */}
          <div 
            className="rounded-xl border overflow-hidden"
            style={{ 
              background: 'var(--bg-secondary)', 
              borderColor: 'var(--border-subtle)' 
            }}
          >
            <div className="p-6 border-b flex items-start justify-between" style={{ borderColor: 'var(--border-subtle)' }}>
              <div>
                <h2 className="text-base font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                  Your Customers
                </h2>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  Invite new customers to use Vetrinae. The first 30 days are free for every new customer!
                </p>
              </div>
              <button
                onClick={() => setShowInviteDialog(true)}
                className="btn-primary flex items-center gap-2 text-sm px-4 py-2 rounded-lg transition-all"
                style={{ background: 'var(--accent-primary)', color: 'white' }}
              >
                <UserPlus size={16} />
                Invite Customer
              </button>
            </div>
            
            {customers.length === 0 ? (
              <div className="p-12 text-center">
                <Users size={48} className="mx-auto mb-4 opacity-30" style={{ color: 'var(--text-muted)' }} />
                <h3 className="text-lg font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                  No customers yet
                </h3>
                <p style={{ color: 'var(--text-secondary)' }}>
                  Start adding customers to see them here
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <th className="text-left p-4 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                        Name
                      </th>
                      <th className="text-left p-4 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                        Email
                      </th>
                      <th className="text-left p-4 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                        Customer ID
                      </th>
                      <th className="text-left p-4 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                        Added Date
                      </th>
                      <th className="text-left p-4 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                        Status
                      </th>
                      <th className="text-left p-4 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {customers.map((customer) => (
                      <tr 
                        key={customer.id}
                        style={{ borderBottom: '1px solid var(--border-subtle)' }}
                      >
                        <td className="p-4 text-sm" style={{ color: 'var(--text-primary)' }}>
                          {customer.metadata?.name || 'N/A'}
                        </td>
                        <td className="p-4 text-sm" style={{ color: 'var(--text-secondary)' }}>
                          {customer.metadata?.email || customer.customer_email || 'N/A'}
                        </td>
                        <td className="p-4 text-sm font-mono" style={{ color: 'var(--text-primary)' }}>
                          {customer.customer_id.slice(0, 8)}...
                        </td>
                        <td className="p-4 text-sm" style={{ color: 'var(--text-secondary)' }}>
                          {new Date(customer.created_at).toLocaleDateString()}
                        </td>
                        <td className="p-4">
                          <span 
                            className="px-3 py-1 rounded-full text-xs font-medium"
                            style={{ 
                              background: 'rgba(34, 197, 94, 0.1)', 
                              color: 'var(--accent-success)' 
                            }}
                          >
                            Active
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleCopyCustomerInfo(customer)}
                              className="p-2 rounded-lg transition-colors"
                              style={{ 
                                color: copiedId === customer.id ? 'var(--accent-success)' : 'var(--text-secondary)',
                                background: copiedId === customer.id ? 'var(--bg-hover)' : 'transparent'
                              }}
                              title="Copy customer info"
                              onMouseEnter={(e) => {
                                if (copiedId !== customer.id) {
                                  e.currentTarget.style.background = 'var(--bg-hover)';
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (copiedId !== customer.id) {
                                  e.currentTarget.style.background = 'transparent';
                                }
                              }}
                            >
                              {copiedId === customer.id ? (
                                <Check size={16} />
                              ) : (
                                <Copy size={16} />
                              )}
                            </button>
                            <button
                              onClick={() => handleResendInvite(customer)}
                              disabled={resendingId === customer.id}
                              className="p-2 rounded-lg transition-colors"
                              style={{ 
                                color: resendingId === customer.id ? 'var(--accent-success)' : 'var(--accent-primary)',
                                background: resendingId === customer.id ? 'var(--bg-hover)' : 'transparent'
                              }}
                              title="Resend invitation"
                              onMouseEnter={(e) => {
                                if (resendingId !== customer.id) {
                                  e.currentTarget.style.background = 'var(--bg-hover)';
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (resendingId !== customer.id) {
                                  e.currentTarget.style.background = 'transparent';
                                }
                              }}
                            >
                              {resendingId === customer.id ? (
                                <Check size={16} />
                              ) : (
                                <Send size={16} />
                              )}
                            </button>
                            <button
                              onClick={() => {
                                setCustomerToDelete(customer);
                                setShowDeleteDialog(true);
                              }}
                              className="p-2 rounded-lg transition-colors"
                              style={{ color: 'var(--accent-error)' }}
                              title="Delete customer"
                              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
                              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Invite Customer Dialog */}
      {showInviteDialog && (
        <>
          <div 
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => !isSending && setShowInviteDialog(false)}
          />
          <div 
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md rounded-xl shadow-2xl z-50 p-6"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                Invite New Customer
              </h3>
              <button
                onClick={() => setShowInviteDialog(false)}
                disabled={isSending}
                className="p-1 rounded-lg transition-colors"
                style={{ color: 'var(--text-secondary)' }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <X size={20} />
              </button>
            </div>

            {inviteSuccess ? (
              <div className="py-8 text-center">
                <div 
                  className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
                  style={{ background: 'rgba(34, 197, 94, 0.1)' }}
                >
                  <Mail size={32} style={{ color: 'var(--accent-success)' }} />
                </div>
                <h4 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                  Invitation Sent!
                </h4>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  An invitation email has been sent successfully.
                </p>
              </div>
            ) : (
              <form onSubmit={handleInviteCustomer}>
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                    Customer Name
                  </label>
                  <input
                    type="text"
                    required
                    value={inviteForm.name}
                    onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border"
                    style={{ 
                      background: 'var(--bg-primary)', 
                      borderColor: 'var(--border-default)',
                      color: 'var(--text-primary)'
                    }}
                    placeholder="John Doe"
                    disabled={isSending}
                  />
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={inviteForm.email}
                    onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border"
                    style={{ 
                      background: 'var(--bg-primary)', 
                      borderColor: 'var(--border-default)',
                      color: 'var(--text-primary)'
                    }}
                    placeholder="john@company.com"
                    disabled={isSending}
                  />
                </div>

                <div 
                  className="p-3 rounded-lg mb-6 text-xs"
                  style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
                >
                  📧 An invitation email will be sent with a magic link valid for 24 hours. 
                  The customer will set their password to complete the signup.
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowInviteDialog(false)}
                    disabled={isSending}
                    className="flex-1 px-4 py-2 rounded-lg border transition-colors"
                    style={{ 
                      borderColor: 'var(--border-default)',
                      color: 'var(--text-primary)'
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSending}
                    className="flex-1 px-4 py-2 rounded-lg transition-all flex items-center justify-center gap-2"
                    style={{ 
                      background: isSending ? 'var(--bg-tertiary)' : 'var(--accent-primary)', 
                      color: 'white',
                      opacity: isSending ? 0.6 : 1
                    }}
                  >
                    {isSending ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Mail size={16} />
                        Send Invitation
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </>
      )}

      {/* Delete Customer Confirmation Dialog */}
      {showDeleteDialog && customerToDelete && (
        <>
          <div 
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => !isDeleting && setShowDeleteDialog(false)}
          />
          <div 
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md rounded-xl shadow-2xl z-50 p-6"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}
          >
            <div className="mb-4">
              <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                Delete Customer
              </h3>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Are you sure you want to delete this customer? This action cannot be undone.
              </p>
              <div 
                className="mt-4 p-3 rounded-lg text-sm"
                style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
              >
                <strong>Customer ID:</strong> {customerToDelete.customer_id.slice(0, 8)}...
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteDialog(false);
                  setCustomerToDelete(null);
                }}
                disabled={isDeleting}
                className="flex-1 px-4 py-2 rounded-lg border transition-colors"
                style={{ 
                  borderColor: 'var(--border-default)',
                  color: 'var(--text-primary)'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteCustomer}
                disabled={isDeleting}
                className="flex-1 px-4 py-2 rounded-lg transition-all flex items-center justify-center gap-2"
                style={{ 
                  background: isDeleting ? 'var(--bg-tertiary)' : 'var(--accent-error)', 
                  color: 'white',
                  opacity: isDeleting ? 0.6 : 1
                }}
              >
                {isDeleting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 size={16} />
                    Delete
                  </>
                )}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
