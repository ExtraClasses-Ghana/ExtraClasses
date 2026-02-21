import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AdminDashboardLayout } from "@/components/admin/AdminDashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { DollarSign, CheckCircle, Clock, XCircle, Wallet, ArrowRight } from "lucide-react";

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

  useEffect(() => {
    fetchPayments();
    fetchWithdrawals();

    const channel = supabase
      .channel("admin-payments-withdrawals")
      .on("postgres_changes", { event: "*", schema: "public", table: "teacher_withdrawals" }, () => fetchWithdrawals())
      .on("postgres_changes", { event: "*", schema: "public", table: "payments" }, () => fetchPayments())
      .on("postgres_changes", { event: "*", schema: "public", table: "sessions" }, () => fetchPayments())
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, []);

  const fetchWithdrawals = async () => {
    try {
      const { data, error } = await supabase
        .from("teacher_withdrawals")
        .select("id, teacher_id, amount, status, method, account_details, created_at")
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;

      const withProfiles = await Promise.all(
        (data || []).map(async (w) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("user_id", w.teacher_id)
            .maybeSingle();
          return { ...w, teacher: profile };
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
        (paymentData || []).map(async (payment) => {
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <Badge className="bg-green-500/10 text-green-500 border-green-500">
            <CheckCircle className="w-3 h-3 mr-1" />
            Completed
          </Badge>
        );
      case "pending":
        return (
          <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        );
      case "failed":
        return (
          <Badge variant="destructive">
            <XCircle className="w-3 h-3 mr-1" />
            Failed
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <AdminDashboardLayout
      title="Payments"
      subtitle="Track all platform transactions"
    >
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-2 sm:p-3 rounded-lg bg-green-500/10 shrink-0">
                <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-green-500" />
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground">Total Revenue</p>
                <p className="text-base sm:text-xl font-bold truncate" title={String(stats.totalRevenue)}>GH₵{stats.totalRevenue.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-2 sm:p-3 rounded-lg bg-amber-500/10 shrink-0">
                <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500" />
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground">Pending</p>
                <p className="text-base sm:text-xl font-bold">{stats.pendingPayments}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-2 sm:p-3 rounded-lg bg-green-500/10 shrink-0">
                <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-500" />
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground">Completed</p>
                <p className="text-base sm:text-xl font-bold">{stats.completedPayments}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-2 sm:p-3 rounded-lg bg-destructive/10 shrink-0">
                <XCircle className="w-4 h-4 sm:w-5 sm:h-5 text-destructive" />
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground">Failed</p>
                <p className="text-base sm:text-xl font-bold">{stats.failedPayments}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Teacher Withdrawal Requests */}
      <Card className="mb-4 sm:mb-6">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:space-y-0 pb-2 px-4 sm:px-6">
          <div className="min-w-0">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Wallet className="h-5 w-5 text-primary shrink-0" />
              <span className="truncate">Teacher Withdrawal Requests</span>
            </CardTitle>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Review and process payout requests from teachers. New requests appear here and in Notifications.
            </p>
          </div>
          <Button asChild variant="outline" size="sm" className="w-full sm:w-auto shrink-0">
            <Link to="/admin/twr">
              Manage all
              <ArrowRight className="h-4 w-4 ml-1" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="px-4 sm:px-6">
          {withdrawals.length === 0 ? (
            <div className="text-center py-6 sm:py-8 text-muted-foreground text-sm">
              No withdrawal requests yet.
            </div>
          ) : (
            <>
              {/* Mobile: card list */}
              <div className="block md:hidden space-y-3">
                {withdrawals.map((w) => (
                  <div key={w.id} className="rounded-lg border p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium truncate">{w.teacher?.full_name || w.teacher_id.slice(0, 8)}</span>
                      <span className="font-semibold shrink-0">GH₵{Number(w.amount).toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                      <span>{w.method === "mobile_money" ? "Mobile Money" : w.method}</span>
                      <span>{new Date(w.created_at).toLocaleString()}</span>
                    </div>
                    <div>
                      {w.status === "pending" ? (
                        <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30 text-xs">
                          Pending
                        </Badge>
                      ) : w.status === "paid" ? (
                        <Badge className="bg-green-500/10 text-green-600 border-green-500/30 text-xs">
                          Paid
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">{w.status}</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {/* Desktop: table */}
              <div className="hidden md:block overflow-x-auto -mx-2">
                <table className="w-full min-w-[600px]">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 font-medium">Teacher</th>
                    <th className="text-left py-3 px-4 font-medium">Amount</th>
                    <th className="text-left py-3 px-4 font-medium">Method</th>
                    <th className="text-left py-3 px-4 font-medium">Status</th>
                    <th className="text-left py-3 px-4 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {withdrawals.map((w) => (
                    <tr key={w.id} className="border-b border-border">
                      <td className="py-3 px-4 font-medium">
                        {w.teacher?.full_name || w.teacher_id.slice(0, 8)}
                      </td>
                      <td className="py-3 px-4 font-medium">
                        GH₵{Number(w.amount).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground text-sm">
                        {w.method === "mobile_money" ? "Mobile Money" : w.method}
                      </td>
                      <td className="py-3 px-4">
                        {w.status === "pending" ? (
                          <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30">
                            Pending
                          </Badge>
                        ) : w.status === "paid" ? (
                          <Badge className="bg-green-500/10 text-green-600 border-green-500/30">
                            Paid
                          </Badge>
                        ) : (
                          <Badge variant="secondary">{w.status}</Badge>
                        )}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground text-sm">
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
      <Card>
        <CardHeader className="px-4 sm:px-6">
          <CardTitle className="text-base sm:text-lg">Transaction History</CardTitle>
        </CardHeader>
        <CardContent className="px-4 sm:px-6">
          {loading ? (
            <div className="flex items-center justify-center py-8 sm:py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : payments.length === 0 ? (
            <div className="text-center py-8 sm:py-12">
              <DollarSign className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground text-sm sm:text-base">No payments yet</p>
            </div>
          ) : (
            <>
              {/* Mobile: card list */}
              <div className="block md:hidden space-y-3">
                {payments.map((payment) => (
                  <div key={payment.id} className="rounded-lg border p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium truncate">{payment.payer?.full_name || "Unknown"}</span>
                      <span className="font-semibold shrink-0">GH₵{Number(payment.amount).toLocaleString()}</span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{payment.payer?.email}</p>
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-mono">{payment.transaction_ref || payment.id.slice(0, 8)}</span>
                      <span className="text-muted-foreground">{new Date(payment.created_at).toLocaleDateString()}</span>
                    </div>
                    <div>{getStatusBadge(payment.status)}</div>
                  </div>
                ))}
              </div>
              {/* Desktop: table */}
              <div className="hidden md:block overflow-x-auto -mx-2">
                <table className="w-full min-w-[640px]">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 font-medium">Transaction ID</th>
                    <th className="text-left py-3 px-4 font-medium">Payer</th>
                    <th className="text-left py-3 px-4 font-medium">Amount</th>
                    <th className="text-left py-3 px-4 font-medium">Method</th>
                    <th className="text-left py-3 px-4 font-medium">Status</th>
                    <th className="text-left py-3 px-4 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((payment) => (
                    <tr key={payment.id} className="border-b border-border">
                      <td className="py-3 px-4 font-mono text-sm">
                        {payment.transaction_ref || payment.id.slice(0, 8)}
                      </td>
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium">{payment.payer?.full_name || "Unknown"}</p>
                          <p className="text-sm text-muted-foreground">{payment.payer?.email}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-medium">
                        GH₵{Number(payment.amount).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {payment.payment_method || "-"}
                      </td>
                      <td className="py-3 px-4">
                        {getStatusBadge(payment.status)}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {new Date(payment.created_at).toLocaleDateString()}
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
