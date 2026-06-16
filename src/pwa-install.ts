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

export function getInstallPromptSnapshot(): InstallState {
  if (typeof window !== "undefined") {
    state.installed = state.installed || isStandaloneApp();
  }
  return { ...state };
}

export function subscribeToInstallPrompt(callback: () => void) {
  subscribers.add(callback);
  return () => subscribers.delete(callback);
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