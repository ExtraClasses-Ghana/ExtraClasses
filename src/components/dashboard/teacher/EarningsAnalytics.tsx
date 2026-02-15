import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  DollarSign, 
  TrendingUp,
  ArrowUpRight,
  Calendar,
  Download,
  CreditCard
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { generateTeacherEarningsPDF } from "@/lib/teacherEarningsPDF";
import { generatePDFFromTemplate } from "@/lib/pdfExport";
import { useToast } from "@/hooks/use-toast";

interface EarningEntry {
  id: string;
  amount: number;
  created_at: string;
  session: {
    subject: string;
    session_date: string;
  } | null;
}

interface EarningsStats {
  totalEarnings: number;
  thisMonthEarnings: number;
  lastMonthEarnings: number;
  pendingPayouts: number;
}

export function EarningsAnalytics() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [earnings, setEarnings] = useState<EarningEntry[]>([]);
  const [stats, setStats] = useState<EarningsStats>({
    totalEarnings: 0,
    thisMonthEarnings: 0,
    lastMonthEarnings: 0,
    pendingPayouts: 0
  });
  const [loading, setLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    if (user) {
      fetchEarnings();
    }
  }, [user]);

  const fetchEarnings = async () => {
    try {
      // Get teacher profile stats
      const { data: teacherProfile } = await supabase
        .from("teacher_profiles")
        .select("total_earnings")
        .eq("user_id", user?.id)
        .maybeSingle();

      // Get completed sessions (earnings)
      const { data: completedSessions } = await supabase
        .from("sessions")
        .select("id, amount, session_date, subject, status")
        .eq("teacher_id", user?.id)
        .eq("status", "completed")
        .order("session_date", { ascending: false })
        .limit(20);

      if (completedSessions) {
        const earningsData = completedSessions.map(session => ({
          id: session.id,
          amount: Number(session.amount),
          created_at: session.session_date,
          session: {
            subject: session.subject,
            session_date: session.session_date
          }
        }));
        setEarnings(earningsData);

        // Calculate monthly stats
        const now = new Date();
        const thisMonthStart = startOfMonth(now);
        const thisMonthEnd = endOfMonth(now);
        const lastMonthStart = startOfMonth(subMonths(now, 1));
        const lastMonthEnd = endOfMonth(subMonths(now, 1));

        const thisMonthEarnings = completedSessions
          .filter(s => {
            const date = new Date(s.session_date);
            return date >= thisMonthStart && date <= thisMonthEnd;
          })
          .reduce((sum, s) => sum + Number(s.amount), 0);

        const lastMonthEarnings = completedSessions
          .filter(s => {
            const date = new Date(s.session_date);
            return date >= lastMonthStart && date <= lastMonthEnd;
          })
          .reduce((sum, s) => sum + Number(s.amount), 0);

        setStats({
          totalEarnings: Number(teacherProfile?.total_earnings) || 0,
          thisMonthEarnings,
          lastMonthEarnings,
          pendingPayouts: 0
        });
      }
    } catch (error) {
      console.error("Error fetching earnings:", error);
    } finally {
      setLoading(false);
    }
  };

  const growthPercentage = stats.lastMonthEarnings > 0
    ? ((stats.thisMonthEarnings - stats.lastMonthEarnings) / stats.lastMonthEarnings * 100).toFixed(1)
    : 0;

  const handleExportPDF = async () => {
    try {
      setIsExporting(true);

      // Prepare data for PDF - get teacher name from profile
      const { data: teacherProfile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", user?.id)
        .maybeSingle();

      const teacherName = teacherProfile?.full_name || "Teacher";

      // Prepare earnings data for PDF
      const earningsForPDF = earnings.map(earning => ({
        id: earning.id,
        amount: earning.amount,
        session_date: earning.created_at,
        status: 'completed',
        student_name: 'Session',
        subject: earning.session?.subject || 'Unknown'
      }));

      // Generate PDF content
      const htmlContent = generateTeacherEarningsPDF(earningsForPDF, teacherName);

      // Generate and download PDF
      const filename = `earnings-report-${format(new Date(), 'yyyy-MM-dd')}`;
      await generatePDFFromTemplate(htmlContent, filename);

      toast({
        title: "Success",
        description: "Your earnings report has been exported as PDF",
      });
    } catch (error) {
      console.error("Error exporting PDF:", error);
      toast({
        title: "Error",
        description: "Failed to export earnings report",
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
            Earnings Analytics
          </h1>
          <p className="text-muted-foreground mt-1">
            Track your teaching income and payouts
          </p>
        </div>
        <Button variant="outline" onClick={handleExportPDF} disabled={isExporting}>
          <Download className="w-4 h-4 mr-2" />
          {isExporting ? "Exporting..." : "Export Report"}
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="bg-gradient-to-br from-green-50 to-green-100/50 border-green-200">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-green-500/20">
                  <DollarSign className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-700">
                    GH₵{stats.totalEarnings.toFixed(0)}
                  </p>
                  <p className="text-sm text-green-600/80">Total Earnings</p>
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
                <div className="p-3 rounded-xl bg-primary/10">
                  <Calendar className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">GH₵{stats.thisMonthEarnings.toFixed(0)}</p>
                  <p className="text-sm text-muted-foreground">This Month</p>
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
                <div className="p-3 rounded-xl bg-secondary/10">
                  <TrendingUp className="w-6 h-6 text-secondary" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-2xl font-bold">{growthPercentage}%</p>
                    {Number(growthPercentage) >= 0 && (
                      <ArrowUpRight className="w-4 h-4 text-green-600" />
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">Growth</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-yellow-100">
                  <CreditCard className="w-6 h-6 text-yellow-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">GH₵{stats.pendingPayouts.toFixed(0)}</p>
                  <p className="text-sm text-muted-foreground">Pending Payout</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Earnings History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Recent Earnings</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : earnings.length === 0 ? (
            <div className="text-center py-12">
              <DollarSign className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">No earnings yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Complete sessions to start earning
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {earnings.map((earning, index) => (
                <motion.div
                  key={earning.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center justify-between p-4 rounded-xl border border-border hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 rounded-lg bg-green-100">
                      <ArrowUpRight className="w-4 h-4 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium">
                        {earning.session?.subject || "Session"} Lesson
                      </p>
                      <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                        <Calendar className="w-3.5 h-3.5" />
                        {format(new Date(earning.created_at), "MMM d, yyyy")}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-lg text-green-600">
                      +GH₵{earning.amount.toFixed(0)}
                    </p>
                    <Badge className="bg-green-100 text-green-800">Completed</Badge>
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
