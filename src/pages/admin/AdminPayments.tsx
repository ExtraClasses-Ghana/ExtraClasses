import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AdminDashboardLayout } from "@/components/admin/AdminDashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { DollarSign, CheckCircle, Clock, XCircle, Wallet, ArrowRight, TrendingUp, Download, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Payment {
  id: string;
  amount: number;
  status: string;
  payment_method: string | null;
  transaction_ref: string | null;
  created_at: string;
  payer: {
    full_name: string;
    email: string;
  } | null;
}

interface WithdrawalRequest {
  id: string;
  teacher_id: string;
  amount: number;
  status: string;
  method: string;
  account_details: string | null;
  created_at: string;
  teacher?: { full_name: string } | null;
}

export default function AdminPayments() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    pendingPayments: 0,
    completedPayments: 0,
    failedPayments: 0,
  });
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchPayments();
    fetchWithdrawals();

    const channel = supabase
      .channel("admin-payments-withdrawals")
      .on("postgres_changes", { event: "*", schema: "public", table: "teacher_withdrawals" }, () => fetchWithdrawals())
      .on("postgres_changes", { event: "*", schema: "public", table: "payments" }, () => fetchPayments())
      .on("postgres_changes", { event: "*", schema: "public", table: "sessions" }, () => fetchPayments())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchWithdrawals = async () => {
    try {
      const { data, error } = await (supabase.from as any)("teacher_withdrawals")
        .select("id, teacher_id, amount, status, method, account_details, created_at")
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;

      const withProfiles = await Promise.all(
        (data || []).map(async (w: any) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("user_id", w.teacher_id)
            .maybeSingle();
          return { ...(w as WithdrawalRequest), teacher: profile };
        })
      );
      setWithdrawals(withProfiles);
    } catch (e) {
      console.error("Error fetching withdrawal requests:", e);
    }
  };

  const fetchPayments = async () => {
    try {
      const { data: paymentData, error } = await supabase
        .from("payments")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch payer profiles
      const paymentsWithProfiles = await Promise.all(
        ((paymentData as any[]) || []).map(async (payment) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name, email")
            .eq("user_id", payment.payer_id)
            .maybeSingle();

          return { ...payment, payer: profile };
        })
      );

      setPayments(paymentsWithProfiles);

      // Calculate stats
      const total = paymentsWithProfiles
        .filter(p => p.status === "completed")
        .reduce((sum, p) => sum + Number(p.amount), 0);
      const pending = paymentsWithProfiles.filter(p => p.status === "pending").length;
      const completed = paymentsWithProfiles.filter(p => p.status === "completed").length;
      const failed = paymentsWithProfiles.filter(p => p.status === "failed").length;

      setStats({
        totalRevenue: total,
        pendingPayments: pending,
        completedPayments: completed,
        failedPayments: failed,
      });
    } catch (error) {
      console.error("Error fetching payments:", error);
    } finally {
      setLoading(false);
    }
  };

  const deletePayment = async (paymentId: string) => {
    if (!window.confirm("Are you sure you want to permanently delete this payment?")) return;
    try {
      const { error } = await supabase.from("payments").delete().eq("id", paymentId);
      if (error) throw error;
      toast({
        title: "Payment Deleted",
        description: "The transaction has been removed.",
      });
      fetchPayments();
    } catch (e: any) {
      toast({
        title: "Delete Failed",
        description: e.message || "Failed to delete payment.",
        variant: "destructive"
      });
    }
  };

  const handleExport = () => {
    setIsExporting(true);
    try {
      const csvHeader = "Transaction ID,Payer Name,Payer Email,Amount,Status,Method,Date\n";
      const csvRows = payments.map(p => {
        return `"${p.transaction_ref || p.id}","${p.payer?.full_name || ''}","${p.payer?.email || ''}",${p.amount},"${p.status}","${p.payment_method || ''}","${new Date(p.created_at).toLocaleString()}"`;
      }).join('\n');

      const csvContent = "data:text/csv;charset=utf-8," + csvHeader + csvRows;
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `payments-export-${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({ title: "Export Successful", description: "Payments safely exported to CSV." });
    } catch(e) {
      toast({ title: "Export Failed", variant: "destructive" });
    } finally {
      setIsExporting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 px-3 py-1 shadow-sm font-medium">
            <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
            Completed
          </Badge>
        );
      case "pending":
        return (
          <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30 px-3 py-1 shadow-sm font-medium">
            <Clock className="w-3.5 h-3.5 mr-1.5" />
            Pending
          </Badge>
        );
      case "failed":
        return (
          <Badge variant="destructive" className="px-3 py-1 shadow-sm font-medium">
            <XCircle className="w-3.5 h-3.5 mr-1.5" />
            Failed
          </Badge>
        );
      default:
        return <Badge variant="secondary" className="px-3 py-1">{status}</Badge>;
    }
  };

  return (
    <AdminDashboardLayout
      title="Payments"
      subtitle="Track all platform transactions"
    >
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
        <Card className="overflow-hidden border-0 shadow-lg relative bg-gradient-to-br from-emerald-500 to-green-700 text-white">
          <div className="absolute right-0 top-0 opacity-10 pointer-events-none transform translate-x-1/4 -translate-y-1/4">
             <DollarSign className="w-32 h-32" />
          </div>
          <CardContent className="p-5 sm:p-6 relative z-10">
            <div className="flex flex-col gap-3">
              <div className="p-2 rounded-lg bg-white/20 w-fit backdrop-blur-sm">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-emerald-50 mb-1">Total Revenue</p>
                <p className="text-2xl sm:text-3xl font-bold truncate tracking-tight" title={String(stats.totalRevenue)}>
                  GH₵{stats.totalRevenue.toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden shadow-md border border-amber-100 hover:shadow-lg transition-shadow bg-gradient-to-br from-amber-50 to-white">
          <CardContent className="p-5 sm:p-6">
            <div className="flex flex-col gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10 w-fit">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-muted-foreground mb-1">Pending</p>
                <p className="text-2xl sm:text-3xl font-bold text-slate-800">{stats.pendingPayments}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden shadow-md border border-blue-100 hover:shadow-lg transition-shadow bg-gradient-to-br from-blue-50 to-white">
          <CardContent className="p-5 sm:p-6">
            <div className="flex flex-col gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10 w-fit">
                <CheckCircle className="w-5 h-5 text-blue-600" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-muted-foreground mb-1">Completed</p>
                <p className="text-2xl sm:text-3xl font-bold text-slate-800">{stats.completedPayments}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden shadow-md border border-rose-100 hover:shadow-lg transition-shadow bg-gradient-to-br from-rose-50 to-white">
          <CardContent className="p-5 sm:p-6">
            <div className="flex flex-col gap-3">
              <div className="p-2 rounded-lg bg-rose-500/10 w-fit">
                <XCircle className="w-5 h-5 text-rose-600" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-muted-foreground mb-1">Failed</p>
                <p className="text-2xl sm:text-3xl font-bold text-slate-800">{stats.failedPayments}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Teacher Withdrawal Requests */}
      <Card className="mb-6 sm:mb-8 border border-border/50 shadow-sm overflow-hidden bg-white/50 backdrop-blur-xl">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 px-6 bg-slate-50/50 border-b border-border/50">
          <div className="min-w-0">
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl font-display text-slate-800">
              <div className="p-2 rounded-md bg-indigo-500/10 text-indigo-600">
                <Wallet className="h-5 w-5 shrink-0" />
              </div>
              <span className="truncate tracking-tight">Recent Withdrawal Requests</span>
            </CardTitle>
            <p className="text-sm text-slate-500 mt-1.5 ml-11">
              Review and process payout requests from teachers
            </p>
          </div>
          <Button asChild variant="outline" size="sm" className="w-full sm:w-auto shrink-0 hover:bg-slate-100/80 transition-colors">
            <Link to="/admin/twr">
              Manage all <ArrowRight className="h-4 w-4 ml-1.5" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {withdrawals.length === 0 ? (
            <div className="text-center py-10 sm:py-16 text-slate-400">
              <Wallet className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p className="text-sm">No withdrawal requests yet.</p>
            </div>
          ) : (
            <>
              {/* Mobile: card list */}
              <div className="block md:hidden p-4 space-y-3">
                {withdrawals.map((w) => (
                  <div key={w.id} className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-slate-800 truncate">{w.teacher?.full_name || w.teacher_id.slice(0, 8)}</span>
                      <span className="font-bold text-slate-900 shrink-0">GH₵{Number(w.amount).toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                      <span className="flex items-center px-2 py-0.5 rounded-sm bg-slate-100">{w.method === "mobile_money" ? "Mobile Money" : w.method}</span>
                      <span>{new Date(w.created_at).toLocaleDateString()}</span>
                    </div>
                    <div className="pt-1">
                      {w.status === "pending" ? (
                        <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-200">Pending</Badge>
                      ) : w.status === "paid" ? (
                        <Badge className="bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100">Paid</Badge>
                      ) : (
                        <Badge variant="secondary">{w.status}</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {/* Desktop: table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full min-w-[600px] text-sm text-left">
                <thead className="bg-slate-50/50 text-slate-500 text-xs uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="py-4 px-6 border-b border-border/50">Teacher</th>
                    <th className="py-4 px-6 border-b border-border/50">Amount</th>
                    <th className="py-4 px-6 border-b border-border/50">Method</th>
                    <th className="py-4 px-6 border-b border-border/50">Status</th>
                    <th className="py-4 px-6 border-b border-border/50 rounded-tr-lg">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {withdrawals.map((w) => (
                    <tr key={w.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-4 px-6 font-medium text-slate-800">
                        {w.teacher?.full_name || w.teacher_id.slice(0, 8)}
                      </td>
                      <td className="py-4 px-6 font-semibold text-slate-900">
                        GH₵{Number(w.amount).toLocaleString()}
                      </td>
                      <td className="py-4 px-6 text-slate-500">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                          {w.method === "mobile_money" ? "MOMO" : w.method.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        {w.status === "pending" ? (
                          <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-200 shadow-sm text-[10px] uppercase tracking-wider py-0.5">Pending</Badge>
                        ) : w.status === "paid" ? (
                          <Badge className="bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100 shadow-sm text-[10px] uppercase tracking-wider py-0.5">Paid</Badge>
                        ) : (
                          <Badge variant="secondary" className="shadow-sm text-[10px] uppercase tracking-wider py-0.5">{w.status}</Badge>
                        )}
                      </td>
                      <td className="py-4 px-6 text-slate-400 font-mono text-xs">
                        {new Date(w.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Payments Table */}
      <Card className="border border-border/50 shadow-sm overflow-hidden bg-white/50 backdrop-blur-xl mb-8">
        <CardHeader className="px-6 py-5 bg-slate-50/50 border-b border-border/50">
          <CardTitle className="text-lg sm:text-xl font-display text-slate-800 tracking-tight flex items-center gap-2">
             <div className="p-2 rounded-md bg-blue-500/10 text-blue-600">
                <DollarSign className="h-5 w-5 shrink-0" />
              </div>
            Transaction History
          </CardTitle>
          <Button onClick={handleExport} disabled={isExporting || payments.length === 0} variant="outline" size="sm" className="shrink-0 hover:bg-slate-100/80 transition-colors hidden sm:flex items-center gap-2">
            <Download className="w-4 h-4" /> Export CSV
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center items-center py-16">
               <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : payments.length === 0 ? (
            <div className="text-center py-16">
              <DollarSign className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500 text-sm">No payments yet</p>
            </div>
          ) : (
            <>
              {/* Mobile: card list */}
              <div className="block md:hidden p-4 space-y-3">
                {payments.map((payment) => (
                  <div key={payment.id} className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-slate-800 truncate">{payment.payer?.full_name || "Unknown"}</span>
                      <span className="font-bold text-slate-900 shrink-0">GH₵{Number(payment.amount).toLocaleString()}</span>
                    </div>
                    <p className="text-xs text-slate-500 truncate">{payment.payer?.email}</p>
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-mono text-slate-400 bg-slate-50 px-1 py-0.5 rounded">{payment.transaction_ref || payment.id.slice(0, 8)}</span>
                      <span className="text-slate-500">{new Date(payment.created_at).toLocaleDateString()}</span>
                    </div>
                    <div className="pt-1">{getStatusBadge(payment.status)}</div>
                  </div>
                ))}
              </div>
              {/* Desktop: table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full min-w-[640px] text-sm text-left">
                <thead className="bg-slate-50/50 text-slate-500 text-xs uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="py-4 px-6 border-b border-border/50">Transaction ID</th>
                    <th className="py-4 px-6 border-b border-border/50">Payer</th>
                    <th className="py-4 px-6 border-b border-border/50">Amount</th>
                    <th className="py-4 px-6 border-b border-border/50">Method</th>
                    <th className="py-4 px-6 border-b border-border/50">Status</th>
                    <th className="py-4 px-6 border-b border-border/50">Date</th>
                    <th className="py-4 px-6 border-b border-border/50">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {payments.map((payment) => (
                    <tr key={payment.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-4 px-6 font-mono text-xs text-slate-500">
                        <span className="bg-slate-100 px-2 py-1 rounded-md">{payment.transaction_ref || payment.id.slice(0, 8)}</span>
                      </td>
                      <td className="py-4 px-6">
                        <div>
                          <p className="font-medium text-slate-800">{payment.payer?.full_name || "Unknown"}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{payment.payer?.email}</p>
                        </div>
                      </td>
                      <td className="py-4 px-6 font-semibold text-slate-900">
                        GH₵{Number(payment.amount).toLocaleString()}
                      </td>
                      <td className="py-4 px-6">
                         <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                          {payment.payment_method || "-"}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        {getStatusBadge(payment.status)}
                      </td>
                      <td className="py-4 px-6 text-slate-400 font-mono text-xs">
                        {new Date(payment.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-4 px-6">
                        <Button variant="ghost" size="icon" onClick={() => deletePayment(payment.id)} className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </AdminDashboardLayout>
  );
}
