export type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type InstallState = {
  prompt: BeforeInstallPromptEvent | null;
  installed: boolean;
};

const state: InstallState = {
  prompt: null,
  installed: false,
};

const subscribers = new Set<() => void>();
let initialized = false;

function notifySubscribers() {
  subscribers.forEach((subscriber) => subscriber());
}

export function isStandaloneApp(): boolean {
  if (typeof window === "undefined") return false;
  const standaloneDisplay = window.matchMedia?.("(display-mode: standalone)").matches;
  const iosStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone;
  return Boolean(standaloneDisplay || iosStandalone);
}

export function initializeInstallPromptCapture() {
  if (typeof window === "undefined" || initialized) return;
  initialized = true;
  state.installed = isStandaloneApp();

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    state.prompt = event as BeforeInstallPromptEvent;
    notifySubscribers();
  });

  window.addEventListener("appinstalled", () => {
    state.prompt = null;
    state.installed = true;
    notifySubscribers();
  });
}

let cachedSnapshot: InstallState = { ...state };

function refreshSnapshot() {
  if (
    cachedSnapshot.prompt !== state.prompt ||
    cachedSnapshot.installed !== state.installed
  ) {
    cachedSnapshot = { ...state };
  }
}

export function getInstallPromptSnapshot(): InstallState {
  refreshSnapshot();
  return cachedSnapshot;
}

export function subscribeToInstallPrompt(callback: () => void) {
  subscribers.add(callback);
  return () => {
    subscribers.delete(callback);
  };
}

export async function promptToInstallApp() {
  const prompt = state.prompt;
  if (!prompt) return false;

  state.prompt = null;
  notifySubscribers();
  await prompt.prompt();
  await prompt.userChoice;
  return true;
}