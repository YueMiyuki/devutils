const STORAGE_KEY = "devutils-click-tracker";

type Listener = (state: ClickTrackerState) => void;

export interface ClickTrackerState {
  lifetime: number;
  session: number;
  persist: boolean;
}

let lifetime = 0;
let session = 0;
let persist = true;
const listeners = new Set<Listener>();
let initialized = false;

function notify() {
  const snapshot = getState();
  listeners.forEach((listener) => listener(snapshot));
}

function safeParse(value: string | null): Partial<ClickTrackerState> | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as Partial<ClickTrackerState>;
  } catch {
    return null;
  }
}

function persistState() {
  if (typeof window === "undefined" || !persist) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ lifetime, persist }));
  } catch {
    // ignore storage errors
  }
}

function init() {
  if (initialized || typeof window === "undefined") return;
  initialized = true;
  const parsed = safeParse(localStorage.getItem(STORAGE_KEY));
  if (parsed?.lifetime && Number.isFinite(parsed.lifetime)) {
    lifetime = parsed.lifetime;
  }
  if (typeof parsed?.persist === "boolean") {
    persist = parsed.persist;
  }
}

export function incrementClicks(amount = 1) {
  init();
  if (!Number.isFinite(amount) || amount <= 0) return;
  lifetime += amount;
  session += amount;
  persistState();
  notify();
}

export function resetSessionClicks() {
  session = 0;
  notify();
  persistState();
}

export function setClickPersist(enabled: boolean) {
  persist = enabled;
  persistState();
  notify();
}

export function getState(): ClickTrackerState {
  init();
  return { lifetime, session, persist };
}

export function subscribeClickTracker(listener: Listener): () => void {
  init();
  listeners.add(listener);
  listener(getState());
  return () => {
    listeners.delete(listener);
  };
}
