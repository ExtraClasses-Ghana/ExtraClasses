import React, { useEffect, useState } from "react";
import { TeacherDashboardLayout } from "@/components/dashboard/TeacherDashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Wallet, Smartphone, History, CheckCircle, Clock, Loader2, Send } from "lucide-react";
import mtnLogo from "@/assets/MTN.png";
import telecelLogo from "@/assets/Telecel-icon-red.png";
import atghanaLogo from "@/assets/ATghana.png";

type WithdrawalStatus = "pending" | "withdrawing" | "processing" | "paid";

const NETWORKS = [
  { id: "mtn", label: "MTN Mobile Money", logo: mtnLogo },
  { id: "telecel", label: "Telecel (Vodafone) Cash", logo: telecelLogo },
  { id: "atghana", label: "AT Ghana", logo: atghanaLogo },
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
    <Badge variant="outline" className={className}>
      <span className="mr-1">{icon}</span>
      {label}
    </Badge>
  );
}

export default function TeacherWithdrawals() {
  const { profile } = useAuth();
  const [amount, setAmount] = useState(0);
  const [method] = useState("mobile_money");
  const [accountDetails, setAccountDetails] = useState("");
  const [mobileProvider, setMobileProvider] = useState("mtn");
  const [mobileNumber, setMobileNumber] = useState("");
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [availableBalance, setAvailableBalance] = useState<number | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(true);

  const fetchRequests = async () => {
    if (!profile?.user_id) return;
    const { data } = await supabase
      .from("teacher_withdrawals")
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
        .from("teacher_withdrawals")
        .select("amount, status")
        .eq("teacher_id", profile.user_id)
        .in("status", ["paid", "processing", "withdrawing", "pending"]);

      const totalWithdrawn = (withdrawals || []).reduce((sum, w) => sum + Number(w.amount), 0);

      setAvailableBalance(Math.max(0, totalRevenue - totalWithdrawn));
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

    return () => supabase.removeChannel(channel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.user_id]);

  const submitRequest = async () => {
    if (!profile?.user_id || amount <= 0) return;
    const balance = availableBalance ?? 0;
    if (amount > balance) return;
    setLoading(true);
    try {
      const account_details =
        method === "mobile_money"
          ? JSON.stringify({ provider: mobileProvider, number: mobileNumber })
          : accountDetails;

      await supabase.from("teacher_withdrawals").insert([
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
      setAccountDetails("");
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
      <div className="max-w-3xl mx-auto space-y-6 sm:space-y-8 px-4 sm:px-6 py-4 sm:py-6">
        {/* Page header */}
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">Withdrawals</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Request payouts from your earnings. We process withdrawals to your Mobile Money account.
          </p>
        </div>

        {/* Request withdrawal card */}
        <Card className="overflow-hidden border-2 shadow-sm bg-card">
          <div className="bg-gradient-to-br from-primary/5 via-transparent to-primary/10 dark:from-primary/10 dark:to-transparent">
            <CardHeader className="pb-4 px-4 sm:px-6">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Wallet className="h-6 w-6" />
                </div>
                <div className="min-w-0">
                  <CardTitle className="text-lg sm:text-xl">Request withdrawal</CardTitle>
                  <CardDescription className="text-sm">
                    Choose amount and Mobile Money details. Admin will review and process your request.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
          </div>
          <CardContent className="space-y-6 pt-6 px-4 sm:px-6">
            {/* Available balance */}
            <div className="rounded-lg border bg-muted/30 px-3 sm:px-4 py-3 flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-medium text-muted-foreground">Available balance</span>
              {balanceLoading ? (
                <span className="text-sm text-muted-foreground">Loading…</span>
              ) : (
                <span className="text-base sm:text-lg font-semibold text-foreground tabular-nums">
                  GH₵ {balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground -mt-4">
              Available balance = earnings from completed sessions minus all withdrawal requests (pending, processing, or paid).
            </p>

            {/* Amount */}
            <div className="space-y-2">
              <Label htmlFor="amount">Amount (GH₵)</Label>
              <Input
                id="amount"
                type="number"
                min={1}
                step={1}
                placeholder="e.g. 100"
                value={amount || ""}
                onChange={(e) => setAmount(Number(e.target.value) || 0)}
                className="h-12 text-base font-medium"
              />
              {exceedsBalance && amount > 0 && (
                <p className="text-sm text-destructive font-medium">
                  Amount exceeds your available balance (GH₵ {balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}).
                </p>
              )}
            </div>

            {/* Mobile Money section */}
            <div className="rounded-xl border bg-muted/30 p-3 sm:p-4 space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Smartphone className="h-4 w-4 text-primary" />
                Mobile Money (MOMO)
              </div>
              <p className="text-xs text-muted-foreground -mt-2">
                Select your network and enter the mobile number to receive funds.
              </p>

              {/* Network dropdown with PNG logos */}
              <div className="space-y-2">
                <Label>Network</Label>
                <Select value={mobileProvider} onValueChange={setMobileProvider}>
                  <SelectTrigger className="h-12 w-full rounded-lg border-2 bg-background px-3 sm:px-4 hover:border-primary/50 transition-colors min-w-0">
                    <span className="flex items-center gap-2 sm:gap-3 min-w-0">
                      {selectedNetwork && (
                        <>
                          <img
                            src={selectedNetwork.logo}
                            alt=""
                            className="h-6 w-6 sm:h-7 sm:w-7 object-contain flex-shrink-0"
                          />
                          <span className="font-medium truncate">{selectedNetwork.label}</span>
                        </>
                      )}
                    </span>
                  </SelectTrigger>
                  <SelectContent className="min-w-[280px]">
                    {NETWORKS.map((network) => (
                      <SelectItem
                        key={network.id}
                        value={network.id}
                        className="py-3 cursor-pointer focus:bg-primary/10"
                      >
                        <span className="flex items-center gap-3">
                          <img
                            src={network.logo}
                            alt=""
                            className="h-6 w-6 object-contain flex-shrink-0"
                          />
                          <span>{network.label}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Mobile number */}
              <div className="space-y-2">
                <Label htmlFor="mobile">Mobile number</Label>
                <Input
                  id="mobile"
                  type="tel"
                  placeholder="e.g. 0244123456"
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value)}
                  className="h-12"
                />
                <p className="text-xs text-muted-foreground">
                  Enter the number with leading zero (10 digits).
                </p>
              </div>
            </div>
          </CardContent>
          <CardFooter className="border-t bg-muted/20 pt-6 px-4 sm:px-6">
            <Button
              onClick={submitRequest}
              disabled={!canSubmit}
              className="w-full sm:w-auto h-11 px-6 font-medium gap-2 min-h-[44px]"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Sending request…
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Send withdrawal request
                </>
              )}
            </Button>
          </CardFooter>
        </Card>

        {/* Request history */}
        <Card>
          <CardHeader className="px-4 sm:px-6">
            <div className="flex items-center gap-2">
              <History className="h-5 w-5 text-muted-foreground shrink-0" />
              <CardTitle className="text-base sm:text-lg">Your requests</CardTitle>
            </div>
            <CardDescription className="text-sm">Recent withdrawal requests and their status.</CardDescription>
          </CardHeader>
          <CardContent className="px-4 sm:px-6">
            {requests.length === 0 ? (
              <div className="rounded-xl border border-dashed bg-muted/30 py-8 sm:py-12 text-center px-4">
                <Wallet className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-60" />
                <p className="text-sm font-medium text-muted-foreground">No withdrawal requests yet</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Submit a request above when you’re ready to withdraw.
                </p>
              </div>
            ) : (
              <ul className="space-y-3">
                {requests.map((r) => (
                  <li
                    key={r.id}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 rounded-lg border bg-card p-3 sm:p-4 hover:bg-muted/20 transition-colors"
                  >
                    <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                      <div className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary font-semibold text-xs sm:text-sm">
                        GH₵
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-foreground">
                          GH₵ {Number(r.amount).toFixed(2)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {r.method === "mobile_money" ? "Mobile Money" : r.method} •{" "}
                          {new Date(r.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="shrink-0">
                      <StatusBadge status={r.status as WithdrawalStatus} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </TeacherDashboardLayout>
  );
}
