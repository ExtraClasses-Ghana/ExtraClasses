import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  CreditCard, 
  Calendar,
  Download,
  CheckCircle,
  XCircle,
  Clock,
  ArrowUpRight,
  ArrowDownLeft
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { generateStudentPaymentHistoryPDF } from "@/lib/studentPaymentPDF";
import { generatePDFFromTemplate } from "@/lib/pdfExport";
import { useToast } from "@/hooks/use-toast";

interface Payment {
  id: string;
  amount: number;
  status: string;
  payment_method: string | null;
  transaction_ref: string | null;
  created_at: string;
  session_id: string;
}

interface SessionInfo {
  subject: string;
  session_date: string;
}

export function PaymentTracking() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [payments, setPayments] = useState<(Payment & { session?: SessionInfo })[]>([]);
  const [stats, setStats] = useState({
    totalPaid: 0,
    pendingAmount: 0,
    completedCount: 0
  });
  const [loading, setLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    if (user) {
      fetchPayments();
    }
  }, [user]);

  const fetchPayments = async () => {
    try {
      const { data: paymentsData } = await supabase
        .from("payments")
        .select("*")
        .eq("payer_id", user?.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (paymentsData) {
        const paymentsWithSessions = await Promise.all(
          paymentsData.map(async (payment) => {
            const { data: sessionData } = await supabase
              .from("sessions")
              .select("subject, session_date")
              .eq("id", payment.session_id)
              .maybeSingle();
            return { ...payment, session: sessionData || undefined };
          })
        );
        setPayments(paymentsWithSessions);

        // Calculate stats
        const completed = paymentsData.filter(p => p.status === "completed");
        const pending = paymentsData.filter(p => p.status === "pending");
        
        setStats({
          totalPaid: completed.reduce((sum, p) => sum + Number(p.amount), 0),
          pendingAmount: pending.reduce((sum, p) => sum + Number(p.amount), 0),
          completedCount: completed.length
        });
      }
    } catch (error) {
      console.error("Error fetching payments:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case "pending":
        return <Clock className="w-4 h-4 text-yellow-600" />;
      case "failed":
      case "refunded":
        return <XCircle className="w-4 h-4 text-red-600" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "failed":
        return "bg-red-100 text-red-800";
      case "refunded":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const handleExportPDF = async () => {
    try {
      setIsExporting(true);

      // Fetch student name from profile
      const { data: studentProfile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", user?.id)
        .maybeSingle();
      
      const studentName = studentProfile?.full_name || "Student";

      // Prepare data for PDF
      const paymentsForPDF = payments.map(payment => ({
        id: payment.id,
        amount: payment.amount,
        status: payment.status,
        payment_date: payment.created_at,
        session_subject: payment.session?.subject,
        payment_method: payment.payment_method || 'Unknown',
        reference: payment.transaction_ref || undefined
      }));

      // Generate PDF content
      const htmlContent = generateStudentPaymentHistoryPDF(paymentsForPDF, studentName);

      // Generate and download PDF
      const filename = `payment-history-${format(new Date(), 'yyyy-MM-dd')}`;
      await generatePDFFromTemplate(htmlContent, filename);

      toast({
        title: "Success",
        description: "Your payment history has been exported as PDF",
      });
    } catch (error) {
      console.error("Error exporting PDF:", error);
      toast({
        title: "Error",
        description: "Failed to export payment history",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">
            Payment History
          </h1>
          <p className="text-muted-foreground mt-1">
            Track your payments and transactions
          </p>
        </div>
        <Button variant="outline" onClick={handleExportPDF} disabled={isExporting}>
          <Download className="w-4 h-4 mr-2" />
          {isExporting ? "Exporting..." : "Export"}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-green-100">
                  <ArrowUpRight className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">GH₵{stats.totalPaid.toFixed(0)}</p>
                  <p className="text-sm text-muted-foreground">Total Paid</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-yellow-100">
                  <Clock className="w-6 h-6 text-yellow-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">GH₵{stats.pendingAmount.toFixed(0)}</p>
                  <p className="text-sm text-muted-foreground">Pending</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-primary/10">
                  <CreditCard className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.completedCount}</p>
                  <p className="text-sm text-muted-foreground">Transactions</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Payment List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : payments.length === 0 ? (
            <div className="text-center py-12">
              <CreditCard className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">No payments yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {payments.map((payment, index) => (
                <motion.div
                  key={payment.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center justify-between p-4 rounded-xl border border-border hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 rounded-lg bg-muted">
                      {getStatusIcon(payment.status)}
                    </div>
                    <div>
                      <p className="font-medium">
                        {payment.session?.subject || "Session Payment"}
                      </p>
                      <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                        <Calendar className="w-3.5 h-3.5" />
                        {format(new Date(payment.created_at), "MMM d, yyyy 'at' h:mm a")}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-lg">GH₵{Number(payment.amount).toFixed(0)}</p>
                    <Badge className={getStatusColor(payment.status)}>
                      {payment.status}
                    </Badge>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
