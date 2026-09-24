import React, { createContext, useContext, useEffect, useState } from 'react';
import { Platform, Linking } from 'react-native';
import { supabase } from '../lib/supabase';
import { makeRedirectUri } from 'expo-auth-session';
import { withTimeout } from '../utils/withTimeout';

// Conditionally import WebBrowser only on native
let WebBrowser = null;
if (Platform.OS !== 'web') {
    WebBrowser = require('expo-web-browser');
    WebBrowser.maybeCompleteAuthSession();
}

const AuthContext = createContext({});

const AUTH_TIMEOUT_MS = 15000;               // plain network round-trips
const OAUTH_INTERACTION_TIMEOUT_MS = 180000; // human-paced browser/native-sheet steps (3 min)

// Safety net for the DB trigger that's supposed to create a profiles row on
// signup — orders.customer_id references profiles(id), so if that row is
// ever missing (trigger disabled/misconfigured), checkout fails with a
// foreign key violation. ignoreDuplicates means this is a no-op for users
// who already have a profile, and never touches their existing role/name.
const ensureProfile = async (user) => {
    if (!user) return;
    try {
        const { error } = await withTimeout(
            supabase.from('profiles').upsert(
                { id: user.id, name: user.user_metadata?.name || 'New Customer' },
                { onConflict: 'id', ignoreDuplicates: true }
            ),
            AUTH_TIMEOUT_MS,
            'ensureProfile_timeout'
        );
        if (error) console.warn('ensureProfile failed:', error.message);
    } catch (e) {
        console.warn('ensureProfile failed:', e.message);
    }
};

// Helper to extract params from URL hash or query string
const extractParamsFromUrl = (url) => {
    const params = {};
    const hashPart = url.split('#')[1] || '';
    const queryPart = url.split('?')[1]?.split('#')[0] || '';
    const combined = hashPart || queryPart;
    combined.split('&').forEach(pair => {
        const [key, value] = pair.split('=');
        if (key) params[decodeURIComponent(key)] = decodeURIComponent(value || '');
    });
    return params;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [session, setSession] = useState(null);
    const [loading, setLoading] = useState(true);
    const [recoveryMode, setRecoveryMode] = useState(false);

    useEffect(() => {
        // Get initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setUser(session?.user ?? null);
            setLoading(false);
            if (session?.user) ensureProfile(session.user);
        });

        // Listen for auth state changes (handles web OAuth redirect automatically)
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            setSession(session);
            setUser(session?.user ?? null);
            setLoading(false);
            // Supabase's own guidance: calling another supabase.auth-dependent method
            // synchronously inside this callback can deadlock (this callback runs while
            // the client's internal lock is still held, and ensureProfile's own query
            // needs that same lock to attach the session). Deferring to the next tick
            // avoids it — this is the same fix already applied in admin-portal/staff-portal.
            if (event === 'SIGNED_IN' && session?.user) {
                setTimeout(() => ensureProfile(session.user), 0);
            }
        });

        // On web, check URL hash for tokens on page load (after OAuth redirect)
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
            const hash = window.location.hash;
            if (hash && hash.includes('access_token')) {
                const params = extractParamsFromUrl(window.location.href);
                if (params.access_token && params.refresh_token) {
                    supabase.auth.setSession({
                        access_token: params.access_token,
                        refresh_token: params.refresh_token,
                    }).then(() => {
                        // Clean up the URL
                        window.history.replaceState(null, '', window.location.pathname);
                    });
                }
            }
        }

        return () => subscription?.unsubscribe();
    }, []);

    // Mobile deep link handling for the password-recovery email link (pizzavirus://reset-password#...)
    useEffect(() => {
        if (Platform.OS === 'web') return;

        const handleUrl = (url) => {
            if (!url || !url.includes('reset-password')) return;
            const params = extractParamsFromUrl(url);
            if (params.access_token && params.refresh_token) {
                supabase.auth.setSession({
                    access_token: params.access_token,
                    refresh_token: params.refresh_token,
                }).then(() => setRecoveryMode(true));
            }
        };

        Linking.getInitialURL().then(url => handleUrl(url));
        const subscription = Linking.addEventListener('url', ({ url }) => handleUrl(url));
        return () => subscription.remove();
    }, []);

    // Email/Password Sign In
    const signInWithEmail = async (email, password) => {
        const { data, error } = await withTimeout(
            supabase.auth.signInWithPassword({ email, password }),
            AUTH_TIMEOUT_MS,
            'Sign-in is taking too long. Check your internet connection and try again.'
        );
        if (error) throw error;
        return data;
    };

    // Email/Password Sign Up — triggers a signup-confirmation OTP email
    const signUp = async (email, password, name) => {
        const { data, error } = await withTimeout(
            supabase.auth.signUp({ email, password, options: { data: { name } } }),
            AUTH_TIMEOUT_MS,
            'Sign-up is taking too long. Check your internet connection and try again.'
        );
        if (error) throw error;
        return data;
    };

    // Verify the OTP code sent to the user's email after sign up
    const verifySignUpOtp = async (email, token) => {
        const { data, error } = await withTimeout(
            supabase.auth.verifyOtp({ email, token, type: 'signup' }),
            AUTH_TIMEOUT_MS,
            'Verification is taking too long. Check your internet connection and try again.'
        );
        if (error) throw error;
        return data;
    };

    // Resend the signup OTP code
    const resendSignUpOtp = async (email) => {
        const { error } = await withTimeout(
            supabase.auth.resend({ type: 'signup', email }),
            AUTH_TIMEOUT_MS,
            'Resending the code is taking too long. Check your internet connection and try again.'
        );
        if (error) throw error;
    };

    // Google Sign In
    const signInWithGoogle = async () => {
        if (Platform.OS === 'web') {
            // On web: redirect the current page to Google (no popup needed)
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: window.location.origin,
                },
            });
            if (error) throw error;
            // The page will redirect to Google, then back to our app
            // onAuthStateChange will pick up the session automatically
        } else {
            // On mobile: open an in-app browser
            const redirectUrl = makeRedirectUri({ scheme: 'pizzavirus', path: 'auth/callback' });

            const { data, error } = await withTimeout(
                supabase.auth.signInWithOAuth({
                    provider: 'google',
                    options: {
                        redirectTo: redirectUrl,
                        skipBrowserRedirect: true,
                    },
                }),
                AUTH_TIMEOUT_MS,
                'Could not start Google sign-in. Check your internet connection and try again.'
            );
            if (error) throw error;

            if (data?.url) {
                let result;
                try {
                    result = await withTimeout(
                        WebBrowser.openAuthSessionAsync(data.url, redirectUrl),
                        OAUTH_INTERACTION_TIMEOUT_MS,
                        'Google sign-in timed out. Please try again.'
                    );
                } catch (e) {
                    try { WebBrowser.dismissAuthSession(); } catch (_) {}
                    throw e;
                }

                if (result.type === 'success' && result.url) {
                    const params = extractParamsFromUrl(result.url);
                    if (params.access_token && params.refresh_token) {
                        const { error: sessionError } = await withTimeout(
                            supabase.auth.setSession({
                                access_token: params.access_token,
                                refresh_token: params.refresh_token,
                            }),
                            AUTH_TIMEOUT_MS,
                            'Signed in with Google, but finishing setup timed out. Please try again.'
                        );
                        if (sessionError) throw sessionError;
                    }
                } else if (result.type === 'cancel' || result.type === 'dismiss') {
                    throw new Error('Sign in was cancelled');
                }
            }
        }
    };

    // Apple Sign In (iOS only)
    const signInWithApple = async () => {
        if (Platform.OS !== 'ios') {
            throw new Error('Apple Sign In is only available on iOS');
        }

        const AppleAuthentication = require('expo-apple-authentication');
        const Crypto = require('expo-crypto');

        const nonce = Math.random().toString(36).substring(2, 15);
        const hashedNonce = await Crypto.digestStringAsync(
            Crypto.CryptoDigestAlgorithm.SHA256,
            nonce
        );

        const credential = await withTimeout(
            AppleAuthentication.signInAsync({
                requestedScopes: [
                    AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
                    AppleAuthentication.AppleAuthenticationScope.EMAIL,
                ],
                nonce: hashedNonce,
            }),
            OAUTH_INTERACTION_TIMEOUT_MS,
            'Apple sign-in timed out. Please try again.'
        );

        if (credential.identityToken) {
            const { data, error } = await withTimeout(
                supabase.auth.signInWithIdToken({
                    provider: 'apple',
                    token: credential.identityToken,
                    nonce,
                }),
                AUTH_TIMEOUT_MS,
                'Signed in with Apple, but finishing setup timed out. Please try again.'
            );
            if (error) throw error;
            return data;
        }
        throw new Error('Apple Sign In failed - no identity token');
    };

    const signOut = () => {
        setRecoveryMode(false);
        return withTimeout(
            supabase.auth.signOut(),
            AUTH_TIMEOUT_MS,
            'Sign-out is taking too long. Check your internet connection and try again.'
        );
    };

    // Permanently deletes the signed-in user's own account (Apple Guideline 5.1.1v —
    // apps that support account creation must offer in-app account deletion). Runs via
    // an edge function since deleting an auth user needs the service-role key; the
    // function independently re-verifies the caller's token, so it can only ever delete
    // the account making the request. Past orders survive (anonymized), only the
    // account/profile/saved-on-device data goes away.
    const deleteAccount = async () => {
        const { data: { session: currentSession } } = await withTimeout(
            supabase.auth.getSession(),
            AUTH_TIMEOUT_MS,
            'Could not verify your session. Check your internet connection and try again.'
        );
        if (!currentSession?.access_token) throw new Error('You must be signed in to delete your account.');

        const { data, error } = await withTimeout(
            supabase.functions.invoke('delete-account', {
                headers: { Authorization: `Bearer ${currentSession.access_token}` },
            }),
            AUTH_TIMEOUT_MS,
            'Deleting your account is taking too long. Check your internet connection and try again.'
        );
        if (error) throw error;
        if (!data?.success) throw new Error(data?.error || 'Failed to delete account.');

        // The auth user is gone server-side — clear the local session too.
        setRecoveryMode(false);
        await withTimeout(
            supabase.auth.signOut(),
            AUTH_TIMEOUT_MS,
            'Account deleted, but sign-out is taking too long. Please restart the app.'
        );
    };

    // Send a password-reset email that deep-links back into the app
    const resetPasswordForEmail = async (email) => {
        const redirectUrl = makeRedirectUri({ scheme: 'pizzavirus', path: 'reset-password' });
        const { error } = await withTimeout(
            supabase.auth.resetPasswordForEmail(email, { redirectTo: redirectUrl }),
            AUTH_TIMEOUT_MS,
            'Sending the reset email is taking too long. Check your internet connection and try again.'
        );
        if (error) throw error;
    };

    // Set a new password while in recovery mode (or for a signed-in user)
    const updatePassword = async (newPassword) => {
        const { error } = await withTimeout(
            supabase.auth.updateUser({ password: newPassword }),
            AUTH_TIMEOUT_MS,
            'Updating your password is taking too long. Check your internet connection and try again.'
        );
        if (error) throw error;
        setRecoveryMode(false);
    };

    return (
        <AuthContext.Provider value={{
            user, session,
            signInWithEmail, signUp,
            verifySignUpOtp, resendSignUpOtp,
            signInWithGoogle, signInWithApple,
            signOut, deleteAccount, loading,
            recoveryMode, resetPasswordForEmail, updatePassword,
        }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
