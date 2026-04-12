import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminDashboardLayout } from '@/components/admin/AdminDashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import {
  useAdminWithdrawals,
  useWithdrawalActions,
  useWithdrawalStats,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  CheckCircle2,
  Clock,
  XCircle,
  TrendingUp,
  AlertCircle,
  ChevronRight,
  DollarSign,
  Search,
  Building,
  Phone,
  ArrowLeft,
  Trash2,
  RefreshCw,
  Wallet,
  Download
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const statusColors: Record<string, { bg: string; text: string; border: string; icon: React.ReactNode }> = {
  pending: {
    bg: 'bg-amber-500/10 hover:bg-amber-500/20',
    text: 'text-amber-600 dark:text-amber-400',
    border: 'border-amber-500/20',
    icon: <Clock className="w-4 h-4" />,
  },
  approved: {
    bg: 'bg-blue-500/10 hover:bg-blue-500/20',
    text: 'text-blue-600 dark:text-blue-400',
    border: 'border-blue-500/20',
    icon: <CheckCircle2 className="w-4 h-4" />,
  },
  rejected: {
    bg: 'bg-rose-500/10 hover:bg-rose-500/20',
    text: 'text-rose-600 dark:text-rose-400',
    border: 'border-rose-500/20',
    icon: <XCircle className="w-4 h-4" />,
  },
  processing: {
    bg: 'bg-fuchsia-500/10 hover:bg-fuchsia-500/20',
    text: 'text-fuchsia-600 dark:text-fuchsia-400',
    border: 'border-fuchsia-500/20',
    icon: <TrendingUp className="w-4 h-4" />,
  },
  completed: {
    bg: 'bg-emerald-500/10 hover:bg-emerald-500/20',
    text: 'text-emerald-600 dark:text-emerald-400',
    border: 'border-emerald-500/20',
    icon: <CheckCircle2 className="w-4 h-4" />,
  },
};

export default function AdminTWRPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<string>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<WithdrawalRequest | null>(null);
  const [actionDialog, setActionDialog] = useState<{
    type: 'approve' | 'reject' | 'process' | 'complete' | 'delete' | null;
  }>({ type: null });
  const [notes, setNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  const { withdrawals, loading, refetch } = useAdminWithdrawals(100, 0, activeTab !== 'all' ? activeTab : undefined);
  const { stats } = useWithdrawalStats();
  const { approveWithdrawal, rejectWithdrawal, processWithdrawal, completeWithdrawal, updateWithdrawalStatus, deleteWithdrawal } = useWithdrawalActions();

  const handleApprove = async () => {
    if (selectedWithdrawal) {
      const result = await approveWithdrawal(selectedWithdrawal.withdrawal_id, notes);
      if (result.success) {
        setActionDialog({ type: null });
        setSelectedWithdrawal(null);
        setNotes('');
        refetch();
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
        refetch();
      }
    }
  };

  const handleProcess = async () => {
    if (selectedWithdrawal) {
      const result = await processWithdrawal(selectedWithdrawal.withdrawal_id);
      if (result.success) {
        setActionDialog({ type: null });
        setSelectedWithdrawal(null);
        refetch();
      }
    }
  };

  const handleComplete = async () => {
    if (selectedWithdrawal) {
      const result = await completeWithdrawal(selectedWithdrawal.withdrawal_id);
      if (result.success) {
        setActionDialog({ type: null });
        setSelectedWithdrawal(null);
        refetch();
      }
    }
  };

  const handleDelete = async () => {
    if (selectedWithdrawal) {
      const result = await deleteWithdrawal(selectedWithdrawal.withdrawal_id);
      if (result.success) {
        setActionDialog({ type: null });
        setSelectedWithdrawal(null);
        refetch();
      }
    }
  };

  const handleExport = async () => {
    try {
      setIsExporting(true);
      
      const csvHeader = "ID,Teacher Name,Teacher Email,Amount,Status,Method,Bank/Network,Account No,Date\n";
      const csvRows = filteredWithdrawals.map(w => {
        return `"${w.withdrawal_id}","${w.teacher_name}","${w.teacher_email}",${w.amount},"${w.status}","${w.method}","${w.bank_name || w.mobile_network || ''}","${w.account_number || ''}","${new Date(w.created_at).toLocaleString()}"`;
      }).join('\n');

      const csvContent = "data:text/csv;charset=utf-8," + csvHeader + csvRows;
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `withdrawals-export-${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Export Successful",
        description: "Withdrawals safely exported to CSV.",
      });
    } catch (e) {
      toast({
        title: "Export Failed",
        description: "There was an error exporting the data.",
        variant: "destructive"
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (selectedWithdrawal && newStatus !== selectedWithdrawal.status) {
      // If we are strictly following flow or bypassing
      const result = await updateWithdrawalStatus(selectedWithdrawal.withdrawal_id, newStatus);
      if (result.success) {
        setSelectedWithdrawal((prev) => prev ? { ...prev, status: newStatus as any } : null);
        refetch();
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

  const filteredWithdrawals = useMemo(() => {
    if (!searchQuery) return withdrawals;
    const lowerQ = searchQuery.toLowerCase();
    return withdrawals.filter(w => 
      w.teacher_name.toLowerCase().includes(lowerQ) ||
      w.teacher_email.toLowerCase().includes(lowerQ) ||
      (w.mobile_network && w.mobile_network.toLowerCase().includes(lowerQ)) ||
      (w.bank_name && w.bank_name.toLowerCase().includes(lowerQ))
    );
  }, [withdrawals, searchQuery]);

  return (
    <AdminDashboardLayout title="Teacher Withdrawals" subtitle="Manage and process withdrawal requests dynamically in real-time">
      <div className="relative min-h-[85vh] p-6 -mx-6 -mt-6">
        {/* Dynamic Backgrounds */}
        <div className="absolute inset-0 bg-background/50 pointer-events-none z-0" />
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/10 blur-[130px] rounded-full pointer-events-none z-0 mix-blend-screen" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-indigo-500/10 blur-[150px] rounded-full pointer-events-none z-0 mix-blend-screen" />

        <div className="relative z-10 space-y-8">
          
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              onClick={() => navigate(-1)} 
              className="bg-white/5 border border-white/10 hover:bg-white/10 hover:text-foreground backdrop-blur-xl rounded-xl shadow-sm h-10 px-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go Back
            </Button>
          </div>

          {/* Header Stats */}
          {stats && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { title: 'Pending', count: stats.pending_count, amount: stats.total_pending, color: 'from-amber-400 to-orange-500', icon: AlertCircle },
                { title: 'Approved', count: stats.approved_count, amount: stats.total_approved, color: 'from-blue-400 to-indigo-600', icon: CheckCircle2 },
                { title: 'Completed', count: stats.completed_count, amount: stats.total_completed, color: 'from-emerald-400 to-green-600', icon: TrendingUp },
                { title: 'Total Volume', count: stats.total_amount, amount: stats.average_amount, isVolume: true, color: 'from-rose-400 to-fuchsia-600', icon: DollarSign },
              ].map((stat, i) => (
                <motion.div
                  key={stat.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className={`p-6 rounded-2xl bg-gradient-to-br ${stat.color} text-white shadow-lg relative overflow-hidden border-0 group hover:scale-[1.02] transition-transform`}
                >
                  <div className="absolute -right-4 -top-4 opacity-20 pointer-events-none group-hover:scale-110 transition-transform">
                    <stat.icon className="w-32 h-32" />
                  </div>
                  <div className="relative z-10 flex flex-col h-full justify-between">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 rounded-xl bg-white/20 backdrop-blur-md shadow-inner">
                        <stat.icon className="w-5 h-5 text-white" />
                      </div>
                      <p className="font-semibold text-white/90 tracking-wide uppercase text-sm">{stat.title}</p>
                    </div>
                    <div>
                      <p className="text-4xl font-black mb-1 drop-shadow-sm">
                        {stat.isVolume ? `GH₵${stat.count.toFixed(0)}` : stat.count}
                      </p>
                      <p className="text-sm text-white/80 font-medium">
                        {stat.isVolume ? `Avg: GH₵${stat.amount.toFixed(2)}` : `GH₵${stat.amount.toFixed(2)}`}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {/* Controls */}
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl shadow-lg ring-1 ring-white/5">
            <div className="flex gap-2 overflow-x-auto pb-2 lg:pb-0 hide-scrollbar w-full lg:w-auto">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-5 py-2.5 text-sm font-semibold rounded-xl transition-all whitespace-nowrap flex items-center gap-2 ${
                    activeTab === tab.id
                      ? 'bg-primary text-primary-foreground shadow-md'
                      : 'bg-background/40 text-muted-foreground hover:bg-background/60 hover:text-foreground border border-white/5'
                  }`}
                >
                  {tab.label}
                  <Badge variant="secondary" className={`bg-black/10 transition-colors ${activeTab === tab.id ? 'text-primary-foreground border-white/20' : ''}`}>
                    {tab.count}
                  </Badge>
                </button>
              ))}
            </div>
            
            <div className="flex items-center gap-3 w-full lg:w-auto mt-2 lg:mt-0">
              <div className="relative w-full lg:w-[300px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by teacher, email, network..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-background/50 border-white/20 focus:border-primary rounded-xl h-11"
                />
              </div>
              <Button onClick={handleExport} disabled={isExporting || filteredWithdrawals.length === 0} variant="outline" className="h-11 rounded-xl bg-primary/10 border-primary/20 text-primary hover:bg-primary/20 font-bold hidden sm:flex items-center gap-2">
                {isExporting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                Export CSV
              </Button>
              <Button size="icon" variant="outline" onClick={() => refetch()} className="h-11 w-11 rounded-xl bg-background/50 border-white/20 hover:bg-primary/10 hover:text-primary transition-colors flex-shrink-0">
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground bg-white/5 rounded-2xl backdrop-blur-xl border border-white/10">
                  <div className="w-12 h-12 rounded-full absolute bg-primary/20 animate-ping" />
                  <Wallet className="w-8 h-8 text-primary relative z-10 animate-bounce" />
                  <p className="mt-4 font-medium animate-pulse">Loading withdrawals...</p>
                </div>
              ) : filteredWithdrawals.length === 0 ? (
                 <div className="flex flex-col items-center justify-center py-24 text-center text-muted-foreground bg-white/5 rounded-2xl backdrop-blur-xl border border-white/10">
                   <div className="w-20 h-20 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
                     <AlertCircle className="w-10 h-10 text-muted-foreground opacity-50" />
                   </div>
                   <p className="text-xl font-bold text-foreground/80">No requests found</p>
                   <p className="text-sm mt-2 max-w-md">There are currently no withdrawal requests matching your filters.</p>
                 </div>
              ) : (
                <AnimatePresence>
                  {filteredWithdrawals.map((withdrawal, i) => {
                    const st = statusColors[withdrawal.status];
                    const isSelected = selectedWithdrawal?.withdrawal_id === withdrawal.withdrawal_id;
                    return (
                      <motion.div
                        key={withdrawal.withdrawal_id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ delay: i * 0.03 }}
                        onClick={() => setSelectedWithdrawal(withdrawal)}
                        className={`group p-5 rounded-2xl cursor-pointer transition-all duration-300 ${
                          isSelected 
                            ? 'bg-white/40 dark:bg-white/10 shadow-xl ring-2 ring-primary border-transparent' 
                            : 'bg-white/20 dark:bg-white/5 hover:bg-white/30 dark:hover:bg-white/10 border border-white/20 hover:border-white/30 shadow-sm'
                        } backdrop-blur-xl`}
                      >
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                          <div className="flex items-center gap-4 flex-1 min-w-0">
                            <div className={`p-4 rounded-2xl shrink-0 transition-colors ${isSelected ? 'bg-primary text-primary-foreground shadow-inner' : 'bg-background shadow-sm text-foreground/80'}`}>
                              <Wallet className="w-6 h-6" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-black text-2xl tracking-tight text-foreground/90">GH₵{withdrawal.amount.toFixed(2)}</p>
                              <p className="text-sm font-semibold text-foreground mt-0.5 truncate">{withdrawal.teacher_name}</p>
                              <p className="text-xs text-muted-foreground truncate">{withdrawal.teacher_email}</p>
                            </div>
                          </div>
                          
                          <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center w-full sm:w-auto gap-3 shrink-0">
                            <Badge className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider ${st.bg} ${st.text} ${st.border} border`}>
                              <span className="flex items-center gap-1.5">
                                {st.icon} {withdrawal.status}
                              </span>
                            </Badge>
                            <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" />
                              {new Date(withdrawal.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              )}
            </div>

            {/* Sticky Detail Panel */}
            <div className="lg:sticky lg:top-8 h-fit">
              <AnimatePresence mode="wait">
                {selectedWithdrawal ? (
                  <motion.div 
                    key={selectedWithdrawal.withdrawal_id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="p-6 rounded-3xl bg-white/10 dark:bg-black/20 backdrop-blur-2xl border border-white/20 shadow-2xl ring-1 ring-black/5"
                  >
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="font-display font-bold text-2xl text-foreground">Overview</h3>
                      <Badge className={`px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider ${statusColors[selectedWithdrawal.status].bg} ${statusColors[selectedWithdrawal.status].text} border ${statusColors[selectedWithdrawal.status].border}`}>
                         <span className="flex items-center gap-1.5">
                           {statusColors[selectedWithdrawal.status].icon} {selectedWithdrawal.status}
                         </span>
                      </Badge>
                    </div>
                    
                    <div className="p-6 bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 rounded-2xl mb-8 relative overflow-hidden">
                       <div className="absolute -right-4 -bottom-4 opacity-5 pointer-events-none">
                         <DollarSign className="w-32 h-32" />
                       </div>
                       <p className="text-xs uppercase tracking-widest font-bold text-primary mb-2">Requested Amount</p>
                       <p className="text-5xl font-black text-foreground drop-shadow-sm tracking-tighter">GH₵{selectedWithdrawal.amount.toFixed(2)}</p>
                    </div>

                    <div className="space-y-4 mb-8">
                       <div className="p-4 rounded-xl bg-background/40 border border-white/10 space-y-4">
                         <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-2">Teacher Details</h4>
                         <div className="flex justify-between items-center">
                           <span className="text-muted-foreground text-sm font-medium">Name</span>
                           <span className="font-bold text-foreground text-sm">{selectedWithdrawal.teacher_name}</span>
                         </div>
                         <div className="flex justify-between items-center">
                           <span className="text-muted-foreground text-sm font-medium">Email</span>
                           <span className="font-medium text-foreground text-sm truncate max-w-[180px]" title={selectedWithdrawal.teacher_email}>{selectedWithdrawal.teacher_email}</span>
                         </div>
                       </div>

                       <div className="p-4 rounded-xl bg-background/40 border border-white/10 space-y-4">
                         <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-2">Payment Info</h4>
                         <div className="flex justify-between items-center">
                           <span className="text-muted-foreground text-sm font-medium">Method</span>
                           <span className="font-bold bg-primary/20 text-primary px-2.5 py-1 rounded-lg text-xs uppercase tracking-wider">{selectedWithdrawal.method}</span>
                         </div>
                         {selectedWithdrawal.mobile_network && (
                           <div className="flex justify-between items-center">
                             <span className="text-muted-foreground text-sm font-medium flex items-center gap-1.5"><Phone className="w-4 h-4"/> Network</span>
                             <span className="font-bold text-foreground text-sm">{selectedWithdrawal.mobile_network}</span>
                           </div>
                         )}
                         {selectedWithdrawal.bank_name && (
                           <div className="flex justify-between items-center">
                             <span className="text-muted-foreground text-sm font-medium flex items-center gap-1.5"><Building className="w-4 h-4"/> Bank</span>
                             <span className="font-bold text-foreground text-sm">{selectedWithdrawal.bank_name}</span>
                           </div>
                         )}
                         {selectedWithdrawal.account_number && (
                           <div className="flex justify-between items-center">
                             <span className="text-muted-foreground text-sm font-medium">Account No.</span>
                             <span className="font-mono bg-muted/50 px-2 py-0.5 rounded text-sm text-foreground/80">{selectedWithdrawal.account_number}</span>
                           </div>
                         )}
                       </div>

                       <div className="flex justify-between items-center px-2">
                         <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Requested At</span>
                         <span className="text-sm font-medium text-foreground/80">{new Date(selectedWithdrawal.created_at).toLocaleString()}</span>
                       </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">Update Status Directly</label>
                        <Select 
                          value={selectedWithdrawal.status} 
                          onValueChange={(val) => handleStatusChange(val)}
                        >
                          <SelectTrigger className="w-full h-12 bg-background/50 border-white/20 rounded-xl font-semibold">
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                          <SelectContent className="bg-background/95 backdrop-blur-xl border-white/10 rounded-xl">
                            <SelectItem value="pending"><div className="flex items-center gap-2"><Clock className="w-4 h-4 text-amber-500" /> Pending</div></SelectItem>
                            <SelectItem value="approved"><div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-blue-500" /> Approved</div></SelectItem>
                            <SelectItem value="processing"><div className="flex items-center gap-2"><TrendingUp className="w-4 h-4 text-fuchsia-500" /> Processing</div></SelectItem>
                            <SelectItem value="completed"><div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Completed</div></SelectItem>
                            <SelectItem value="rejected"><div className="flex items-center gap-2"><XCircle className="w-4 h-4 text-rose-500" /> Rejected</div></SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground mt-2 px-1">
                          Changing status manually will immediately reflect in the teacher's ledger and history.
                        </p>
                      </div>

                      <div className="flex gap-2">
                        <Button onClick={() => setSelectedWithdrawal(null)} variant="ghost" className="flex-1 rounded-xl hover:bg-white/10 transition-colors h-10 font-bold">
                          Dismiss
                        </Button>
                        <Button onClick={() => setActionDialog({ type: 'delete' })} variant="outline" className="flex-1 rounded-xl text-destructive hover:bg-destructive hover:text-destructive-foreground border-destructive/20 transition-colors h-10 font-bold flex items-center gap-2">
                           <Trash2 className="w-4 h-4" /> Delete
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-center justify-center p-12 text-center bg-white/5 rounded-3xl backdrop-blur-xl border border-dashed border-white/20 h-full min-h-[400px]"
                  >
                    <div className="w-24 h-24 rounded-full bg-white/5 flex items-center justify-center mb-6 ring-1 ring-white/10">
                      <Wallet className="w-10 h-10 text-muted-foreground opacity-50" />
                    </div>
                    <p className="text-xl font-bold text-foreground mb-2">Select a Request</p>
                    <p className="text-sm text-muted-foreground">Click on any withdrawal request card to view full details and take action.</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Action Dialogs */}
        <AlertDialog open={actionDialog.type === 'approve'} onOpenChange={(open) => !open && setActionDialog({ type: null })}>
          <AlertDialogContent className="glassmorphism-dialog border-emerald-500/20 rounded-3xl overflow-hidden">
            <AlertDialogHeader className="bg-emerald-500/10 p-6 -mx-6 -mt-6 border-b border-emerald-500/10 mb-6">
              <AlertDialogTitle className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-xl font-bold">
                <CheckCircle2 className="w-6 h-6" /> Approve Withdrawal
              </AlertDialogTitle>
              <AlertDialogDescription className="text-foreground/80 mt-2">
                You are authorizing a transfer of <span className="font-bold text-foreground">GH₵{selectedWithdrawal?.amount.toFixed(2)}</span> to {selectedWithdrawal?.teacher_name}.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-4 px-2">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1 mb-1.5 block">Internal Notes (Optional)</label>
                <Input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Record transaction notes..."
                  className="rounded-xl border-white/20 bg-background/50 h-11"
                />
              </div>
            </div>
            <div className="flex gap-3 justify-end mt-8">
              <AlertDialogCancel className="rounded-xl border-white/20 hover:bg-white/10">Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleApprove} className="rounded-xl bg-emerald-500 hover:bg-emerald-600 shadow-md">
                Confirm Approval
              </AlertDialogAction>
            </div>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={actionDialog.type === 'reject'} onOpenChange={(open) => !open && setActionDialog({ type: null })}>
          <AlertDialogContent className="glassmorphism-dialog border-rose-500/20 rounded-3xl overflow-hidden">
            <AlertDialogHeader className="bg-rose-500/10 p-6 -mx-6 -mt-6 border-b border-rose-500/10 mb-6">
              <AlertDialogTitle className="flex items-center gap-2 text-rose-600 dark:text-rose-400 text-xl font-bold">
                <XCircle className="w-6 h-6" /> Reject Withdrawal
              </AlertDialogTitle>
              <AlertDialogDescription className="text-foreground/80 mt-2">
                You are rejecting the withdrawal of <span className="font-bold text-foreground">GH₵{selectedWithdrawal?.amount.toFixed(2)}</span> for {selectedWithdrawal?.teacher_name}.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-4 px-2">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1 mb-1.5 block">Reason for Rejection <span className="text-rose-500">*</span></label>
                <Input
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Explain why this request is denied..."
                  className="rounded-xl border-white/20 bg-background/50 h-11"
                />
              </div>
            </div>
            <div className="flex gap-3 justify-end mt-8">
              <AlertDialogCancel className="rounded-xl border-white/20 hover:bg-white/10">Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleReject} disabled={!rejectionReason.trim()} className="rounded-xl bg-rose-500 hover:bg-rose-600 shadow-md">
                Reject Request
              </AlertDialogAction>
            </div>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={actionDialog.type === 'process'} onOpenChange={(open) => !open && setActionDialog({ type: null })}>
          <AlertDialogContent className="glassmorphism-dialog border-purple-500/20 rounded-3xl overflow-hidden">
            <AlertDialogHeader className="bg-purple-500/10 p-6 -mx-6 -mt-6 border-b border-purple-500/10 mb-6">
              <AlertDialogTitle className="flex items-center gap-2 text-purple-600 dark:text-purple-400 text-xl font-bold">
                <TrendingUp className="w-6 h-6" /> Start Processing
              </AlertDialogTitle>
              <AlertDialogDescription className="text-foreground/80 mt-2">
                Initiate the payout of <span className="font-bold text-foreground">GH₵{selectedWithdrawal?.amount.toFixed(2)}</span> to {selectedWithdrawal?.teacher_name}.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="flex gap-3 justify-end mt-8">
              <AlertDialogCancel className="rounded-xl border-white/20 hover:bg-white/10">Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleProcess} className="rounded-xl bg-purple-500 hover:bg-purple-600 shadow-md">
                Proceed
              </AlertDialogAction>
            </div>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={actionDialog.type === 'complete'} onOpenChange={(open) => !open && setActionDialog({ type: null })}>
          <AlertDialogContent className="glassmorphism-dialog border-emerald-500/20 rounded-3xl overflow-hidden">
            <AlertDialogHeader className="bg-emerald-500/10 p-6 -mx-6 -mt-6 border-b border-emerald-500/10 mb-6">
              <AlertDialogTitle className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-xl font-bold">
                <CheckCircle2 className="w-6 h-6" /> Mark as Completed
              </AlertDialogTitle>
              <AlertDialogDescription className="text-foreground/80 mt-2">
                Confirm that the transfer of <span className="font-bold text-foreground">GH₵{selectedWithdrawal?.amount.toFixed(2)}</span> has successfully reached {selectedWithdrawal?.teacher_name}'s account.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="flex gap-3 justify-end mt-8">
              <AlertDialogCancel className="rounded-xl border-white/20 hover:bg-white/10">Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleComplete} className="rounded-xl bg-emerald-500 hover:bg-emerald-600 shadow-md">
                Confirm Completion
              </AlertDialogAction>
            </div>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={actionDialog.type === 'delete'} onOpenChange={(open) => !open && setActionDialog({ type: null })}>
          <AlertDialogContent className="glassmorphism-dialog border-destructive/20 rounded-3xl overflow-hidden">
            <AlertDialogHeader className="bg-destructive/10 p-6 -mx-6 -mt-6 border-b border-destructive/10 mb-6">
              <AlertDialogTitle className="flex items-center gap-2 text-destructive text-xl font-bold">
                <Trash2 className="w-6 h-6" /> Delete Withdrawal Request
              </AlertDialogTitle>
              <AlertDialogDescription className="text-foreground/80 mt-2">
                You are about to permanently delete this withdrawal request. This action <span className="font-bold underline">cannot</span> be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="flex gap-3 justify-end mt-8">
              <AlertDialogCancel className="rounded-xl border-white/20 hover:bg-white/10">Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="rounded-xl bg-destructive hover:bg-destructive/90 text-destructive-foreground shadow-md">
                Delete Permanently
              </AlertDialogAction>
            </div>
          </AlertDialogContent>
        </AlertDialog>
        
      </div>
    </AdminDashboardLayout>
  );
}
