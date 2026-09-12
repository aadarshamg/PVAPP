import React, { createContext, useContext, useEffect, useState } from 'react';
import { Platform, Linking } from 'react-native';
import { supabase } from '../lib/supabase';
import { makeRedirectUri } from 'expo-auth-session';

// Conditionally import WebBrowser only on native
let WebBrowser = null;
if (Platform.OS !== 'web') {
    WebBrowser = require('expo-web-browser');
    WebBrowser.maybeCompleteAuthSession();
}

const AuthContext = createContext({});

// Safety net for the DB trigger that's supposed to create a profiles row on
// signup — orders.customer_id references profiles(id), so if that row is
// ever missing (trigger disabled/misconfigured), checkout fails with a
// foreign key violation. ignoreDuplicates means this is a no-op for users
// who already have a profile, and never touches their existing role/name.
const ensureProfile = async (user) => {
    if (!user) return;
    const { error } = await supabase.from('profiles').upsert(
        { id: user.id, name: user.user_metadata?.name || 'New Customer' },
        { onConflict: 'id', ignoreDuplicates: true }
    );
    if (error) console.warn('ensureProfile failed:', error.message);
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
            if (event === 'SIGNED_IN' && session?.user) ensureProfile(session.user);
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
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        return data;
    };

    // Email/Password Sign Up — triggers a signup-confirmation OTP email
    const signUp = async (email, password, name) => {
        const { data, error } = await supabase.auth.signUp({
            email, password,
            options: { data: { name } }
        });
        if (error) throw error;
        return data;
    };

    // Verify the OTP code sent to the user's email after sign up
    const verifySignUpOtp = async (email, token) => {
        const { data, error } = await supabase.auth.verifyOtp({ email, token, type: 'signup' });
        if (error) throw error;
        return data;
    };

    // Resend the signup OTP code
    const resendSignUpOtp = async (email) => {
        const { error } = await supabase.auth.resend({ type: 'signup', email });
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

            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: redirectUrl,
                    skipBrowserRedirect: true,
                },
            });
            if (error) throw error;

            if (data?.url) {
                const result = await WebBrowser.openAuthSessionAsync(
                    data.url,
                    redirectUrl
                );

                if (result.type === 'success' && result.url) {
                    const params = extractParamsFromUrl(result.url);
                    if (params.access_token && params.refresh_token) {
                        const { error: sessionError } = await supabase.auth.setSession({
                            access_token: params.access_token,
                            refresh_token: params.refresh_token,
                        });
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

        const credential = await AppleAuthentication.signInAsync({
            requestedScopes: [
                AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
                AppleAuthentication.AppleAuthenticationScope.EMAIL,
            ],
            nonce: hashedNonce,
        });

        if (credential.identityToken) {
            const { data, error } = await supabase.auth.signInWithIdToken({
                provider: 'apple',
                token: credential.identityToken,
                nonce,
            });
            if (error) throw error;
            return data;
        }
        throw new Error('Apple Sign In failed - no identity token');
    };

    const signOut = () => {
        setRecoveryMode(false);
        return supabase.auth.signOut();
    };

    // Send a password-reset email that deep-links back into the app
    const resetPasswordForEmail = async (email) => {
        const redirectUrl = makeRedirectUri({ scheme: 'pizzavirus', path: 'reset-password' });
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: redirectUrl });
        if (error) throw error;
    };

    // Set a new password while in recovery mode (or for a signed-in user)
    const updatePassword = async (newPassword) => {
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) throw error;
        setRecoveryMode(false);
    };

    return (
        <AuthContext.Provider value={{
            user, session,
            signInWithEmail, signUp,
            verifySignUpOtp, resendSignUpOtp,
            signInWithGoogle, signInWithApple,
            signOut, loading,
            recoveryMode, resetPasswordForEmail, updatePassword,
        }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
