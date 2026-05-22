import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";

type DraftData = Record<string, unknown>;

const prefix = "platform-draft";

export function draftScopeKey(scope: string) {
  return `${prefix}:${scope}`;
}

function readScope(scope: string): DraftData {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(draftScopeKey(scope));
    return raw ? (JSON.parse(raw) as DraftData) : {};
  } catch {
    return {};
  }
}

function writeScope(scope: string, data: DraftData) {
  if (typeof window === "undefined") return;
  const hasValues = Object.values(data).some((value) => {
    if (typeof value === "string") return value.trim().length > 0;
    if (Array.isArray(value)) return value.length > 0;
    return value !== null && value !== undefined && value !== false;
  });
  if (!hasValues) window.localStorage.removeItem(draftScopeKey(scope));
  else window.localStorage.setItem(draftScopeKey(scope), JSON.stringify(data));
}

export function clearDraftScope(scope: string) {
  if (typeof window !== "undefined") window.localStorage.removeItem(draftScopeKey(scope));
}

export function useDraftedState<T>(
  scope: string,
  initialValue: T,
): [T, Dispatch<SetStateAction<T>>, () => void] {
  const [value, setValue] = useState<T>(initialValue);
  const hydrated = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(draftScopeKey(scope));
      if (raw) setValue(JSON.parse(raw) as T);
    } catch {
      // Ignore bad draft data instead of breaking the page.
    }
    hydrated.current = true;
  }, [scope]);

  useEffect(() => {
    if (!hydrated.current || typeof window === "undefined") return;
    try {
      window.localStorage.setItem(draftScopeKey(scope), JSON.stringify(value));
    } catch {
      // Drafts are a safety net; storage failures should never block the app.
    }
  }, [scope, value]);

  const clear = () => clearDraftScope(scope);
  return [value, setValue, clear];
}

export function useDraftState<T>(
  scope: string,
  field: string,
  initialValue: T,
): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(initialValue);
  const hydrated = useRef(false);

  useEffect(() => {
    const draft = readScope(scope);
    if (Object.prototype.hasOwnProperty.call(draft, field)) {
      setValue(draft[field] as T);
    }
    hydrated.current = true;
  }, [scope, field]);

  useEffect(() => {
    if (!hydrated.current) return;
    const draft = readScope(scope);
    draft[field] = value;
    writeScope(scope, draft);
  }, [scope, field, value]);

  return [value, setValue];
}