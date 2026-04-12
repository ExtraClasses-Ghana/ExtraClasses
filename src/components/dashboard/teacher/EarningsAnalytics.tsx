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

  // Realtime subscription for sessions and withdrawals
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`teacher_earnings_${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "sessions",
          filter: `teacher_id=eq.${user.id}`,
        },
        (payload) => {
          console.log("Realtime session update for earnings:", payload);
          fetchEarnings();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "teacher_withdrawals",
          filter: `teacher_id=eq.${user.id}`,
        },
        (payload) => {
          console.log("Realtime withdrawal update for earnings:", payload);
          fetchEarnings();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const fetchEarnings = async () => {
    if (!user?.id) return;
    
    try {
      // Get teacher profile stats
      const { data: teacherProfile } = await supabase
        .from("teacher_profiles")
        .select("total_earnings")
        .eq("user_id", user.id)
        .maybeSingle();

      // Get completed sessions (earnings)
      const { data: completedSessionsRaw } = await supabase
        .from("sessions")
        .select("id, amount, session_date, subject, status")
        .eq("teacher_id", user.id)
        .eq("status", "completed")
        .order("session_date", { ascending: false })
        .limit(20);
        
      const completedSessions = (completedSessionsRaw || []) as any[];

      // Get wallet adjustments
      const { data: adjustmentsRaw } = await supabase
        .from("admin_wallet_adjustments")
        .select("id, amount, created_at, reason")
        .eq("teacher_id", user.id)
        .order("created_at", { ascending: false });
        
      const adjustments = (adjustmentsRaw || []) as any[];

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

        // Include adjustments into earnings history and calculations
        let combinedEarnings = [...earningsData];
        let totalAdjustments = 0;

        if (adjustments) {
          totalAdjustments = adjustments.reduce((sum, a) => sum + Number(a.amount), 0);
          
          const mappedAdjustments = adjustments.map(adj => ({
            id: adj.id,
            amount: Number(adj.amount),
            created_at: adj.created_at,
            session: {
              subject: adj.amount < 0 ? `Debit: ${adj.reason}` : `Credit / Bonus: ${adj.reason}`,
              session_date: adj.created_at
            }
          }));

          combinedEarnings = [...combinedEarnings, ...mappedAdjustments]
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            .slice(0, 30);
        }

        setEarnings(combinedEarnings);
        const sessionEarningsTotal = completedSessions.reduce((sum, s) => sum + Number(s.amount), 0);

        setStats({
          totalEarnings: sessionEarningsTotal + totalAdjustments,
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
    if (!user?.id) return;
    
    try {
      setIsExporting(true);

      // Prepare data for PDF - get teacher name from profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", user.id)
        .maybeSingle();

      const teacherProfileCast = profileData as any;
      const teacherName = teacherProfileCast?.full_name || "Teacher";

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
        <Button variant="outline" onClick={handleExportPDF} disabled={isExporting} className="gap-2 hover:scale-105 transition-all duration-200 hover:shadow-md p-2">
          <img src="/pdf-icon.png" alt="PDF" className="w-[50px] h-[50px]" />
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
                    <div className={`p-2 rounded-lg ${earning.amount >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                      <ArrowUpRight className={`w-4 h-4 ${earning.amount >= 0 ? 'text-green-600' : 'text-red-600'}`} />
                    </div>
                    <div>
                      <p className="font-medium">
                        {earning.session?.subject}
                      </p>
                      <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                        <Calendar className="w-3.5 h-3.5" />
                        {format(new Date(earning.created_at), "MMM d, yyyy")}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-semibold text-lg ${earning.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {earning.amount >= 0 ? '+' : ''}GH₵{earning.amount.toFixed(2)}
                    </p>
                    <Badge className={earning.amount >= 0 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                      {earning.amount >= 0 ? 'Completed' : 'Debited'}
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
