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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Upload,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  Camera,
  Loader2,
  X,
} from "lucide-react";
import { getErrorMessage } from "@/lib/async-safety";
import { useServerFn } from "@tanstack/react-start";
import { extractContactsFromImages } from "@/lib/contact-ocr.functions";

class UploadErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  componentDidCatch(error: Error) {
    console.error("[upload] render error", error);
  }
  render() {
    if (this.state.error) {
      return (
        <div className="space-y-4 p-4">
          <Card className="p-5 border-destructive/40 bg-destructive/5">
            <p className="font-medium">Something broke on this page.</p>
            <p className="text-sm text-muted-foreground mt-1">{this.state.error.message}</p>
            <Button className="mt-3" onClick={() => this.setState({ error: null })}>
              Try again
            </Button>
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

const isInIframe = () => {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
};

const isIOS = () => {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  return /iPad|iPhone|iPod/.test(ua) || (ua.includes("Mac") && "ontouchend" in document);
};

// Minimal vCard (.vcf) parser — handles vCard 3.0/4.0 exports from iPhone & Android
function parseVCards(text: string): Record<string, string>[] {
  const cards = text.split(/BEGIN:VCARD/i).slice(1);
  return cards
    .map((card) => {
      const body = card.split(/END:VCARD/i)[0];
      // unfold folded lines (RFC 6350)
      const lines = body.replace(/\r?\n[ \t]/g, "").split(/\r?\n/);
      let name = "",
        email = "",
        phone = "";
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
    })
    .filter((r) => r.name || r.email || r.phone);
}

export const Route = createFileRoute("/_authenticated/admin/upload")({
  component: () => (
    <UploadErrorBoundary>
      <UploadPage />
    </UploadErrorBoundary>
  ),
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

function parseContactText(value: string) {
  const email = value.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0]?.trim() ?? "";
  const phone =
    value
      .match(
        /(?:\+?1[\s.-]?)?(?:\(?\d{3}\)?[\s.-]?)\d{3}[\s.-]?\d{4}(?:\s*(?:x|ext\.?)\s*\d{1,6})?|\b\d{7,15}\b/i,
      )?.[0]
      ?.trim() ?? "";
  let nameSource = value;
  if (email) nameSource = nameSource.replace(email, " ");
  if (phone) nameSource = nameSource.replace(phone, " ");
  const name =
    nameSource
      .split(/\r?\n|[,;|\t]/)
      .map((part) =>
        part
          .replace(/^\s*(name|full name|guest|mobile|phone|cell|email|e-mail)\s*[:\-–—]?\s*/i, "")
          .trim(),
      )
      .find((part) => /[a-zA-Z]/.test(part)) ?? "";
  return { name, phone, email };
}

const uploadDraftKey = (userId?: string) => `admin-upload-draft:${userId ?? "unknown"}`;

function loadUploadDraft(userId?: string) {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(uploadDraftKey(userId));
    return raw ? JSON.parse(raw) as { pasted?: string; quick?: { name?: string; phone?: string; email?: string }; rows?: Parsed[] } : null;
  } catch {
    return null;
  }
}

function saveUploadDraft(userId: string | undefined, pasted: string, quick: { name: string; phone: string; email: string }, rows: Parsed[]) {
  if (typeof window === "undefined") return;
  try {
    if (!pasted.trim() && !quick.name.trim() && !quick.phone.trim() && !quick.email.trim() && rows.length === 0) {
      window.localStorage.removeItem(uploadDraftKey(userId));
      return;
    }
    window.localStorage.setItem(uploadDraftKey(userId), JSON.stringify({ pasted, quick, rows }));
  } catch (error) {
    console.warn("[upload] draft save failed", error);
  }
}

function clearUploadDraft(userId?: string) {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(uploadDraftKey(userId));
}

function UploadPage() {
  const { user } = useAuth();
  const { isTeam, loading: rolesLoading } = useRoles();
  const fileRef = useRef<HTMLInputElement>(null);
  const vcardRef = useRef<HTMLInputElement>(null);
  const quickNameRef = useRef<HTMLInputElement>(null);
  const draftLoadedRef = useRef(false);
  const [events, setEvents] = useState<{ id: string; title: string }[]>([]);
  const [eventId, setEventId] = useState("");
  const [rows, setRows] = useState<Parsed[]>([]);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ inserted: number; flagged: number; skipped: number } | null>(
    null,
  );
  const [pasted, setPasted] = useState("");
  const [quick, setQuick] = useState({ name: "", phone: "", email: "" });
  const [quickBusy, setQuickBusy] = useState(false);
  const [quickAdded, setQuickAdded] = useState(0);
  const [canPickContacts, setCanPickContacts] = useState(false);
  const [clipboardBusy, setClipboardBusy] = useState(false);
  const imageRef = useRef<HTMLInputElement>(null);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [ocrBusy, setOcrBusy] = useState(false);
  const runOcr = useServerFn(extractContactsFromImages);
  const [savedGuests, setSavedGuests] = useState<
    { id: string; guest_name: string; guest_email: string | null; guest_phone: string | null }[]
  >([]);
  const [savedLoading, setSavedLoading] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const loadSavedGuests = async (evId: string) => {
    if (!evId) {
      setSavedGuests([]);
      return;
    }
    setSavedLoading(true);
    try {
      const { data, error } = await supabase
        .from("invitations")
        .select("id,guest_name,guest_email,guest_phone")
        .eq("event_id", evId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setSavedGuests(data ?? []);
    } catch (e) {
      console.error("[upload] load saved guests failed", e);
    } finally {
      setSavedLoading(false);
    }
  };

  useEffect(() => {
    void loadSavedGuests(eventId);
  }, [eventId]);

  const removeSavedGuest = async (id: string, name: string) => {
    if (typeof window !== "undefined" && !window.confirm(`Remove ${name} from this event's guest list?`)) return;
    setRemovingId(id);
    try {
      const { error } = await supabase.from("invitations").delete().eq("id", id);
      if (error) throw error;
      setSavedGuests((prev) => prev.filter((g) => g.id !== id));
      toast.success(`Removed ${name}`);
    } catch (e) {
      console.error("[upload] remove guest failed", e);
      toast.error("Couldn't remove guest", { description: getErrorMessage(e) });
    } finally {
      setRemovingId(null);
    }
  };

  useEffect(() => {
    let alive = true;
    supabase
      .from("events")
      .select("id,title")
      .order("starts_at")
      .then(
        ({ data }) => {
          if (!alive) return;
          setEvents(data ?? []);
          if (data?.[0]) setEventId(data[0].id);
        },
        (err) => {
          console.error("[upload] events load failed", err);
        },
      );
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    setCanPickContacts(Boolean(getContactsApi()) && !isInIframe() && !isIOS());
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    const draft = loadUploadDraft(user.id);
    if (draft) {
      setPasted((current) => current || draft.pasted || "");
      setQuick((current) => ({
        name: current.name || draft.quick?.name || "",
        phone: current.phone || draft.quick?.phone || "",
        email: current.email || draft.quick?.email || "",
      }));
      setRows((current) => current.length ? current : draft.rows ?? []);
    }
    draftLoadedRef.current = true;
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id || !draftLoadedRef.current) return;
    saveUploadDraft(user.id, pasted, quick, rows);
  }, [user?.id, pasted, quick, rows]);

  if (rolesLoading) {
    return <p className="text-muted-foreground">Loading guest tools…</p>;
  }

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
        const existE = new Set(
          (existing ?? []).map((r) => r.guest_email_normalized).filter(Boolean) as string[],
        );
        const existP = new Set(
          (existing ?? []).map((r) => r.guest_phone_normalized).filter(Boolean) as string[],
        );
        parsed.forEach((r) => {
          if (r._dupReason) return;
          const e = norm(r.guest_email);
          const p = phoneNorm(r.guest_phone);
          if (e && existE.has(e)) r._dupReason = "already on the guest list (email match)";
          else if (p.length >= 7 && existP.has(p))
            r._dupReason = "already on the guest list (phone match)";
        });
      } catch (e) {
        console.warn("[upload] dup check failed", e);
      }
    }
  };

  const parseRows = async (raw: Record<string, unknown>[], append = false) => {
    const parsed: Parsed[] = (raw ?? [])
      .map((r, i) => ({
        _row: i + 1,
        guest_name: pick(r, ["name", "guest", "guest name", "full name"]),
        guest_email: pick(r, ["email", "e-mail", "email address"]),
        guest_phone: pick(r, ["phone", "mobile", "cell", "phone number"]),
        notes: pick(r, ["notes", "note", "comment", "comments"]),
      }))
      .filter((r) => r.guest_name);
    const next = append ? [...rows, ...parsed.map((r, i) => ({ ...r, _row: rows.length + i + 1 }))] : parsed;
    await flagDuplicates(next);
    setRows(next);
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
        raw = Papa.parse(text, { header: true, skipEmptyLines: true }).data as Record<
          string,
          unknown
        >[];
      } else {
        const buf = await file.arrayBuffer();
        const wb = XLSX.read(buf);
        const sheet = wb.Sheets[wb.SheetNames[0]];
        raw = sheet
          ? (XLSX.utils.sheet_to_json(sheet, { defval: "" }) as Record<string, unknown>[])
          : [];
      }
      if (!raw.length) {
        toast.error("No rows found in that file.");
        return;
      }
      await parseRows(raw, true);
      toast.success(`Added ${raw.length} row${raw.length === 1 ? "" : "s"} to the review list`);
    } catch (e) {
      console.error("[upload] onFile failed", e);
      toast.error("Couldn't read that file", { description: getErrorMessage(e) });
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const onPickContacts = async () => {
    const api = getContactsApi();
    if (!api || isInIframe() || isIOS()) {
      toast.message("Use Quick add on this device", {
        description:
          "This keeps you in the app and avoids the phone file picker that can break preview.",
      });
      quickNameRef.current?.focus();
      return;
    }
    try {
      setDone(null);
      const picked = await api.select(["name", "email", "tel"], { multiple: true });
      const raw = picked
        .map((c) => ({
          name: (c.name?.[0] ?? "").trim(),
          email: (c.email?.[0] ?? "").trim(),
          phone: (c.tel?.[0] ?? "").trim(),
          notes: "",
        }))
        .filter((r) => r.name || r.email || r.phone);
      if (!raw.length) {
        toast.message("No contacts selected.");
        return;
      }
      await parseRows(raw, true);
      toast.success(`Added ${raw.length} contact${raw.length === 1 ? "" : "s"} to the review list`);
    } catch {
      toast.error("Couldn't read contacts", {
        description: "Choose a .vcf contacts file instead. You will stay on this page.",
      });
      vcardRef.current?.click();
    }
  };

  const pasteFromClipboard = async () => {
    if (!navigator.clipboard?.readText) {
      toast.message("Paste manually", {
        description: "Tap the box, then use your phone's Paste option.",
      });
      return;
    }
    setClipboardBusy(true);
    try {
      const text = await navigator.clipboard.readText();
      if (!text.trim()) {
        toast.message("Clipboard is empty");
        return;
      }
      const parsed = parseContactText(text);
      setQuick((q) => ({
        name: parsed.name || q.name,
        phone: parsed.phone || q.phone,
        email: parsed.email || q.email,
      }));
      setPasted(text);
      toast.success("Pasted contact details");
    } catch (e) {
      toast.message("Paste manually", { description: getErrorMessage(e) });
    } finally {
      setClipboardBusy(false);
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
      await parseRows(raw, true);
      toast.success(`Added ${raw.length} contact${raw.length === 1 ? "" : "s"} from vCard`);
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
    const phoneRegex =
      /(?:\+?1[\s.-]?)?(?:\(?\d{3}\)?[\s.-]?)\d{3}[\s.-]?\d{4}(?:\s*(?:x|ext\.?)\s*\d{1,6})?|\b\d{7,15}\b/i;
    const labelRegex =
      /^\s*(?:\[(name|full name|guest|mobile|phone|cell|email|e-mail)\]|(name|full name|guest|mobile|phone|cell|email|e-mail))\s*[:\-–—]?\s*(.*)$/i;

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
      const cleaned = value
        .replace(emailRegex, " ")
        .replace(phoneRegex, " ")
        .replace(/\s+/g, " ")
        .trim();
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
    await parseRows(raw, true);
    if (!raw.some((r) => r.name)) toast.error("I couldn't find any guest names in that paste.");
  };

  const importAll = async (skipDupes: boolean) => {
    if (!eventId || !user) return;
    setBusy(true);
    let inserted = 0,
      flagged = 0,
      skipped = 0;
    try {
      for (const r of rows) {
        if (skipDupes && r._dupReason) {
          skipped++;
          continue;
        }
        try {
          const { error } = await supabase.from("invitations").insert({
            event_id: eventId,
            host_id: user.id,
            guest_name: r.guest_name,
            guest_email: r.guest_email || null,
            guest_phone: r.guest_phone || null,
            notes: r.notes || null,
          });
          if (error) {
            skipped++;
            continue;
          }
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
      clearUploadDraft(user.id);
      if (fileRef.current) fileRef.current.value = "";
      toast.success(`Added ${inserted} guest${inserted === 1 ? "" : "s"}`);
      void loadSavedGuests(eventId);
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
    if (!name) {
      toast.error("Add a name first.");
      return;
    }
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
      saveUploadDraft(user.id, pasted, { name: "", phone: "", email: "" }, rows);
      toast.success(`Added ${name}`);
      void loadSavedGuests(eventId);
    } catch (e) {
      console.error("[upload] quick add failed", e);
      toast.error("Couldn't add that guest", { description: getErrorMessage(e) });
    } finally {
      setQuickBusy(false);
    }
  };

  const fileToDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error ?? new Error("Couldn't read image"));
      reader.readAsDataURL(file);
    });

  const onImages = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const list = Array.from(files).slice(0, 8);
    setDone(null);
    setOcrBusy(true);
    try {
      const dataUrls = await Promise.all(list.map(fileToDataUrl));
      setImagePreviews(dataUrls);
      const { contacts } = await runOcr({ data: { images: dataUrls } });
      if (!contacts.length) {
        toast.error("I couldn't read any contacts from that image.", {
          description: "Try a clearer screenshot of the contact card.",
        });
        return;
      }
      await parseRows(
        contacts.map((c) => ({
          name: c.name,
          email: c.email,
          phone: c.phone,
          notes: c.notes,
        })),
        true,
      );
      toast.success(
        `Found ${contacts.length} contact${contacts.length === 1 ? "" : "s"} in your screenshot${list.length === 1 ? "" : "s"}`,
      );
    } catch (e) {
      console.error("[upload] image OCR failed", e);
      toast.error("Couldn't read those screenshots", { description: getErrorMessage(e) });
    } finally {
      setOcrBusy(false);
      if (imageRef.current) imageRef.current.value = "";
    }
  };

  return (
    <div className="space-y-6">
      <Card className="p-6 space-y-2">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Event</p>
        <Select value={eventId} onValueChange={setEventId}>
          <SelectTrigger className="w-full sm:w-[320px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {events.map((e) => (
              <SelectItem key={e.id} value={e.id}>
                {e.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Card>

      {/* PRIMARY: upload screenshots of contacts */}
      <Card className="p-6 space-y-3 border-terracotta/60 border-2 bg-terracotta/5">
        <div className="flex items-center gap-2">
          <Camera className="w-5 h-5 text-terracotta" />
          <p className="font-semibold text-base">Upload contact screenshots — fastest way</p>
        </div>
        <ol className="text-sm text-muted-foreground list-decimal pl-5 space-y-1">
          <li>Open a contact on your phone and take a screenshot (or snap a business card).</li>
          <li>Tap below to pick the image(s). You can add up to 8 at once.</li>
          <li>
            We'll read the name, phone, and email for you and add them to the review list. You
            review before anything is saved.
          </li>
        </ol>
        <label className="block">
          <input
            ref={imageRef}
            type="file"
            accept="image/*"
            multiple
            disabled={ocrBusy || !eventId}
            onChange={(e) => onImages(e.target.files)}
            className="hidden"
          />
          <span
            className={`inline-flex items-center justify-center gap-2 h-11 px-5 rounded-md text-base font-medium cursor-pointer bg-terracotta text-cream hover:bg-terracotta/90 ${ocrBusy || !eventId ? "opacity-50 pointer-events-none" : ""}`}
          >
            {ocrBusy ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Reading screenshots…
              </>
            ) : (
              <>
                <Camera className="w-4 h-4" /> Choose screenshots
              </>
            )}
          </span>
        </label>
        {imagePreviews.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-2">
            {imagePreviews.map((src, i) => (
              <div key={i} className="relative">
                <img
                  src={src}
                  alt={`Contact screenshot ${i + 1}`}
                  className="h-20 w-20 object-cover rounded-md border border-border"
                />
                <button
                  type="button"
                  onClick={() =>
                    setImagePreviews((prev) => prev.filter((_, idx) => idx !== i))
                  }
                  className="absolute -top-2 -right-2 bg-background border border-border rounded-full p-0.5 shadow-sm"
                  aria-label="Remove preview"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          Nothing is added to your guest list until you review the results below and tap{" "}
          <em>Add all</em>.
        </p>
      </Card>

      <Card className="p-6 space-y-3">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="w-4 h-4 text-terracotta" />
          <p className="font-medium">CSV / Excel file</p>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
          className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:bg-ink file:text-cream hover:file:bg-ink/90 file:cursor-pointer"
        />
        <p className="text-xs text-muted-foreground">
          Expected columns: <code>name</code>, <code>email</code>, <code>phone</code>,{" "}
          <code>notes</code>.
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
              <p className="font-medium">
                {rows.length} {rows.length === 1 ? "guest" : "guests"} ready
              </p>
              {dupCount > 0 && (
                <Badge variant="outline" className="border-terracotta text-terracotta">
                  <AlertCircle className="w-3 h-3 mr-1" /> {dupCount} possible duplicate
                  {dupCount === 1 ? "" : "s"}
                </Badge>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                disabled={busy || dupCount === 0}
                onClick={() => importAll(true)}
              >
                Skip duplicates
              </Button>
              <Button
                disabled={busy}
                onClick={() => importAll(false)}
                className="bg-ink text-cream hover:bg-ink/90"
              >
                <Upload className="w-4 h-4 mr-2" /> Add all
              </Button>
            </div>
          </div>
          <div className="divide-y divide-border max-h-[480px] overflow-auto">
            {rows.map((r, idx) => (
              <div key={idx} className="px-4 py-2.5 flex flex-wrap items-center gap-3 text-sm">
                <span className="text-xs text-muted-foreground w-8">#{r._row}</span>
                <span className="font-medium flex-1 min-w-[140px]">{r.guest_name}</span>
                <span className="text-muted-foreground min-w-[160px] break-all">
                  {r.guest_email}
                </span>
                <span className="text-muted-foreground min-w-[110px]">{r.guest_phone}</span>
                {r._dupReason && (
                  <Badge
                    variant="outline"
                    className="border-terracotta text-terracotta text-[10px]"
                  >
                    {r._dupReason}
                  </Badge>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label={`Remove ${r.guest_name}`}
                  onClick={() => {
                    setRows((prev) =>
                      prev
                        .filter((_, i) => i !== idx)
                        .map((row, i) => ({ ...row, _row: i + 1, _dupReason: undefined })),
                    );
                  }}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <X className="w-4 h-4 mr-1" /> Remove
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
