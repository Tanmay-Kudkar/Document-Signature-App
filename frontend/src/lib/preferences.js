import { backendBase } from './documents';
import { getStoredToken } from './auth';

const authHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${getStoredToken()}`,
});

/**
 * Load saved preferences from the server.
 * Returns { sig_config, field_colors } or null if the user is not logged in.
 */
export const loadPreferences = async () => {
  const token = getStoredToken();
  if (!token) return null;
  try {
    const res = await fetch(`${backendBase}/api/user/preferences`, {
      headers: authHeaders(),
    });
    if (!res.ok) return null;
    return await res.json(); // { sig_config, field_colors }
  } catch {
    return null;
  }
};

/**
 * Persist preferences to the server (debounce this on the call site).
 * @param {{ sig_config?: object, field_colors?: object }} prefs
 */
export const savePreferences = async (prefs) => {
  const token = getStoredToken();
  if (!token) return;
  try {
    await fetch(`${backendBase}/api/user/preferences`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(prefs),
    });
  } catch {
    // silently fail — localStorage is still the fallback
  }
};
