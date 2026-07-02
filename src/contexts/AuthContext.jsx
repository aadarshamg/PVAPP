import React, { createContext, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { supabase } from '../lib/supabase';
import { makeRedirectUri } from 'expo-auth-session';

// Conditionally import WebBrowser only on native
let WebBrowser = null;
if (Platform.OS !== 'web') {
    WebBrowser = require('expo-web-browser');
    WebBrowser.maybeCompleteAuthSession();
}

const AuthContext = createContext({});

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

    useEffect(() => {
        // Get initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setUser(session?.user ?? null);
            setLoading(false);
        });

        // Listen for auth state changes (handles web OAuth redirect automatically)
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            setUser(session?.user ?? null);
            setLoading(false);
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

    // Email/Password Sign In
    const signInWithEmail = async (email, password) => {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        return data;
    };

    // Email/Password Sign Up
    const signUp = async (email, password, name) => {
        const { data, error } = await supabase.auth.signUp({
            email, password,
            options: { data: { name } }
        });
        if (error) throw error;
        return data;
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

    const signOut = () => supabase.auth.signOut();

    return (
        <AuthContext.Provider value={{
            user, session,
            signInWithEmail, signUp,
            signInWithGoogle, signInWithApple,
            signOut, loading
        }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
