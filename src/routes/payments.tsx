import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { RequireAuth } from "@/components/AppShell";
import { useAuth } from "@/lib/auth";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { payments as mockPayments } from "@/lib/mock-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Shield, Wallet, TrendingUp, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/payments")({
  head: () => ({ meta: [{ title: "Payments — TutorShield" }] }),
  component: () => <RequireAuth><Payments /></RequireAuth>,
});

interface PaymentRow {
  id: string;
  tutor: string;
  amount: number;
  status: string;
  date: string;
  method: string;
}

function Payments() {
  const { user } = useAuth();
  const isTutor = user?.role === "tutor";
  const [rows, setRows] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPayments();
  }, [user?.id, user?.role]);

  const loadPayments = async () => {
    setLoading(true);
    if (isSupabaseConfigured && user) {
      const query = supabase
        .from("payments")
        .select("id, tutor_name, amount, status, method, created_at")
        .order("created_at", { ascending: false })
        .limit(20);

      const { data, error } = await (isTutor
        ? query.eq("tutor_id", user.id)
        : query.eq("parent_id", user.id));

      if (!error && data) {
        setRows(
          data.map((p: { id: string; tutor_name: string; amount: number; status: string; method: string; created_at: string }) => ({
            id: p.id,
            tutor: p.tutor_name,
            amount: Number(p.amount),
            status: p.status,
            date: new Date(p.created_at).toLocaleDateString(),
            method: p.method || "Card",
          }))
        );
      } else {
        setRows(mockPayments);
      }
    } else {
      setRows(mockPayments);
    }
    setLoading(false);
  };

  const paidTotal = rows
    .filter((p) => p.status === "Paid")
    .reduce((sum, p) => sum + p.amount, 0);
  const escrowTotal = rows
    .filter((p) => p.status === "In Escrow" || p.status === "Pending")
    .reduce((sum, p) => sum + p.amount, 0);
  const thisMonth = rows
    .filter((p) => {
      const d = new Date(p.date);
      const now = new Date();
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    })
    .reduce((sum, p) => sum + p.amount, 0);

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{isTutor ? "Earnings" : "Payments"}</h1>
        <p className="text-muted-foreground mt-1">
          {isTutor
            ? "Track payouts. Funds release after each verified session."
            : "Secure escrow protects every payment until sessions are verified."}
        </p>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        {[
          { label: isTutor ? "Total earned" : "Total spent", value: `$${paidTotal.toLocaleString()}`, icon: Wallet },
          { label: isTutor ? "Pending payout" : "In escrow", value: `$${escrowTotal.toLocaleString()}`, icon: Shield },
          { label: "This month", value: `$${thisMonth.toLocaleString()}`, icon: TrendingUp },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="pt-6">
              <s.icon className="w-5 h-5 mb-2 text-primary" />
              <div className="text-2xl font-bold">{s.value}</div>
              <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {!isTutor && (
        <Card>
          <CardContent className="pt-6 flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold">Visa •••• 4242</p>
                <p className="text-xs text-muted-foreground">Expires 12/28</p>
              </div>
            </div>
            <Button variant="outline" onClick={() => toast.info("Payment method updates coming soon.")}>
              Update payment method
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Transaction history</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {rows.length === 0 && <p className="text-muted-foreground text-sm">No transactions yet.</p>}
          {rows.map((p) => (
            <div key={p.id} className="flex items-center justify-between p-3 rounded-lg border border-border">
              <div>
                <p className="font-medium">{p.tutor}</p>
                <p className="text-xs text-muted-foreground">{p.date} · {p.method}</p>
              </div>
              <div className="flex items-center gap-3">
                <Badge
                  variant={p.status === "Paid" ? "default" : "secondary"}
                  className={p.status === "Paid" ? "bg-accent text-accent-foreground" : ""}
                >
                  {p.status}
                </Badge>
                <span className="font-semibold w-16 text-right">${p.amount}</span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
