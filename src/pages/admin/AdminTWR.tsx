import React, { useState } from 'react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  useAdminWithdrawals,
  useWithdrawalActions,
  useWithdrawalStats,
  useWithdrawalNotifications,
  type WithdrawalRequest,
} from '@/hooks/useWithdrawalManagement';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  CheckCircle2,
  Clock,
  XCircle,
  TrendingUp,
  AlertCircle,
  ChevronRight,
  DollarSign,
  Users,
} from 'lucide-react';

const statusColors: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
  pending: {
    bg: 'bg-yellow-50',
    text: 'text-yellow-700',
    icon: <Clock className="w-4 h-4" />,
  },
  approved: {
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    icon: <CheckCircle2 className="w-4 h-4" />,
  },
  rejected: {
    bg: 'bg-red-50',
    text: 'text-red-700',
    icon: <XCircle className="w-4 h-4" />,
  },
  processing: {
    bg: 'bg-purple-50',
    text: 'text-purple-700',
    icon: <TrendingUp className="w-4 h-4" />,
  },
  completed: {
    bg: 'bg-green-50',
    text: 'text-green-700',
    icon: <CheckCircle2 className="w-4 h-4" />,
  },
};

export default function AdminTWRPage() {
  const [activeTab, setActiveTab] = useState<string>('pending');
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<WithdrawalRequest | null>(null);
  const [actionDialog, setActionDialog] = useState<{
    type: 'approve' | 'reject' | 'process' | 'complete' | null;
  }>({ type: null });
  const [notes, setNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');

  const { withdrawals, loading } = useAdminWithdrawals(50, 0, activeTab !== 'all' ? activeTab : undefined);
  const { stats } = useWithdrawalStats();
  const { notifications } = useWithdrawalNotifications();
  const { approveWithdrawal, rejectWithdrawal, processWithdrawal, completeWithdrawal } = useWithdrawalActions();

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const handleApprove = async () => {
    if (selectedWithdrawal) {
      const result = await approveWithdrawal(selectedWithdrawal.withdrawal_id, notes);
      if (result.success) {
        setActionDialog({ type: null });
        setSelectedWithdrawal(null);
        setNotes('');
      }
    }
  };

  const handleReject = async () => {
    if (selectedWithdrawal && rejectionReason.trim()) {
      const result = await rejectWithdrawal(selectedWithdrawal.withdrawal_id, rejectionReason);
      if (result.success) {
        setActionDialog({ type: null });
        setSelectedWithdrawal(null);
        setRejectionReason('');
      }
    }
  };

  const handleProcess = async () => {
    if (selectedWithdrawal) {
      const result = await processWithdrawal(selectedWithdrawal.withdrawal_id);
      if (result.success) {
        setActionDialog({ type: null });
        setSelectedWithdrawal(null);
      }
    }
  };

  const handleComplete = async () => {
    if (selectedWithdrawal) {
      const result = await completeWithdrawal(selectedWithdrawal.withdrawal_id);
      if (result.success) {
        setActionDialog({ type: null });
        setSelectedWithdrawal(null);
      }
    }
  };

  const tabs = [
    { id: 'pending', label: 'Pending', count: stats?.pending_count || 0 },
    { id: 'approved', label: 'Approved', count: stats?.approved_count || 0 },
    { id: 'processing', label: 'Processing', count: 0 },
    { id: 'completed', label: 'Completed', count: stats?.completed_count || 0 },
    { id: 'rejected', label: 'Rejected', count: stats?.rejected_count || 0 },
    { id: 'all', label: 'All', count: (stats?.pending_count || 0) + (stats?.approved_count || 0) + (stats?.completed_count || 0) + (stats?.rejected_count || 0) },
  ];

  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <div className="min-h-screen bg-background p-4 sm:p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold mb-2">Teacher Withdrawal Requests</h1>
            <p className="text-muted-foreground">Manage and process withdrawal requests from teachers in real-time</p>
          </div>

          {/* Statistics Cards */}
          {stats && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8 animate-in fade-in slide-in-from-top-4 duration-500">
              <div className="p-4 border rounded-lg bg-yellow-50 dark:bg-yellow-950/20">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-yellow-600" />
                  <div>
                    <p className="text-sm text-muted-foreground">Pending</p>
                    <p className="text-xl sm:text-2xl font-bold">{stats.pending_count}</p>
                    <p className="text-xs text-muted-foreground">₵{stats.total_pending.toFixed(2)}</p>
                  </div>
                </div>
              </div>

              <div className="p-4 border rounded-lg bg-blue-50 dark:bg-blue-950/20">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="text-sm text-muted-foreground">Approved</p>
                    <p className="text-xl sm:text-2xl font-bold">{stats.approved_count}</p>
                    <p className="text-xs text-muted-foreground">₵{stats.total_approved.toFixed(2)}</p>
                  </div>
                </div>
              </div>

              <div className="p-4 border rounded-lg bg-green-50 dark:bg-green-950/20">
                <div className="flex items-center gap-3">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="text-sm text-muted-foreground">Completed</p>
                    <p className="text-xl sm:text-2xl font-bold">{stats.completed_count}</p>
                    <p className="text-xs text-muted-foreground">₵{stats.total_completed.toFixed(2)}</p>
                  </div>
                </div>
              </div>

              <div className="p-4 border rounded-lg bg-red-50 dark:bg-red-950/20">
                <div className="flex items-center gap-3">
                  <DollarSign className="w-5 h-5 text-red-600" />
                  <div>
                    <p className="text-sm text-muted-foreground">Total Volume</p>
                    <p className="text-xl sm:text-2xl font-bold">₵{stats.total_amount.toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">Avg: ₵{stats.average_amount.toFixed(2)}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-2 mb-6 overflow-x-auto pb-2 border-b">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'text-primary border-b-2 border-primary -mb-2'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab.label}
                <span className="ml-2 text-xs bg-muted px-2 py-1 rounded-full">{tab.count}</span>
              </button>
            ))}
          </div>

          {/* Withdrawals List */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-3 animate-in fade-in duration-500">
              {loading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-24 bg-muted rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : withdrawals.length === 0 ? (
                <div className="text-center py-8">
                  <AlertCircle className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">No withdrawal requests in this category</p>
                </div>
              ) : (
                withdrawals.map((withdrawal, index) => (
                  <div
                    key={withdrawal.withdrawal_id}
                    className={`p-4 border rounded-lg cursor-pointer transition-all hover:shadow-md twr-card ${
                      selectedWithdrawal?.withdrawal_id === withdrawal.withdrawal_id
                        ? 'ring-2 ring-primary shadow-md'
                        : ''
                    } ${statusColors[withdrawal.status].bg}`}
                    onClick={() => setSelectedWithdrawal(withdrawal)}
                    data-index={index}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${statusColors[withdrawal.status].text} bg-white dark:bg-neutral-800`}>
                            {statusColors[withdrawal.status].icon}
                            {withdrawal.status.charAt(0).toUpperCase() + withdrawal.status.slice(1)}
                          </span>
                        </div>
                        <p className="font-semibold text-lg">₵{withdrawal.amount.toFixed(2)}</p>
                        <p className="text-sm text-muted-foreground mt-1">{withdrawal.teacher_name}</p>
                        <p className="text-xs text-muted-foreground">{withdrawal.teacher_email}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {withdrawal.method} • {new Date(withdrawal.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Detail Panel */}
            <div className="lg:sticky lg:top-6 h-fit">
              {selectedWithdrawal ? (
                <div className="p-6 border rounded-lg bg-card space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div>
                    <h3 className="font-semibold text-lg mb-4">Request Details</h3>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Amount</span>
                        <span className="font-semibold">₵{selectedWithdrawal.amount.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Teacher</span>
                        <span className="font-semibold">{selectedWithdrawal.teacher_name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Method</span>
                        <span className="font-semibold">{selectedWithdrawal.method}</span>
                      </div>
                      {selectedWithdrawal.mobile_network && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Network</span>
                          <span className="font-semibold">{selectedWithdrawal.mobile_network}</span>
                        </div>
                      )}
                      {selectedWithdrawal.bank_name && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Bank</span>
                          <span className="font-semibold">{selectedWithdrawal.bank_name}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Requested</span>
                        <span className="font-semibold">{new Date(selectedWithdrawal.created_at).toLocaleDateString()}</span>
                      </div>
                      {selectedWithdrawal.transaction_count > 0 && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Transactions</span>
                          <span className="font-semibold">{selectedWithdrawal.transaction_count}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="space-y-2 pt-4 border-t">
                    {selectedWithdrawal.status === 'pending' && (
                      <>
                        <Button
                          onClick={() => setActionDialog({ type: 'approve' })}
                          className="w-full bg-green-600 hover:bg-green-700"
                        >
                          Approve
                        </Button>
                        <Button
                          onClick={() => setActionDialog({ type: 'reject' })}
                          variant="outline"
                          className="w-full"
                        >
                          Reject
                        </Button>
                      </>
                    )}

                    {selectedWithdrawal.status === 'approved' && (
                      <Button
                        onClick={() => setActionDialog({ type: 'process' })}
                        className="w-full bg-purple-600 hover:bg-purple-700"
                      >
                        Start Processing
                      </Button>
                    )}

                    {selectedWithdrawal.status === 'processing' && (
                      <Button
                        onClick={() => setActionDialog({ type: 'complete' })}
                        className="w-full bg-green-600 hover:bg-green-700"
                      >
                        Mark as Completed
                      </Button>
                    )}

                    <Button
                      onClick={() => setSelectedWithdrawal(null)}
                      variant="ghost"
                      className="w-full"
                    >
                      Close
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="p-6 border rounded-lg bg-card text-center text-muted-foreground">
                  <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>Select a withdrawal request to view details and manage it</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Dialogs */}
        {/* Approve Dialog */}
        <AlertDialog open={actionDialog.type === 'approve'} onOpenChange={(open) => !open && setActionDialog({ type: null })}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Approve Withdrawal Request</AlertDialogTitle>
              <AlertDialogDescription>
                You are about to approve a withdrawal of ₵{selectedWithdrawal?.amount.toFixed(2)} for {selectedWithdrawal?.teacher_name}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium">Approval Notes (Optional)</label>
                <Input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add any notes about this approval..."
                  className="mt-1"
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleApprove} className="bg-green-600 hover:bg-green-700">
                Approve
              </AlertDialogAction>
            </div>
          </AlertDialogContent>
        </AlertDialog>

        {/* Reject Dialog */}
        <AlertDialog open={actionDialog.type === 'reject'} onOpenChange={(open) => !open && setActionDialog({ type: null })}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Reject Withdrawal Request</AlertDialogTitle>
              <AlertDialogDescription>
                You are about to reject a withdrawal of ₵{selectedWithdrawal?.amount.toFixed(2)} for {selectedWithdrawal?.teacher_name}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium">Rejection Reason</label>
                <Input
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Explain why this request is being rejected..."
                  className="mt-1"
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleReject} className="bg-red-600 hover:bg-red-700">
                Reject
              </AlertDialogAction>
            </div>
          </AlertDialogContent>
        </AlertDialog>

        {/* Process Dialog */}
        <AlertDialog open={actionDialog.type === 'process'} onOpenChange={(open) => !open && setActionDialog({ type: null })}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Start Processing</AlertDialogTitle>
              <AlertDialogDescription>
                Begin processing the withdrawal of ₵{selectedWithdrawal?.amount.toFixed(2)} for {selectedWithdrawal?.teacher_name}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="flex gap-2 justify-end">
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleProcess} className="bg-purple-600 hover:bg-purple-700">
                Start Processing
              </AlertDialogAction>
            </div>
          </AlertDialogContent>
        </AlertDialog>

        {/* Complete Dialog */}
        <AlertDialog open={actionDialog.type === 'complete'} onOpenChange={(open) => !open && setActionDialog({ type: null })}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Mark as Completed</AlertDialogTitle>
              <AlertDialogDescription>
                Complete the withdrawal of ₵{selectedWithdrawal?.amount.toFixed(2)} for {selectedWithdrawal?.teacher_name}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="flex gap-2 justify-end">
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleComplete} className="bg-green-600 hover:bg-green-700">
                Mark Complete
              </AlertDialogAction>
            </div>
          </AlertDialogContent>
        </AlertDialog>

        <style>{`
          @keyframes slideIn {
            from {
              opacity: 0;
              transform: translateY(10px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          .twr-card {
            animation: slideIn 300ms ease-out both;
          }
          .twr-card[data-index="0"] { animation-delay: 0ms; }
          .twr-card[data-index="1"] { animation-delay: 50ms; }
          .twr-card[data-index="2"] { animation-delay: 100ms; }
          .twr-card[data-index="3"] { animation-delay: 150ms; }
          .twr-card[data-index="4"] { animation-delay: 200ms; }
          .twr-card[data-index="5"] { animation-delay: 250ms; }
          .twr-card[data-index="6"] { animation-delay: 300ms; }
          .twr-card[data-index="7"] { animation-delay: 350ms; }
          .twr-card[data-index="8"] { animation-delay: 400ms; }
          .twr-card[data-index="9"] { animation-delay: 450ms; }
          .twr-card[data-index="10"] { animation-delay: 500ms; }
          .twr-card[data-index="11"] { animation-delay: 550ms; }
          .twr-card[data-index="12"] { animation-delay: 600ms; }
          .twr-card[data-index="13"] { animation-delay: 650ms; }
          .twr-card[data-index="14"] { animation-delay: 700ms; }
          .twr-card[data-index="15"] { animation-delay: 750ms; }
          .twr-card[data-index="16"] { animation-delay: 800ms; }
          .twr-card[data-index="17"] { animation-delay: 850ms; }
          .twr-card[data-index="18"] { animation-delay: 900ms; }
          .twr-card[data-index="19"] { animation-delay: 950ms; }
        `}</style>
      </div>
    </ProtectedRoute>
  );
}
