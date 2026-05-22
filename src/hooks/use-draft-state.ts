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
    if (value && typeof value === "object") return Object.keys(value).length > 0;
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
    hydrated.current = false;
    if (typeof window === "undefined") return;
    let ready = 0;
    try {
      const raw = window.localStorage.getItem(draftScopeKey(scope));
      if (raw) setValue(JSON.parse(raw) as T);
    } catch {
      // Ignore bad draft data instead of breaking the page.
    }
    ready = window.setTimeout(() => { hydrated.current = true; }, 0);
    return () => window.clearTimeout(ready);
  }, [scope]);

  useEffect(() => {
    if (!hydrated.current || typeof window === "undefined") return;
    try {
      window.localStorage.setItem(draftScopeKey(scope), JSON.stringify(value));
    } catch {
      // Drafts are a safety net; storage failures should never block the app.
    }
  }, [scope, value]);

  const setDraftValue: Dispatch<SetStateAction<T>> = (nextValue) => {
    setValue((previous) => {
      const next = typeof nextValue === "function"
        ? (nextValue as (value: T) => T)(previous)
        : nextValue;
      if (typeof window !== "undefined") {
        try {
          window.localStorage.setItem(draftScopeKey(scope), JSON.stringify(next));
        } catch {
          // Draft persistence is best-effort only.
        }
      }
      return next;
    });
  };

  const clear = () => clearDraftScope(scope);
  return [value, setDraftValue, clear];
}

export function useDraftState<T>(
  scope: string,
  field: string,
  initialValue: T,
): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(initialValue);
  const hydrated = useRef(false);

  useEffect(() => {
    hydrated.current = false;
    const draft = readScope(scope);
    if (Object.prototype.hasOwnProperty.call(draft, field)) {
      setValue(draft[field] as T);
    }
    const ready = typeof window === "undefined" ? 0 : window.setTimeout(() => { hydrated.current = true; }, 0);
    return () => {
      if (ready) window.clearTimeout(ready);
    };
  }, [scope, field]);

  useEffect(() => {
    if (!hydrated.current) return;
    const draft = readScope(scope);
    draft[field] = value;
    writeScope(scope, draft);
  }, [scope, field, value]);

  const setDraftValue: Dispatch<SetStateAction<T>> = (nextValue) => {
    setValue((previous) => {
      const next = typeof nextValue === "function"
        ? (nextValue as (value: T) => T)(previous)
        : nextValue;
      const draft = readScope(scope);
      draft[field] = next;
      writeScope(scope, draft);
      return next;
    });
  };

  return [value, setDraftValue];
}