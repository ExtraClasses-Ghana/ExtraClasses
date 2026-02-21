import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import mtnLogo from "@/assets/MTN.png";
import telecelLogo from "@/assets/Telecel-icon-red.png";
import atghanaLogo from "@/assets/ATghana.png";

const STATUS: Array<{ value: string; label: string }> = [
  { value: "pending", label: "Pending" },
  { value: "withdrawing", label: "Withdrawing" },
  { value: "processing", label: "Processing" },
  { value: "paid", label: "Paid" },
];

export default function AdminTWRPage() {
  const [requests, setRequests] = useState<any[]>([]);
  const [selected, setSelected] = useState<any | null>(null);
  const [note, setNote] = useState("");

  const fetch = async () => {
    const { data } = await supabase.from("teacher_withdrawals").select("*, teachers:teacher_profiles(*)").order("created_at", { ascending: false });
    setRequests(data || []);
  };

  useEffect(() => {
    fetch();
    const channel = supabase
      .channel("admin-twr")
      .on("postgres_changes", { event: "*", schema: "public", table: "teacher_withdrawals" }, () => fetch())
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  const updateStatus = async (id: string, status: string) => {
    await supabase.from("teacher_withdrawals").update({ status, admin_notes: note, processed_by: "admin" }).eq("id", id);
    setNote("");
  };

  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <div className="p-4 sm:p-6 max-w-5xl mx-auto">
        <h2 className="text-lg sm:text-xl font-semibold">Teacher Withdrawal Requests (TWR)</h2>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">Manage and process withdrawal requests from teachers.</p>

        <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          <div className="lg:col-span-2 space-y-3 min-w-0">
            {requests.map((r) => {
              let accountDisplay = r.account_details || "";
              try {
                const parsed = typeof accountDisplay === "string" && accountDisplay.startsWith("{") ? JSON.parse(accountDisplay) : null;
                if (parsed && parsed.provider && parsed.number) {
                  const logo = parsed.provider === "mtn" ? mtnLogo : parsed.provider === "telecel" ? telecelLogo : atghanaLogo;
                  accountDisplay = (
                    <div className="flex items-center gap-2">
                      <img src={logo} alt={parsed.provider} className="h-5 w-5 sm:h-6 sm:w-6 object-contain shrink-0" />
                      <span className="truncate">{parsed.number}</span>
                    </div>
                  );
                }
              } catch (e) {
                // leave as string
              }

              return (
                <div
                  key={r.id}
                  className={`p-3 sm:p-4 border rounded-lg flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 ${selected?.id === r.id ? "ring-2 ring-primary" : ""}`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">GH₵ {r.amount.toFixed(2)}</div>
                    <div className="text-xs sm:text-sm text-muted-foreground truncate">{r.method} • {new Date(r.created_at).toLocaleString()}</div>
                    <div className="text-xs sm:text-sm mt-1 truncate">Teacher: {r.teachers?.full_name || r.teacher_id}</div>
                    <div className="text-xs sm:text-sm mt-1">{accountDisplay}</div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="capitalize font-medium text-sm">{r.status}</span>
                    <Button size="sm" onClick={() => setSelected(r)} className="min-h-[36px]">Manage</Button>
                  </div>
                </div>
              );
            })}
          </div>

          <aside className="lg:sticky lg:top-4 h-fit p-4 border rounded-lg bg-card">
            <h4 className="font-semibold text-base">Manage Request</h4>
            {selected ? (
              <div className="space-y-3 mt-3">
                <div className="text-sm">Amount: GH₵ {selected.amount.toFixed(2)}</div>
                <div className="text-sm truncate">Teacher: {selected.teachers?.full_name || selected.teacher_id}</div>
                <div className="text-xs sm:text-sm">Account: {
                  (() => {
                    try {
                      const ad = typeof selected.account_details === "string" && selected.account_details.startsWith("{") ? JSON.parse(selected.account_details) : null;
                      if (ad && ad.provider && ad.number) {
                        const logo = ad.provider === "mtn" ? mtnLogo : ad.provider === "telecel" ? telecelLogo : atghanaLogo;
                        return (<span className="flex items-center gap-2"><img src={logo} alt={ad.provider} className="h-5 shrink-0" />{ad.number}</span>);
                      }
                    } catch (e) {}
                    return selected.account_details || "-";
                  })()
                }</div>
                <label className="block text-sm mt-2">Status</label>
                <Select defaultValue={selected.status} onChange={(e) => updateStatus(selected.id, e.target.value)} className="w-full">
                  {STATUS.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </Select>
                <label className="block text-sm mt-2">Admin Note</label>
                <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional note" className="w-full" />
                <div className="flex flex-col-reverse sm:flex-row gap-2 mt-3">
                  <Button variant="ghost" onClick={() => setSelected(null)} className="w-full sm:w-auto">Close</Button>
                  <Button onClick={() => updateStatus(selected.id, selected.status)} className="w-full sm:w-auto">Save</Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground mt-3">Select a request to manage it.</p>
            )}
          </aside>
        </div>
      </div>
    </ProtectedRoute>
  );
}
