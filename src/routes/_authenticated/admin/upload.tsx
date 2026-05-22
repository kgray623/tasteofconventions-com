import { createFileRoute } from "@tanstack/react-router";
import { Component, useEffect, useRef, useState, type ReactNode } from "react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useRoles } from "@/hooks/use-roles";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2, ClipboardPaste, Smartphone, UserPlus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { getErrorMessage } from "@/lib/async-safety";

class UploadErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error) { console.error("[upload] render error", error); }
  render() {
    if (this.state.error) {
      return (
        <div className="space-y-4 p-4">
          <Card className="p-5 border-destructive/40 bg-destructive/5">
            <p className="font-medium">Something broke on this page.</p>
            <p className="text-sm text-muted-foreground mt-1">{this.state.error.message}</p>
            <Button className="mt-3" onClick={() => this.setState({ error: null })}>Try again</Button>
          </Card>
        </div>
      );
    }
    return this.props.children;
  }
}

// Browsers that support the Contact Picker API (Chrome on Android)
type ContactInfo = { name?: string[]; email?: string[]; tel?: string[] };
interface ContactsManager {
  select: (props: string[], opts?: { multiple?: boolean }) => Promise<ContactInfo[]>;
  getProperties: () => Promise<string[]>;
}
const getContactsApi = (): ContactsManager | null => {
  if (typeof navigator === "undefined") return null;
  const c = (navigator as unknown as { contacts?: ContactsManager }).contacts;
  return c && typeof c.select === "function" ? c : null;
};

// Minimal vCard (.vcf) parser — handles vCard 3.0/4.0 exports from iPhone & Android
function parseVCards(text: string): Record<string, string>[] {
  const cards = text.split(/BEGIN:VCARD/i).slice(1);
  return cards.map((card) => {
    const body = card.split(/END:VCARD/i)[0];
    // unfold folded lines (RFC 6350)
    const lines = body.replace(/\r?\n[ \t]/g, "").split(/\r?\n/);
    let name = "", email = "", phone = "";
    for (const raw of lines) {
      const idx = raw.indexOf(":");
      if (idx < 0) continue;
      const left = raw.slice(0, idx).toUpperCase();
      const value = raw.slice(idx + 1).trim();
      if (!value) continue;
      if (!name && left.startsWith("FN")) name = value;
      else if (!name && left.startsWith("N")) {
        const [last, first] = value.split(";");
        name = [first, last].filter(Boolean).join(" ").trim();
      } else if (!email && left.startsWith("EMAIL")) email = value;
      else if (!phone && left.startsWith("TEL")) phone = value;
    }
    return { name, email, phone, notes: "" };
  }).filter((r) => r.name || r.email || r.phone);
}

export const Route = createFileRoute("/_authenticated/admin/upload")({
  component: () => (<UploadErrorBoundary><UploadPage /></UploadErrorBoundary>),
});

type Row = { guest_name: string; guest_email: string; guest_phone: string; notes: string };
type Parsed = Row & { _row: number; _dupReason?: string };

const norm = (s: string) => (s || "").trim().toLowerCase();
const phoneNorm = (s: string) => (s || "").replace(/\D/g, "");

function pick(obj: Record<string, unknown>, keys: string[]): string {
  for (const k of Object.keys(obj)) {
    const lk = k.toLowerCase().trim();
    if (keys.includes(lk)) return String(obj[k] ?? "").trim();
  }
  return "";
}

function UploadPage() {
  const { user } = useAuth();
  const { isTeam } = useRoles();
  const fileRef = useRef<HTMLInputElement>(null);
  const vcardRef = useRef<HTMLInputElement>(null);
  const quickNameRef = useRef<HTMLInputElement>(null);
  const [events, setEvents] = useState<{ id: string; title: string }[]>([]);
  const [eventId, setEventId] = useState("");
  const [rows, setRows] = useState<Parsed[]>([]);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ inserted: number; flagged: number; skipped: number } | null>(null);
  const [pasted, setPasted] = useState("");
  const [quick, setQuick] = useState({ name: "", phone: "", email: "" });
  const [quickBusy, setQuickBusy] = useState(false);
  const [quickAdded, setQuickAdded] = useState(0);
  const [canPickContacts, setCanPickContacts] = useState(false);
  const [clipboardBusy, setClipboardBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    supabase.from("events").select("id,title").order("starts_at").then(({ data }) => {
      if (!alive) return;
      setEvents(data ?? []);
      if (data?.[0]) setEventId(data[0].id);
    }, (err) => {
      console.error("[upload] events load failed", err);
    });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    setCanPickContacts(Boolean(getContactsApi()) && !isInIframe() && !isIOS());
  }, []);

  if (!isTeam) {
    return <p className="text-muted-foreground">Only team members can add guests.</p>;
  }

  const flagDuplicates = async (parsed: Parsed[]) => {
    const seenE = new Map<string, number>();
    const seenP = new Map<string, number>();
    parsed.forEach((r, idx) => {
      const e = norm(r.guest_email);
      const p = phoneNorm(r.guest_phone);
      if (e) {
        if (seenE.has(e)) r._dupReason = `email duplicates row ${parsed[seenE.get(e)!]._row}`;
        else seenE.set(e, idx);
      }
      if (p.length >= 7 && !r._dupReason) {
        if (seenP.has(p)) r._dupReason = `phone duplicates row ${parsed[seenP.get(p)!]._row}`;
        else seenP.set(p, idx);
      }
    });
    if (eventId) {
      try {
        const { data: existing } = await supabase
          .from("invitations")
          .select("guest_name,guest_email_normalized,guest_phone_normalized")
          .eq("event_id", eventId);
        const existE = new Set((existing ?? []).map((r) => r.guest_email_normalized).filter(Boolean) as string[]);
        const existP = new Set((existing ?? []).map((r) => r.guest_phone_normalized).filter(Boolean) as string[]);
        parsed.forEach((r) => {
          if (r._dupReason) return;
          const e = norm(r.guest_email);
          const p = phoneNorm(r.guest_phone);
          if (e && existE.has(e)) r._dupReason = "already on the guest list (email match)";
          else if (p.length >= 7 && existP.has(p)) r._dupReason = "already on the guest list (phone match)";
        });
      } catch (e) {
        console.warn("[upload] dup check failed", e);
      }
    }
  };

  const parseRows = async (raw: Record<string, unknown>[]) => {
    const parsed: Parsed[] = (raw ?? []).map((r, i) => ({
      _row: i + 1,
      guest_name: pick(r, ["name", "guest", "guest name", "full name"]),
      guest_email: pick(r, ["email", "e-mail", "email address"]),
      guest_phone: pick(r, ["phone", "mobile", "cell", "phone number"]),
      notes: pick(r, ["notes", "note", "comment", "comments"]),
    })).filter((r) => r.guest_name);
    await flagDuplicates(parsed);
    setRows(parsed);
  };

  const onFile = async (file: File) => {
    try {
      setDone(null);
      let raw: Record<string, unknown>[] = [];
      const name = (file.name || "").toLowerCase();
      if (name.endsWith(".vcf")) {
        // User picked a vCard in the spreadsheet slot — handle it gracefully.
        await onVCard(file);
        return;
      }
      if (name.endsWith(".csv")) {
        const text = await file.text();
        raw = Papa.parse(text, { header: true, skipEmptyLines: true }).data as Record<string, unknown>[];
      } else {
        const buf = await file.arrayBuffer();
        const wb = XLSX.read(buf);
        const sheet = wb.Sheets[wb.SheetNames[0]];
        raw = sheet ? (XLSX.utils.sheet_to_json(sheet, { defval: "" }) as Record<string, unknown>[]) : [];
      }
      if (!raw.length) {
        toast.error("No rows found in that file.");
        return;
      }
      await parseRows(raw);
      toast.success(`Loaded ${raw.length} row${raw.length === 1 ? "" : "s"}`);
    } catch (e) {
      console.error("[upload] onFile failed", e);
      toast.error("Couldn't read that file", { description: getErrorMessage(e) });
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const isInIframe = () => {
    try { return window.self !== window.top; } catch { return true; }
  };

  const isIOS = () => {
    if (typeof navigator === "undefined") return false;
    const ua = navigator.userAgent || "";
    return /iPad|iPhone|iPod/.test(ua) || (ua.includes("Mac") && "ontouchend" in document);
  };

  const onPickContacts = async () => {
    const api = getContactsApi();
    // iPhone/iPad/Safari/desktop: no Contact Picker API. Open the .vcf file picker,
    // which on iOS lets the user choose a contacts file from the Files app / share sheet.
    if (!api || isInIframe() || isIOS()) {
      if (isIOS()) {
        toast.message("iPhone: import contacts as a .vcf", {
          description: "Open Contacts → select people → Share → Save to Files. Then choose that .vcf here.",
        });
      } else if (!api) {
        toast.message("Your browser can't open contacts directly", {
          description: "Export your contacts as a .vcf file and choose it here.",
        });
      } else {
        toast.message("Contact picking is blocked in this preview", {
          description: "Choose a .vcf contacts file instead. You will stay on this page.",
        });
      }
      vcardRef.current?.click();
      return;
    }
    try {
      setDone(null);
      const picked = await api.select(["name", "email", "tel"], { multiple: true });
      const raw = picked.map((c) => ({
        name: (c.name?.[0] ?? "").trim(),
        email: (c.email?.[0] ?? "").trim(),
        phone: (c.tel?.[0] ?? "").trim(),
        notes: "",
      })).filter((r) => r.name || r.email || r.phone);
      if (!raw.length) {
        toast.message("No contacts selected.");
        return;
      }
      await parseRows(raw);
      toast.success(`Loaded ${raw.length} contact${raw.length === 1 ? "" : "s"}`);
    } catch {
      toast.error("Couldn't read contacts", { description: "Choose a .vcf contacts file instead. You will stay on this page." });
      vcardRef.current?.click();
    }
  };


  const onVCard = async (file: File) => {
    try {
      setDone(null);
      const text = await file.text();
      const raw = parseVCards(text);
      if (!raw.length) {
        toast.error("No contacts found in that file.");
        return;
      }
      await parseRows(raw);
      toast.success(`Loaded ${raw.length} contact${raw.length === 1 ? "" : "s"} from vCard`);
    } catch (e) {
      console.error("[upload] onVCard failed", e);
      toast.error("Couldn't read that contacts file", { description: getErrorMessage(e) });
    } finally {
      if (vcardRef.current) vcardRef.current.value = "";
    }
  };

  const onPaste = async () => {

    setDone(null);
    const emailRegex = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
    const phoneRegex = /(?:\+?1[\s.-]?)?(?:\(?\d{3}\)?[\s.-]?)\d{3}[\s.-]?\d{4}(?:\s*(?:x|ext\.?)\s*\d{1,6})?|\b\d{7,15}\b/i;
    const labelRegex = /^\s*(?:\[(name|full name|guest|mobile|phone|cell|email|e-mail)\]|(name|full name|guest|mobile|phone|cell|email|e-mail))\s*[:\-–—]?\s*(.*)$/i;

    const tokens = pasted
      .split(/\r?\n/)
      .flatMap((line) => line.split(/[,;\t|]+/))
      .map((t) => t.trim())
      .filter(Boolean);

    const raw: Record<string, string>[] = [];
    let cur: Record<string, string> = { name: "", email: "", phone: "", notes: "" };
    const flush = () => {
      if (cur.name || cur.email || cur.phone) raw.push(cur);
      cur = { name: "", email: "", phone: "", notes: "" };
    };

    const addName = (value: string) => {
      const cleaned = value.replace(emailRegex, " ").replace(phoneRegex, " ").replace(/\s+/g, " ").trim();
      if (!cleaned || !/[a-zA-Z]/.test(cleaned)) return;
      if (cur.name) flush();
      cur.name = cleaned;
    };
    const addEmail = (value: string) => {
      const email = value.match(emailRegex)?.[0]?.trim() ?? "";
      if (!email) return;
      if (cur.email) flush();
      cur.email = email;
    };
    const addPhone = (value: string) => {
      const phone = value.match(phoneRegex)?.[0]?.trim() ?? value.trim();
      if (phoneNorm(phone).length < 7) return;
      if (cur.phone) flush();
      cur.phone = phone;
    };

    for (const tok of tokens) {
      const label = tok.match(labelRegex);
      const labelKind = (label?.[1] ?? label?.[2] ?? "").toLowerCase();
      const value = label ? label[3].trim() : tok;

      if (["name", "full name", "guest"].includes(labelKind)) {
        addName(value);
      } else if (["mobile", "phone", "cell"].includes(labelKind)) {
        addPhone(value);
      } else if (["email", "e-mail"].includes(labelKind)) {
        addEmail(value);
      } else {
        const email = value.match(emailRegex)?.[0] ?? "";
        const phone = value.match(phoneRegex)?.[0] ?? "";
        addName(value);
        if (email) addEmail(email);
        if (phone) addPhone(phone);
        if (!email && !phone && !/[a-zA-Z]/.test(value)) {
          cur.notes = cur.notes ? `${cur.notes} ${value}` : value;
        }
      }
    }
    flush();
    await parseRows(raw);
    if (!raw.some((r) => r.name)) toast.error("I couldn't find any guest names in that paste.");
  };

  const importAll = async (skipDupes: boolean) => {
    if (!eventId || !user) return;
    setBusy(true);
    let inserted = 0, flagged = 0, skipped = 0;
    try {
      for (const r of rows) {
        if (skipDupes && r._dupReason) { skipped++; continue; }
        try {
          const { error } = await supabase.from("invitations").insert({
            event_id: eventId, host_id: user.id, guest_name: r.guest_name,
            guest_email: r.guest_email || null, guest_phone: r.guest_phone || null,
            notes: r.notes || null,
          });
          if (error) { skipped++; continue; }
          inserted++;
          if (r._dupReason) flagged++;
        } catch (e) {
          console.error("[upload] insert failed", e);
          skipped++;
        }
      }
      setDone({ inserted, flagged, skipped });
      setRows([]);
      setPasted("");
      if (fileRef.current) fileRef.current.value = "";
      toast.success(`Added ${inserted} guest${inserted === 1 ? "" : "s"}`);
    } catch (e) {
      console.error("[upload] importAll failed", e);
      toast.error("Import failed", { description: getErrorMessage(e) });
    } finally {
      setBusy(false);
    }
  };

  const dupCount = rows.filter((r) => r._dupReason).length;

  const onQuickAdd = async () => {
    if (!eventId || !user) return;
    const name = quick.name.trim();
    if (!name) { toast.error("Add a name first."); return; }
    if (!quick.phone.trim() && !quick.email.trim()) {
      toast.error("Add a phone number or email so we can reach them.");
      return;
    }
    setQuickBusy(true);
    try {
      const { error } = await supabase.from("invitations").insert({
        event_id: eventId,
        host_id: user.id,
        guest_name: name,
        guest_email: quick.email.trim() || null,
        guest_phone: quick.phone.trim() || null,
        notes: null,
      });
      if (error) throw error;
      setQuickAdded((n) => n + 1);
      setQuick({ name: "", phone: "", email: "" });
      toast.success(`Added ${name}`);
    } catch (e) {
      console.error("[upload] quick add failed", e);
      toast.error("Couldn't add that guest", { description: getErrorMessage(e) });
    } finally {
      setQuickBusy(false);
    }
  };

  return (
    <div className="space-y-6">

      <Card className="p-6 space-y-2">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Event</p>
        <Select value={eventId} onValueChange={setEventId}>
          <SelectTrigger className="w-full sm:w-[320px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {events.map((e) => <SelectItem key={e.id} value={e.id}>{e.title}</SelectItem>)}
          </SelectContent>
        </Select>
      </Card>

      <Card className="p-6 space-y-3 border-terracotta/40">
        <div className="flex items-center gap-2">
          <UserPlus className="w-4 h-4 text-terracotta" />
          <p className="font-medium">Quick add — one guest at a time</p>
          {quickAdded > 0 && (
            <Badge variant="outline" className="border-emerald-600 text-emerald-700">
              {quickAdded} added this session
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          The easiest way. Type the guest's name and their phone <em>or</em> email, tap <em>Add guest</em>, and they're on the list. Open your phone's Contacts app side-by-side and copy/paste as you go.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <Input
            value={quick.name}
            onChange={(e) => setQuick((q) => ({ ...q, name: e.target.value }))}
            placeholder="Full name"
            autoComplete="name"
          />
          <Input
            value={quick.phone}
            onChange={(e) => setQuick((q) => ({ ...q, phone: e.target.value }))}
            placeholder="Phone (555-123-4567)"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
          />
          <Input
            value={quick.email}
            onChange={(e) => setQuick((q) => ({ ...q, email: e.target.value }))}
            placeholder="Email (optional)"
            type="email"
            inputMode="email"
            autoComplete="email"
          />
        </div>
        <div className="flex justify-end">
          <Button
            onClick={onQuickAdd}
            disabled={quickBusy || !eventId || !quick.name.trim() || (!quick.phone.trim() && !quick.email.trim())}
            className="bg-ink text-cream hover:bg-ink/90"
          >
            <UserPlus className="w-4 h-4 mr-2" /> Add guest
          </Button>
        </div>
      </Card>


      <Card className="p-6 space-y-3">
        <div className="flex items-center gap-2">
          <Smartphone className="w-4 h-4 text-terracotta" />
          <p className="font-medium">Pick from your phone's contacts</p>
        </div>
        <p className="text-xs text-muted-foreground">
          <strong>Android (Chrome):</strong> tap <em>Pick contacts</em> and your phone's contact
          picker opens — choose guests and you're done.<br />
          <strong>iPhone / iPad:</strong> open Contacts → select people → <em>Share Contact</em> →
          <em>Save to Files</em>. Then tap <em>Pick contacts</em> (or <em>Import .vcf file</em>)
          and choose that file.<br />
          <strong>Desktop:</strong> export a <code>.vcf</code> from your address book and import it below.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button onClick={onPickContacts} disabled={!eventId} className="bg-ink text-cream hover:bg-ink/90">
            <Smartphone className="w-4 h-4 mr-2" /> Pick contacts
          </Button>
          <label className="inline-flex">
            <input
              ref={vcardRef}
              type="file"
              accept=".vcf,text/vcard,text/x-vcard"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && onVCard(e.target.files[0])}
            />
            <span className="inline-flex items-center justify-center gap-2 h-9 px-4 rounded-md border border-input bg-background text-sm font-medium cursor-pointer hover:bg-accent">
              <Upload className="w-4 h-4" /> Import .vcf file
            </span>
          </label>
        </div>
      </Card>

      <Card className="p-6 space-y-3">

        <div className="flex items-center gap-2">
          <ClipboardPaste className="w-4 h-4 text-terracotta" />
          <p className="font-medium">Paste from your phone</p>
        </div>
        <p className="text-xs text-muted-foreground">
          Paste contacts from your phone or type them in. Each guest can be one line
          (<code>Jane Smith, jane@email.com, 555-123-4567</code>) or a block where the
          name, phone, and email are on separate lines — both work.
        </p>
        <textarea
          value={pasted}
          onChange={(e) => setPasted(e.target.value)}
          placeholder={"Jane Smith, jane@email.com\nMike Jones, 555-123-4567\n\nAlex Lee\nalex@email.com\n555-987-6543"}
          rows={6}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
        />
        <div className="flex justify-end">
          <Button onClick={onPaste} disabled={!pasted.trim() || !eventId} className="bg-ink text-cream hover:bg-ink/90">
            Check list
          </Button>
        </div>
      </Card>

      <Card className="p-6 space-y-3">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="w-4 h-4 text-terracotta" />
          <p className="font-medium">Or upload a CSV / Excel file</p>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
          className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:bg-ink file:text-cream hover:file:bg-ink/90 file:cursor-pointer"
        />
        <p className="text-xs text-muted-foreground">
          Expected columns: <code>name</code>, <code>email</code>, <code>phone</code>, <code>notes</code> (case-insensitive).
        </p>
      </Card>

      {done && (
        <Card className="p-5 border-emerald-500/40 bg-emerald-500/5 flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5" />
          <div>
            <p className="font-medium">Import complete</p>
            <p className="text-sm text-muted-foreground">
              {done.inserted} added · {done.flagged} flagged as duplicates · {done.skipped} skipped
            </p>
          </div>
        </Card>
      )}

      {rows.length > 0 && (
        <Card className="overflow-hidden">
          <div className="p-4 border-b border-border flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="w-5 h-5 text-terracotta" />
              <p className="font-medium">{rows.length} {rows.length === 1 ? "guest" : "guests"} ready</p>
              {dupCount > 0 && (
                <Badge variant="outline" className="border-terracotta text-terracotta">
                  <AlertCircle className="w-3 h-3 mr-1" /> {dupCount} possible duplicate{dupCount === 1 ? "" : "s"}
                </Badge>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" disabled={busy || dupCount === 0} onClick={() => importAll(true)}>
                Skip duplicates
              </Button>
              <Button disabled={busy} onClick={() => importAll(false)} className="bg-ink text-cream hover:bg-ink/90">
                <Upload className="w-4 h-4 mr-2" /> Add all
              </Button>
            </div>
          </div>
          <div className="divide-y divide-border max-h-[480px] overflow-auto">
            {rows.map((r, idx) => (
              <div key={idx} className="px-4 py-2.5 flex flex-wrap items-center gap-3 text-sm">
                <span className="text-xs text-muted-foreground w-8">#{r._row}</span>
                <span className="font-medium flex-1 min-w-[140px]">{r.guest_name}</span>
                <span className="text-muted-foreground min-w-[160px] break-all">{r.guest_email}</span>
                <span className="text-muted-foreground min-w-[110px]">{r.guest_phone}</span>
                {r._dupReason && (
                  <Badge variant="outline" className="border-terracotta text-terracotta text-[10px]">
                    {r._dupReason}
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
