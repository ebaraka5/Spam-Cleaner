import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
  signOut
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/gmail.modify');
provider.setCustomParameters({ prompt: 'consent select_account', access_type: 'offline' });

const TOKEN_KEY = 'ec_google_access_token';
const EMAIL_KEY = 'ec_google_user_email';

export const getStoredToken = (): string | null => {
  try {
    return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};

export const setStoredToken = (token: string | null) => {
  try {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
      sessionStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem(TOKEN_KEY);
    }
  } catch {
    // Ignore storage errors in restricted contexts
  }
};

export const getStoredEmail = (): string | null => {
  try {
    return localStorage.getItem(EMAIL_KEY) || sessionStorage.getItem(EMAIL_KEY);
  } catch {
    return null;
  }
};

export const setStoredEmail = (email: string | null) => {
  try {
    if (email) {
      localStorage.setItem(EMAIL_KEY, email);
      sessionStorage.setItem(EMAIL_KEY, email);
    } else {
      localStorage.removeItem(EMAIL_KEY);
      sessionStorage.removeItem(EMAIL_KEY);
    }
  } catch {
    // Ignore storage errors in restricted contexts
  }
};

let isSigningIn = false;
let isCheckingRedirect = true;
let cachedAccessToken: string | null = getStoredToken();

export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  isCheckingRedirect = true;

  let hasHandledRedirect = false;

  // Check if returning from a signInWithRedirect flow
  getRedirectResult(auth)
    .then((result) => {
      if (result) {
        const credential = GoogleAuthProvider.credentialFromResult(result);
        if (credential?.accessToken) {
          hasHandledRedirect = true;
          cachedAccessToken = credential.accessToken;
          setStoredToken(credential.accessToken);
          if (result.user.email) setStoredEmail(result.user.email);
          if (onAuthSuccess) onAuthSuccess(result.user, cachedAccessToken);
        }
      }
    })
    .catch((err) => {
      console.warn('Redirect result check notice:', err);
    })
    .finally(() => {
      isCheckingRedirect = false;
      if (!hasHandledRedirect) {
        const currentUser = auth.currentUser;
        const token = cachedAccessToken || getStoredToken();
        if (currentUser && token) {
          if (onAuthSuccess) onAuthSuccess(currentUser, token);
        } else if (!currentUser && !token) {
          if (onAuthFailure) onAuthFailure();
        }
      }
    });

  return onAuthStateChanged(auth, async (user: User | null) => {
    if (isCheckingRedirect) {
      // Do not prematurely process auth state while getRedirectResult is in-flight
      return;
    }

    if (user) {
      const token = cachedAccessToken || getStoredToken();
      if (token) {
        cachedAccessToken = token;
        if (onAuthSuccess) onAuthSuccess(user, token);
      } else if (!isSigningIn) {
        // User exists in Firebase but no OAuth token is available yet in local storage
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      // Do not wipe cachedAccessToken or stored tokens here.
      // onAuthStateChanged fires with null on initial boot before IndexedDB resolves.
      // Only explicit logout() should clear stored credentials.
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to get access token from Google sign in');
    }

    cachedAccessToken = credential.accessToken;
    setStoredToken(cachedAccessToken);
    if (result.user.email) setStoredEmail(result.user.email);
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error) {
    console.error('Google Sign In error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const googleSignInRedirect = async (): Promise<void> => {
  isSigningIn = true;
  await signInWithRedirect(auth, provider);
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken || getStoredToken();
};

export const logout = async () => {
  await signOut(auth);
  cachedAccessToken = null;
  setStoredToken(null);
  setStoredEmail(null);
};
