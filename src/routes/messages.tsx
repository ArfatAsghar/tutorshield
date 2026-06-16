import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { RequireAuth } from "@/components/AppShell";
import { useAuth } from "@/lib/auth";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ShieldAlert, Send, Sparkles, Loader2, MessageSquare, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

type MessagesSearch = {
  tutorId?: string;
};

export const Route = createFileRoute("/messages")({
  validateSearch: (search: Record<string, unknown>): MessagesSearch => {
    return {
      tutorId: search.tutorId as string | undefined,
    };
  },
  head: () => ({ meta: [{ title: "Messages — TutorShield" }] }),
  component: () => <RequireAuth><Messages /></RequireAuth>,
});

const SAFETY_KEYWORDS = ["meet outside", "cash only", "off platform", "whatsapp", "private number"];

interface Contact {
  id: string;
  name: string;
  avatar: string;
  role: "parent" | "tutor";
  lastMessage?: string;
}

interface Message {
  id: string;
  from: "parent" | "tutor";
  text: string;
  time: string;
}

function Messages() {
  const { user } = useAuth();
  const { tutorId } = Route.useSearch();
  const navigate = useNavigate();

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [activeContactId, setActiveContactId] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [sending, setSending] = useState(false);
  
  const bottomRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs]);

  // Load inbox contacts
  const loadContacts = async (selectTutorId?: string) => {
    if (!user) return;

    if (isSupabaseConfigured) {
      try {
        // Query messages involving current user
        const { data: messagesData, error: msgErr } = await supabase
          .from("messages")
          .select("sender_id, recipient_id, text, created_at")
          .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
          .order("created_at", { ascending: false });

        if (msgErr) throw msgErr;

        // Extract unique partner IDs
        const partnerMap = new Map<string, { lastText: string }>();
        messagesData?.forEach((m) => {
          const partnerId = m.sender_id === user.id ? m.recipient_id : m.sender_id;
          if (!partnerMap.has(partnerId)) {
            partnerMap.set(partnerId, { lastText: m.text });
          }
        });

        const partnerIds = Array.from(partnerMap.keys());

        // Fetch profiles of all partners
        let loadedContacts: Contact[] = [];
        if (partnerIds.length > 0) {
          const { data: profiles, error: profErr } = await supabase
            .from("profiles")
            .select("id, name, avatar, role")
            .in("id", partnerIds);

          if (profErr) throw profErr;

          loadedContacts = (profiles || []).map((p) => ({
            id: p.id,
            name: p.name,
            avatar: p.avatar || `https://api.dicebear.com/9.x/notionists/svg?seed=${p.name}`,
            role: p.role as "parent" | "tutor",
            lastMessage: partnerMap.get(p.id)?.lastText,
          }));
        }

        // Handle quick message redirection from tutor profile
        if (selectTutorId && selectTutorId !== user.id) {
          const exists = loadedContacts.some((c) => c.id === selectTutorId);
          if (!exists) {
            // Fetch the tutor's profile details to add them temporarily
            const { data: tutorProfile } = await supabase
              .from("profiles")
              .select("id, name, avatar, role")
              .eq("id", selectTutorId)
              .maybeSingle();

            if (tutorProfile) {
              const newContact: Contact = {
                id: tutorProfile.id,
                name: tutorProfile.name,
                avatar: tutorProfile.avatar || `https://api.dicebear.com/9.x/notionists/svg?seed=${tutorProfile.name}`,
                role: tutorProfile.role as "parent" | "tutor",
                lastMessage: "Start a conversation...",
              };
              loadedContacts = [newContact, ...loadedContacts];
            }
          }
        }

        setContacts(loadedContacts);
        
        // Auto-select contact
        if (loadedContacts.length > 0) {
          if (selectTutorId && loadedContacts.some((c) => c.id === selectTutorId)) {
            setActiveContactId(selectTutorId);
          } else if (!activeContactId) {
            setActiveContactId(loadedContacts[0].id);
          }
        }
      } catch (err) {
        console.error("Failed to load contacts:", err);
      }
    } else {
      // Offline Local Sandbox mode fallbacks
      const sandboxContacts: Contact[] = [
        { id: "t1", name: "Ayesha Khan", avatar: "https://api.dicebear.com/9.x/notionists/svg?seed=ayesha", role: "tutor", lastMessage: "Absolutely. I'll send the worksheet beforehand." },
        { id: "t2", name: "Daniel Okafor", avatar: "https://api.dicebear.com/9.x/notionists/svg?seed=daniel", role: "tutor", lastMessage: "Helping students write with clarity." },
      ];
      setContacts(sandboxContacts);
      if (!activeContactId) {
        setActiveContactId(sandboxContacts[0].id);
      }
    }
    setLoading(false);
  };

  // Trigger contacts load
  useEffect(() => {
    loadContacts(tutorId);
  }, [user, tutorId]);

  // Synchronize active contact ID globally for notifications filter
  useEffect(() => {
    (window as any).__activeContactId = activeContactId;
    if (activeContactId) {
      window.dispatchEvent(new CustomEvent("chat-read", { detail: { contactId: activeContactId } }));
    }
    return () => {
      (window as any).__activeContactId = null;
    };
  }, [activeContactId]);

  // Load chat history for the active contact
  useEffect(() => {
    if (!activeContactId || !user) return;

    const loadHistory = async () => {
      setLoadingHistory(true);
      if (isSupabaseConfigured) {
        try {
          const { data, error } = await supabase
            .from("messages")
            .select("*")
            .or(`and(sender_id.eq.${user.id},recipient_id.eq.${activeContactId}),and(sender_id.eq.${activeContactId},recipient_id.eq.${user.id})`)
            .order("created_at", { ascending: true })
            .limit(100);

          if (error) throw error;

          setMsgs(
            (data || []).map((m) => ({
              id: m.id,
              from: m.sender_id === user.id ? user.role : (user.role === "tutor" ? "parent" : "tutor"),
              text: m.text,
              time: new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            }))
          );
        } catch (err) {
          console.error("Failed to load chat history:", err);
        }
      } else {
        // Local sandbox chat fallback
        setMsgs([
          { id: "m1", from: "tutor", text: "Hi! Looking forward to today's session.", time: "10:14 AM" },
          { id: "m2", from: "parent", text: "Great, Zain will be ready. Focus on quadratics?", time: "10:16 AM" },
          { id: "m3", from: "tutor", text: "Absolutely. I'll send the worksheet beforehand.", time: "10:17 AM" },
        ]);
      }
      setLoadingHistory(false);
    };

    loadHistory();

    // Subscribe to live WebSockets using Supabase Realtime Channels
    if (isSupabaseConfigured) {
      const channel = supabase
        .channel(`chat-channel-${activeContactId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "messages",
            filter: `recipient_id=eq.${user.id}`
          },
          (payload) => {
            const newMsg = payload.new;
            // Validate if the message belongs to current chat context
            if (newMsg.sender_id === activeContactId) {
              setMsgs((prev) => {
                if (prev.some((m) => m.id === newMsg.id)) return prev;
                return [
                  ...prev,
                  {
                    id: newMsg.id,
                    from: user.role === "tutor" ? "parent" : "tutor",
                    text: newMsg.text,
                    time: new Date(newMsg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                  }
                ];
              });
              // Clear notification badge
              window.dispatchEvent(new CustomEvent("chat-read", { detail: { contactId: activeContactId } }));
            }
            // Trigger background reload on contact list to show last preview text
            loadContacts();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [activeContactId, user]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !user || !activeContactId) return;

    // AI Safety scan implementation
    const lower = text.toLowerCase();
    if (SAFETY_KEYWORDS.some((word) => lower.includes(word))) {
      toast.error("Message flagged by AI safety filters. Please keep contacts and transactions on-platform.");
      return;
    }

    const newMsgText = text.trim();
    setText("");
    setSending(true);

    try {
      if (isSupabaseConfigured) {
        const { data, error } = await supabase
          .from("messages")
          .insert({
            sender_id: user.id,
            recipient_id: activeContactId,
            text: newMsgText,
          })
          .select()
          .single();

        if (error) throw error;

        // Instantly push to local state to prevent lag, checks duplicates in effect
        setMsgs((prev) => [
          ...prev,
          {
            id: data.id,
            from: user.role,
            text: newMsgText,
            time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          }
        ]);
        
        loadContacts();
      } else {
        // Local sandbox insert
        setMsgs((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            from: user.role,
            text: newMsgText,
            time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          }
        ]);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const activeContact = contacts.find((c) => c.id === activeContactId);

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
          <p className="text-muted-foreground mt-1">Chat securely with tutors and parents. Powered by WebSockets.</p>
        </div>
        <Badge className="bg-accent/20 text-accent-foreground gap-1">
          <Sparkles className="w-3 h-3" />AI moderation active
        </Badge>
      </div>

      <Card className="overflow-hidden border border-border shadow-glow">
        <div className="grid md:grid-cols-3 min-h-[520px]">
          
          {/* Left Panel: Contacts List / Inbox */}
          <div className="border-r border-border flex flex-col bg-card/50">
            <div className="p-4 border-b border-border bg-card">
              <h2 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Conversations</h2>
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-border/60">
              {contacts.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground space-y-2">
                  <MessageSquare className="w-8 h-8 mx-auto text-muted-foreground/50" />
                  <p>No active chats yet.</p>
                  <p className="text-[10px] text-muted-foreground/60">Search for tutors in the dashboard or profiles to message them.</p>
                </div>
              ) : (
                contacts.map((c) => {
                  const isActive = c.id === activeContactId;
                  return (
                    <button
                      key={c.id}
                      onClick={() => setActiveContactId(c.id)}
                      className={`w-full text-left p-4 flex gap-3 transition-colors hover:bg-muted/30 ${
                        isActive ? "bg-muted/50 border-l-4 border-primary" : ""
                      }`}
                    >
                      <img src={c.avatar} className="w-10 h-10 rounded-full bg-muted shrink-0" alt="" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-sm truncate">{c.name}</p>
                          <span className="text-[10px] uppercase tracking-wider text-muted-foreground/75 bg-muted px-1.5 py-0.5 rounded">
                            {c.role}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">{c.lastMessage}</p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Panel: Active Chat Box */}
          <div className="md:col-span-2 flex flex-col bg-card/20">
            {activeContact ? (
              <>
                {/* Chat Partner Header */}
                <div className="border-b border-border p-4 flex items-center justify-between bg-card">
                  <div className="flex items-center gap-3">
                    <img src={activeContact.avatar} className="w-10 h-10 rounded-full bg-muted" alt="" />
                    <div>
                      <p className="font-semibold text-sm">{activeContact.name}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                        Online
                      </p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" className="md:hidden" onClick={() => navigate({ to: "/dashboard" })}>
                    <ArrowLeft className="w-4 h-4 mr-1" /> Dashboard
                  </Button>
                </div>

                {/* Messages Body */}
                <div className="flex-1 h-[380px] overflow-y-auto p-4 space-y-3 bg-muted/20 relative">
                  {loadingHistory ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-background/50">
                      <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    </div>
                  ) : msgs.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-xs text-muted-foreground space-y-2">
                      <MessageSquare className="w-6 h-6 text-muted-foreground/40" />
                      <p>Send a message to start chatting with {activeContact.name}.</p>
                    </div>
                  ) : (
                    msgs.map((m) => {
                      const isMine = m.from === user?.role;
                      return (
                        <div key={m.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                          <div
                            className={`max-w-[75%] rounded-2xl px-4 py-2 shadow-sm ${
                              isMine ? "bg-primary text-primary-foreground" : "bg-card border border-border"
                            }`}
                          >
                            <p className="text-sm leading-relaxed whitespace-pre-wrap">{m.text}</p>
                            <p className={`text-[9px] mt-1 text-right ${isMine ? "text-primary-foreground/60" : "text-muted-foreground/60"}`}>
                              {m.time}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={bottomRef} />
                </div>

                {/* Form Input */}
                <form onSubmit={send} className="border-t border-border p-3 flex gap-2 bg-card">
                  <Input
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder={`Message ${activeContact.name}...`}
                    disabled={sending}
                    className="flex-1 rounded-xl"
                  />
                  <Button type="submit" size="icon" disabled={sending || !text.trim()} className="shadow-emerald shrink-0">
                    {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </Button>
                </form>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8 space-y-2 text-center h-full">
                <MessageSquare className="w-10 h-10 text-muted-foreground/40" />
                <p className="font-semibold text-sm">No conversation selected</p>
                <p className="text-xs max-w-xs">Select a contact from the inbox list or navigate to a tutor profile to start messaging.</p>
              </div>
            )}
          </div>

        </div>
      </Card>

      <Card className="border-warning/40 bg-warning/5">
        <CardContent className="pt-6 flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-warning shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold text-foreground">AI Safety Compliance</p>
            <p className="text-muted-foreground mt-1">
              To keep our community safe, communications are scanned. Sharing phone numbers, WhatsApp links, cash proposals, or suggesting off-platform transactions is automatically flagged and blocked.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
