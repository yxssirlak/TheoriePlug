export const CONSENT_KEY = "tp-cookie-consent";
export const CONSENT_EVENT = "tp-consent-change";
export const OPEN_CONSENT_EVENT = "tp-open-cookie-settings";

// Alles wat alleen met toestemming voor voorkeuren mag worden opgeslagen
export const PREFERENCE_KEYS = ["tp-values-carousel-seen"] as const;

export type Consent = { v: 1; preferences: boolean };

export function readConsent(): Consent | null {
  try {
    const raw = window.localStorage.getItem(CONSENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.v === 1 && typeof parsed.preferences === "boolean" ? parsed : null;
  } catch {
    return null;
  }
}

export function saveConsent(preferences: boolean) {
  try {
    window.localStorage.setItem(CONSENT_KEY, JSON.stringify({ v: 1, preferences }));
    if (!preferences) PREFERENCE_KEYS.forEach((key) => window.localStorage.removeItem(key));
  } catch {
    // Opslag kan geblokkeerd zijn; de site werkt dan gewoon zonder onthouden
  }
  window.dispatchEvent(new Event(CONSENT_EVENT));
}

export function readPreference(key: (typeof PREFERENCE_KEYS)[number]) {
  try {
    return readConsent()?.preferences === true && window.localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

export function writePreference(key: (typeof PREFERENCE_KEYS)[number]) {
  try {
    if (readConsent()?.preferences === true) window.localStorage.setItem(key, "1");
  } catch {
    // zie saveConsent
  }
}
