import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { RequireAuth } from "@/components/AppShell";
import { useAuth } from "@/lib/auth";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { messages as mockMessages } from "@/lib/mock-data";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ShieldAlert, Send, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/messages")({
  head: () => ({ meta: [{ title: "Messages — TutorShield" }] }),
  component: () => <RequireAuth><Messages /></RequireAuth>,
});

const FLAGGED = ["meet outside", "cash only", "off platform", "whatsapp", "private number"];

interface Message {
  id: string;
  from: "parent" | "tutor";
  text: string;
  time: string;
}

function Messages() {
  const { user } = useAuth();
  const [msgs, setMsgs] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const isTutor = user?.role === "tutor";
  const contactName = isTutor ? "Ayesha Khan" : "Daniel Okafor";
  const contactAvatar = isTutor
    ? "https://api.dicebear.com/9.x/notionists/svg?seed=ayesha"
    : "https://api.dicebear.com/9.x/notionists/svg?seed=daniel";

  useEffect(() => {
    loadMessages();
  }, [user?.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs]);

  const loadMessages = async () => {
    setLoading(true);
    if (isSupabaseConfigured && user) {
      const { data, error } = await supabase
        .from("messages")
        .select("id, sender_role, text, created_at")
        .order("created_at", { ascending: true })
        .limit(50);

      if (!error && data && data.length > 0) {
        setMsgs(
          data.map((m: { id: string; sender_role: string; text: string; created_at: string }) => ({
            id: m.id,
            from: m.sender_role as "parent" | "tutor",
            text: m.text,
            time: new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          }))
        );
      } else {
        setMsgs(mockMessages);
      }
    } else {
      setMsgs(mockMessages);
    }
    setLoading(false);
  };

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !user) return;

    const lower = text.toLowerCase();
    if (FLAGGED.some((f) => lower.includes(f))) {
      toast.error("Message flagged by AI safety moderation. Please keep communication on-platform.");
      return;
    }

    const senderRole = user.role;
    const newMsg: Message = {
      id: crypto.randomUUID(),
      from: senderRole,
      text: text.trim(),
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setSending(true);
    try {
      if (isSupabaseConfigured) {
        const { error } = await supabase.from("messages").insert({
          sender_id: user.id,
          sender_role: senderRole,
          text: newMsg.text,
        });
        if (error) throw error;
        await loadMessages();
      } else {
        setMsgs((prev) => [...prev, newMsg]);
      }
      setText("");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to send message";
      toast.error(message);
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-3xl font-bold">Messages</h1>
          <p className="text-muted-foreground mt-1">All conversations are AI-moderated for safety.</p>
        </div>
        <Badge className="bg-accent/20 text-accent-foreground gap-1">
          <Sparkles className="w-3 h-3" />AI moderation on
        </Badge>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="border-b border-border p-4 flex items-center gap-3">
            <img src={contactAvatar} className="w-10 h-10 rounded-full bg-muted" alt="" />
            <div className="flex-1">
              <p className="font-semibold">{contactName}</p>
              <p className="text-xs text-muted-foreground">
                {isTutor ? "Parent" : "Mathematics tutor"} · online
              </p>
            </div>
          </div>
          <div className="h-[450px] overflow-y-auto p-4 space-y-3 bg-muted/30">
            {msgs.map((m) => {
              const isMine = m.from === user?.role;
              return (
                <div key={m.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                      isMine ? "bg-primary text-primary-foreground" : "bg-card border border-border"
                    }`}
                  >
                    <p className="text-sm">{m.text}</p>
                    <p className={`text-[10px] mt-1 ${isMine ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                      {m.time}
                    </p>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>
          <form onSubmit={send} className="border-t border-border p-3 flex gap-2">
            <Input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Type a message…"
              disabled={sending}
            />
            <Button type="submit" size="icon" disabled={sending || !text.trim()}>
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="border-warning/40 bg-warning/5">
        <CardContent className="pt-6 flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-warning shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold">Stay safe on-platform</p>
            <p className="text-muted-foreground mt-1">
              Our AI scans messages for off-platform contact, payment shortcuts, and inappropriate content.
              Flagged messages are blocked instantly.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
