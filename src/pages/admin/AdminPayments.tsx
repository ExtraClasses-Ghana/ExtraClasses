import { useEffect, useState } from "react";
import { AdminDashboardLayout } from "@/components/admin/AdminDashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { DollarSign, CheckCircle, Clock, XCircle } from "lucide-react";

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

export default function AdminPayments() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    pendingPayments: 0,
    completedPayments: 0,
    failedPayments: 0,
  });

  useEffect(() => {
    fetchPayments();
  }, []);

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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-green-500/10">
                <DollarSign className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="text-xl font-bold">GH₵{stats.totalRevenue.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-amber-500/10">
                <Clock className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-xl font-bold">{stats.pendingPayments}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-green-500/10">
                <CheckCircle className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-xl font-bold">{stats.completedPayments}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-destructive/10">
                <XCircle className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Failed</p>
                <p className="text-xl font-bold">{stats.failedPayments}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payments Table */}
      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : payments.length === 0 ? (
            <div className="text-center py-12">
              <DollarSign className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No payments yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
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
          )}
        </CardContent>
      </Card>
    </AdminDashboardLayout>
  );
}
