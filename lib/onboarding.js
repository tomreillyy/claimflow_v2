const STORAGE_KEY_PREFIX = 'claimflow_onboarding_';

export function hasCompletedOnboarding(userId) {
  if (!userId || typeof window === 'undefined') return true;
  try {
    return localStorage.getItem(`${STORAGE_KEY_PREFIX}${userId}`) === 'completed';
  } catch {
    return true;
  }
}

export function markOnboardingComplete(userId) {
  if (!userId || typeof window === 'undefined') return;
  try {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${userId}`, 'completed');
  } catch {}
}

export function resetOnboarding(userId) {
  if (!userId || typeof window === 'undefined') return;
  try {
    localStorage.removeItem(`${STORAGE_KEY_PREFIX}${userId}`);
  } catch {}
}
