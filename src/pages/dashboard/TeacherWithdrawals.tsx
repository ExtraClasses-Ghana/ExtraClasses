import React, { useEffect, useState } from "react";
import { TeacherDashboardLayout } from "@/components/dashboard/TeacherDashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion, AnimatePresence, Variants } from "framer-motion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wallet, Smartphone, History, CheckCircle, Clock, Loader2, Send, ArrowUpRight, TrendingUp } from "lucide-react";

// Remote logos provided by product team
const mtnLogoUrl = "https://momodeveloper.mtn.com/content/momo_mtna.png";
const telecelLogoUrl = "https://www.telecel.com.gh/img/Telecel-Icon-Red.png";
const airtelTigoLogoUrl = "https://download.logo.wine/logo/Airtel_Uganda/Airtel_Uganda-Logo.wine.png";

type WithdrawalStatus = "pending" | "withdrawing" | "processing" | "paid";

const NETWORKS = [
  { id: "mtn", label: "MTN Mobile Money", logo: mtnLogoUrl, color: "from-yellow-400 to-yellow-500" },
  { id: "telecel", label: "Telecel Cash", logo: telecelLogoUrl, color: "from-red-500 to-red-600" },
  { id: "airtel", label: "AirtelTigo", logo: airtelTigoLogoUrl, color: "from-blue-500 to-blue-600" },
] as const;

const networkMap = Object.fromEntries(NETWORKS.map((n) => [n.id, n])) as Record<
  string,
  (typeof NETWORKS)[number]
>;

function StatusBadge({ status }: { status: WithdrawalStatus }) {
  const config: Record<
    WithdrawalStatus,
    { label: string; className: string; icon: React.ReactNode }
  > = {
    pending: {
      label: "Pending",
      className: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
      icon: <Clock className="h-3 w-3" />,
    },
    withdrawing: {
      label: "In progress",
      className: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30",
      icon: <Loader2 className="h-3 w-3 animate-spin" />,
    },
    processing: {
      label: "Processing",
      className: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30",
      icon: <Loader2 className="h-3 w-3 animate-spin" />,
    },
    paid: {
      label: "Paid",
      className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
      icon: <CheckCircle className="h-3 w-3" />,
    },
  };
  const { label, className, icon } = config[status] ?? config.pending;
  return (
    <Badge variant="outline" className={`transition-all duration-300 ${className}`}>
      <span className="mr-1">{icon}</span>
      {label}
    </Badge>
  );
}

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100 } }
};

export default function TeacherWithdrawals() {
  const { profile } = useAuth();
  const [amount, setAmount] = useState(0);
  const [method] = useState("mobile_money");
  const [mobileProvider, setMobileProvider] = useState("mtn");
  const [mobileNumber, setMobileNumber] = useState("");
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [availableBalance, setAvailableBalance] = useState<number | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(true);

  const fetchRequests = async () => {
    if (!profile?.user_id) return;
    const { data } = await supabase
      .from("teacher_withdrawals" as any)
      .select("*")
      .eq("teacher_id", profile.user_id)
      .order("created_at", { ascending: false });
    setRequests(data || []);
  };

  const fetchAvailableBalance = async () => {
    if (!profile?.user_id) return;
    setBalanceLoading(true);
    try {
      const { data: completedSessions } = await supabase
        .from("sessions")
        .select("amount")
        .eq("teacher_id", profile.user_id)
        .eq("status", "completed");

      const totalRevenue = (completedSessions || []).reduce((sum, s) => sum + Number(s.amount), 0);

      const { data: withdrawals } = await supabase
        .from("teacher_withdrawals" as any)
        .select("amount, status")
        .eq("teacher_id", profile.user_id)
        .in("status", ["paid", "processing", "withdrawing", "pending"]);

      const totalWithdrawn = (withdrawals || []).reduce((sum, w: any) => sum + Number(w.amount), 0);
      
      const { data: adjustments } = await supabase
        .from("admin_wallet_adjustments")
        .select("amount")
        .eq("teacher_id", profile.user_id);
      
      const totalAdjustments = (adjustments || []).reduce((sum, a) => sum + Number(a.amount), 0);

      setAvailableBalance(Math.max(0, totalRevenue + totalAdjustments - totalWithdrawn));
    } catch (e) {
      console.error("Error fetching balance:", e);
      setAvailableBalance(0);
    } finally {
      setBalanceLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
    fetchAvailableBalance();

    if (!profile?.user_id) return;
    const channel = supabase
      .channel(`teacher-withdrawals-${profile.user_id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "teacher_withdrawals",
          filter: `teacher_id=eq.${profile.user_id}`,
        },
        () => {
          fetchRequests();
          fetchAvailableBalance();
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.user_id]);

  const submitRequest = async () => {
    if (!profile?.user_id || amount <= 0) return;
    const balance = availableBalance ?? 0;
    if (amount > balance) return;
    setLoading(true);
    try {
      const account_details = JSON.stringify({ provider: mobileProvider, number: mobileNumber });

      await supabase.from("teacher_withdrawals" as any).insert([
        {
          teacher_id: profile.user_id,
          amount,
          method,
          account_details,
          status: "pending",
        },
      ]);

      await supabase.from("admin_notifications").insert([
        {
          type: "teacher_withdrawal",
          title: "New withdrawal request",
          message: `${profile.full_name} has requested a withdrawal of GH₵ ${amount}`,
          related_user_id: profile.user_id,
        },
      ]);

      setAmount(0);
      setMobileNumber("");
      setMobileProvider("mtn");
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const selectedNetwork = networkMap[mobileProvider];
  const isValidNumber = /^0\d{9}$/.test(mobileNumber);
  const balance = availableBalance ?? 0;
  const exceedsBalance = amount > balance;
  const canSubmit = amount > 0 && amount <= balance && isValidNumber && !loading;

  return (
    <TeacherDashboardLayout>
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="max-w-4xl mx-auto space-y-6 sm:space-y-8 px-4 sm:px-6 py-6 sm:py-8"
      >
        {/* Page Header */}
        <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold tracking-tight text-foreground bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">
              Withdrawals
            </h1>
            <p className="text-muted-foreground mt-2 max-w-md">
              Securely request payouts from your teaching earnings straight to your Mobile Money account.
            </p>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Form & Balance */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Balance Card Widget */}
            <motion.div variants={itemVariants}>
              <Card className="overflow-hidden border-0 shadow-lg relative bg-white/5 dark:bg-black/20 backdrop-blur-3xl">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-accent/5 to-transparent pointer-events-none" />
                <CardContent className="p-8 relative z-10">
                  <div className="flex items-center justify-between">
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <Wallet className="w-4 h-4 text-primary" /> Available Balance
                      </p>
                      {balanceLoading ? (
                        <div className="h-10 w-32 bg-primary/10 animate-pulse rounded-md" />
                      ) : (
                        <motion.h2 
                          initial={{ scale: 0.9, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          className="text-4xl font-display font-bold text-foreground tracking-tight"
                        >
                          GH₵ {balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </motion.h2>
                      )}
                    </div>
                    <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/30">
                      <TrendingUp className="w-8 h-8 text-white" />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-4 opacity-80">
                    Calculated from completed sessions minus all pending and paid withdrawals.
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            {/* Request Card */}
            <motion.div variants={itemVariants}>
              <Card className="border shadow-lg bg-card/60 backdrop-blur-md transition-all duration-300 hover:shadow-xl hover:border-primary/20">
                <CardHeader className="border-b bg-muted/20 px-6 py-5">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                      <ArrowUpRight className="h-5 w-5" />
                    </div>
                    <CardTitle className="text-xl">Request Payout</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  
                  {/* Amount Input */}
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold text-foreground/80">Withdrawal Amount (GH₵)</Label>
                    <div className="relative group">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium group-focus-within:text-primary transition-colors">
                        GH₵
                      </div>
                      <Input
                        type="number"
                        min={1}
                        step={1}
                        placeholder="ENTER AMOUNT"
                        value={amount || ""}
                        onChange={(e) => setAmount(Number(e.target.value) || 0)}
                        className="pl-12 h-14 text-lg font-bold bg-background/50 border-input transition-all duration-300 focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                    <AnimatePresence>
                      {exceedsBalance && amount > 0 && (
                        <motion.p 
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="text-sm text-destructive font-medium"
                        >
                          Amount exceeds your available balance!
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Network Settings */}
                  <div className="space-y-4 pt-2">
                    <Label className="text-sm font-semibold text-foreground/80 flex items-center gap-2">
                      <Smartphone className="w-4 h-4 text-primary" /> Destination Account
                    </Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      
                      <div className="space-y-2">
                        <Select value={mobileProvider} onValueChange={setMobileProvider}>
                          <SelectTrigger className="h-14 font-medium bg-background/50 border-input hover:border-primary/40 transition-colors">
                            <span className="flex items-center gap-3">
                              {selectedNetwork && (
                                <>
                                  <img src={selectedNetwork.logo} alt="" className="h-6 w-6 object-contain" />
                                  <span className="truncate">{selectedNetwork.label}</span>
                                </>
                              )}
                            </span>
                          </SelectTrigger>
                          <SelectContent>
                            {NETWORKS.map((network) => (
                              <SelectItem key={network.id} value={network.id} className="py-3">
                                <span className="flex items-center gap-3">
                                  <img src={network.logo} alt="" className="h-6 w-6 object-contain" />
                                  <span className="font-medium">{network.label}</span>
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Input
                          type="tel"
                          placeholder="Mobile Number (e.g. 024XXXXXXX)"
                          value={mobileNumber}
                          onChange={(e) => setMobileNumber(e.target.value)}
                          className={`h-14 font-medium transition-all duration-300 ${mobileNumber.length > 0 && !isValidNumber ? "border-destructive focus-visible:ring-destructive" : "bg-background/50 border-input focus:ring-primary/20"}`}
                        />
                      </div>

                    </div>
                  </div>

                </CardContent>
                <CardFooter className="px-6 py-5 bg-muted/10 border-t">
                  <Button
                    onClick={submitRequest}
                    disabled={!canSubmit}
                    className="w-full h-14 text-base font-bold tracking-wide rounded-xl shadow-lg transition-all hover:-translate-y-1 hover:shadow-xl active:translate-y-0 disabled:opacity-50 disabled:hover:translate-y-0"
                  >
                    {loading ? (
                      <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }} className="mr-2">
                        <Loader2 className="h-5 w-5" />
                      </motion.div>
                    ) : (
                      <Send className="h-5 w-5 mr-2" />
                    )}
                    {loading ? "PROCESSING REQUEST..." : "SUBMIT WITHDRAWAL"}
                  </Button>
                </CardFooter>
              </Card>
            </motion.div>
          </div>

          {/* Right Column: History */}
          <motion.div variants={itemVariants} className="lg:col-span-1">
            <Card className="h-full border shadow-lg bg-card/60 backdrop-blur-md flex flex-col">
              <CardHeader className="border-b bg-muted/20 px-6 py-5">
                <div className="flex items-center gap-2 text-primary">
                  <History className="h-5 w-5" />
                  <CardTitle className="text-xl">Recent History</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="flex-1 p-0 overflow-y-auto max-h-[600px] styled-scrollbar">
                {requests.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center p-8 text-center opacity-70">
                    <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                      <Wallet className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <p className="font-semibold text-foreground">No History Found</p>
                    <p className="text-sm text-muted-foreground mt-1">Your recent withdrawals will appear here.</p>
                  </div>
                ) : (
                  <ul className="divide-y divide-border">
                    <AnimatePresence>
                      {requests.map((r, i) => (
                        <motion.li
                          key={r.id}
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.05 }}
                          className="p-5 hover:bg-muted/10 transition-colors cursor-default"
                        >
                          <div className="flex justify-between items-start mb-2">
                            <span className="font-bold text-lg text-foreground tracking-tight">GH₵ {Number(r.amount).toFixed(2)}</span>
                            <StatusBadge status={r.status as WithdrawalStatus} />
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
                            {r.method === "mobile_money" && (
                              <img 
                                src={
                                  (() => {
                                    try { return networkMap[JSON.parse(r.account_details || "{}").provider]?.logo || mtnLogoUrl; } 
                                    catch { return mtnLogoUrl; }
                                  })()
                                } 
                                alt="Network" 
                                className="w-4 h-4 object-contain opacity-70"
                              />
                            )}
                            <span className="truncate uppercase">
                              {(() => {
                                try { return JSON.parse(r.account_details || "{}").provider || "MOMO"; } 
                                catch { return "MOMO (LEGACY)"; }
                              })()}
                            </span>
                            <span>•</span>
                            <span>{new Date(r.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                          </div>
                        </motion.li>
                      ))}
                    </AnimatePresence>
                  </ul>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </motion.div>
    </TeacherDashboardLayout>
  );
}
