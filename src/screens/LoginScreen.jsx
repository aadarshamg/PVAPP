import React, { useState, useCallback } from 'react';
import {
    View, Text, TouchableOpacity, StyleSheet,
    ActivityIndicator, Alert, TextInput, Image, StatusBar, BackHandler,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Svg, { Path } from 'react-native-svg';
import { Mail, KeyRound, Eye, EyeOff } from 'lucide-react-native';
import { useAuth } from '../contexts/AuthContext';
import AuthSubScreen, { authSubStyles } from '../components/AuthSubScreen';

const LOGO = require('../../assets/images/logo.png');

const GoogleIcon = ({ white }) => (
    <Svg width="20" height="20" viewBox="0 0 48 48">
        <Path fill={white ? '#fff' : '#EA4335'} d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
        <Path fill={white ? '#fff' : '#4285F4'} d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
        <Path fill={white ? '#fff' : '#FBBC05'} d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
        <Path fill={white ? '#fff' : '#34A853'} d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </Svg>
);

// ─── Options Screen ────────────────────────────────────────────────────────────
function OptionsView({ onGoogle, onEmail, loading, onTerms, onPrivacy }) {
    const insets = useSafeAreaInsets();
    return (
        <View style={{ flex: 1, backgroundColor: '#22973a' }}>
            <StatusBar barStyle="light-content" />

            {/* Hero */}
            <View style={[styles.hero, { paddingTop: insets.top + 24 }]}>
                <Image source={LOGO} style={styles.logo} resizeMode="contain" />
                <Text style={styles.appName}>Pizza Virus</Text>
                <Text style={styles.tagline}>Order delicious pizzas in minutes</Text>
            </View>

            {/* Bottom Sheet */}
            <View style={[styles.sheet, { paddingBottom: insets.bottom + 20 }]}>
                <Text style={styles.sheetTitle}>Get Started</Text>

                {/* Google — Primary */}
                <TouchableOpacity
                    style={styles.primaryBtn}
                    onPress={onGoogle}
                    activeOpacity={0.85}
                    disabled={loading}
                >
                    <GoogleIcon white />
                    <Text style={styles.primaryBtnText}>Continue with Google</Text>
                </TouchableOpacity>

                {/* Divider */}
                <View style={styles.divider}>
                    <View style={styles.dividerLine} />
                    <Text style={styles.dividerText}>or</Text>
                    <View style={styles.dividerLine} />
                </View>

                {/* Email */}
                <TouchableOpacity
                    style={styles.socialBtn}
                    onPress={onEmail}
                    activeOpacity={0.8}
                >
                    <Mail size={20} color="#EA4335" strokeWidth={2} />
                    <Text style={styles.socialBtnText}>Continue with Email</Text>
                </TouchableOpacity>

                {loading && <ActivityIndicator size="small" color="#22973a" style={{ marginTop: 12 }} />}

                <Text style={styles.terms}>
                    By continuing, you agree to our{' '}
                    <Text style={styles.termsLink} onPress={onTerms}>Terms of Service</Text>
                    {' '}and{' '}
                    <Text style={styles.termsLink} onPress={onPrivacy}>Privacy Policy</Text>
                </Text>
            </View>
        </View>
    );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function LoginScreen({ navigation }) {
    const [mode, setMode]         = useState('options');
    const [email, setEmail]       = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading]   = useState(false);
    const [resetSent, setResetSent] = useState(false);

    const { signInWithEmail, signInWithGoogle, resetPasswordForEmail } = useAuth();

    // Intercept Android hardware back so it navigates between modes, not out of the app
    useFocusEffect(
        useCallback(() => {
            const onBack = () => {
                if (mode === 'email' || mode === 'forgot') { setMode('options'); return true; }
                return false;
            };
            const subscription = BackHandler.addEventListener('hardwareBackPress', onBack);
            return () => subscription.remove();
        }, [mode])
    );

    const handleEmailLogin = async () => {
        if (!email || !password) {
            Alert.alert('Missing Fields', 'Please enter your email and password.');
            return;
        }
        setLoading(true);
        try {
            await signInWithEmail(email, password);
        } catch (e) {
            Alert.alert('Login Failed', e.message);
        } finally {
            setLoading(false);
        }
    };

    const handleGoogle = async () => {
        setLoading(true);
        try {
            await signInWithGoogle();
        } catch (e) {
            Alert.alert('Google Sign-In Failed', e.message);
        } finally {
            setLoading(false);
        }
    };

    const handleForgotPassword = async () => {
        if (!email) {
            Alert.alert('Missing Email', 'Please enter your account email.');
            return;
        }
        setLoading(true);
        try {
            await resetPasswordForEmail(email);
            setResetSent(true);
        } catch (e) {
            Alert.alert('Reset Failed', e.message);
        } finally {
            setLoading(false);
        }
    };

    if (mode === 'options') {
        return (
            <OptionsView
                onGoogle={handleGoogle}
                onEmail={() => setMode('email')}
                loading={loading}
                onTerms={() => navigation.navigate('Legal', { section: 'terms' })}
                onPrivacy={() => navigation.navigate('Legal', { section: 'privacy' })}
            />
        );
    }

    if (mode === 'email') {
        return (
            <AuthSubScreen
                onBack={() => setMode('options')}
                icon={<Mail size={48} color="#EA4335" strokeWidth={1.5} style={{ marginBottom: 12 }} />}
                title="Sign In with Email"
                subtitle="Use your registered email and password"
            >
                <View style={authSubStyles.card}>
                    <View style={authSubStyles.inputGroup}>
                        <Text style={authSubStyles.label}>Email</Text>
                        <TextInput
                            style={authSubStyles.input}
                            placeholder="you@example.com"
                            placeholderTextColor="#9CA3AF"
                            value={email}
                            onChangeText={setEmail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            autoFocus
                        />
                    </View>
                    <View style={authSubStyles.inputGroup}>
                        <Text style={authSubStyles.label}>Password</Text>
                        <View style={styles.passwordWrapper}>
                            <TextInput
                                style={[authSubStyles.input, styles.passwordInput]}
                                placeholder="Enter your password"
                                placeholderTextColor="#9CA3AF"
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry={!showPassword}
                            />
                            <TouchableOpacity
                                style={styles.eyeBtn}
                                onPress={() => setShowPassword(prev => !prev)}
                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            >
                                {showPassword
                                    ? <EyeOff size={20} color="#9CA3AF" />
                                    : <Eye size={20} color="#9CA3AF" />
                                }
                            </TouchableOpacity>
                        </View>
                    </View>
                    <TouchableOpacity style={styles.forgotBtn} onPress={() => { setResetSent(false); setMode('forgot'); }}>
                        <Text style={styles.forgotText}>Forgot Password?</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[authSubStyles.primaryBtn, loading && authSubStyles.btnDisabled]}
                        onPress={handleEmailLogin}
                        disabled={loading}
                        activeOpacity={0.85}
                    >
                        {loading
                            ? <ActivityIndicator color="#fff" />
                            : <Text style={authSubStyles.primaryBtnText}>Sign In</Text>
                        }
                    </TouchableOpacity>
                    <TouchableOpacity style={authSubStyles.linkBtn} onPress={() => navigation.navigate('SignUp')}>
                        <Text style={authSubStyles.linkText}>
                            New here?{' '}
                            <Text style={authSubStyles.linkBold}>Create Account</Text>
                        </Text>
                    </TouchableOpacity>
                </View>
            </AuthSubScreen>
        );
    }

    if (mode === 'forgot') {
        return (
            <AuthSubScreen
                onBack={() => setMode('email')}
                icon={<KeyRound size={48} color="#22973a" strokeWidth={1.5} style={{ marginBottom: 12 }} />}
                title="Reset Password"
                subtitle={resetSent
                    ? 'Check your email for a reset link'
                    : 'Enter your account email and we\'ll send you a reset link'}
            >
                <View style={authSubStyles.card}>
                    {resetSent ? (
                        <Text style={styles.resetSentText}>
                            We've sent a password reset link to {email}. Tap the link on this device to set a new password.
                        </Text>
                    ) : (
                        <>
                            <View style={authSubStyles.inputGroup}>
                                <Text style={authSubStyles.label}>Email</Text>
                                <TextInput
                                    style={authSubStyles.input}
                                    placeholder="you@example.com"
                                    placeholderTextColor="#9CA3AF"
                                    value={email}
                                    onChangeText={setEmail}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    autoFocus
                                />
                            </View>
                            <TouchableOpacity
                                style={[authSubStyles.primaryBtn, loading && authSubStyles.btnDisabled]}
                                onPress={handleForgotPassword}
                                disabled={loading}
                                activeOpacity={0.85}
                            >
                                {loading
                                    ? <ActivityIndicator color="#fff" />
                                    : <Text style={authSubStyles.primaryBtnText}>Send Reset Link</Text>
                                }
                            </TouchableOpacity>
                        </>
                    )}
                </View>
            </AuthSubScreen>
        );
    }

    return null;
}

const styles = StyleSheet.create({
    // ── Password visibility toggle ─────────────────────────────────
    passwordWrapper: { position: 'relative', justifyContent: 'center' },
    passwordInput: { paddingRight: 46 },
    eyeBtn: { position: 'absolute', right: 14 },

    // ── Options ──────────────────────────────────────────────────
    hero: {
        alignItems: 'center',
        paddingBottom: 36,
        paddingHorizontal: 24,
    },
    logo: {
        width: 96,
        height: 96,
        marginBottom: 14,
    },
    appName: {
        fontSize: 36,
        fontWeight: '900',
        color: '#fff',
        letterSpacing: -0.5,
    },
    tagline: {
        fontSize: 15,
        color: 'rgba(255,255,255,0.75)',
        marginTop: 6,
        fontWeight: '500',
    },
    sheet: {
        flex: 1,
        backgroundColor: '#fff',
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        paddingHorizontal: 28,
        paddingTop: 28,
    },
    sheetTitle: {
        fontSize: 22,
        fontWeight: '900',
        color: '#0f172a',
        marginBottom: 20,
    },

    // ── Options primary button ─────────────────────────────────────
    primaryBtn: {
        backgroundColor: '#22973a',
        paddingVertical: 16,
        borderRadius: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        shadowColor: '#22973a',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 4,
        marginBottom: 4,
    },
    primaryBtnText: {
        color: '#fff',
        fontSize: 17,
        fontWeight: '700',
    },

    // ── Divider ───────────────────────────────────────────────────
    divider: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 18,
    },
    dividerLine: { flex: 1, height: 1, backgroundColor: '#E5E7EB' },
    dividerText: { marginHorizontal: 14, fontSize: 13, color: '#9CA3AF', fontWeight: '600' },

    // ── Social Buttons ────────────────────────────────────────────
    socialBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        paddingVertical: 14,
        borderRadius: 14,
        borderWidth: 1.5,
        borderColor: '#E5E7EB',
        backgroundColor: '#fff',
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
        elevation: 1,
    },
    socialBtnText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#374151',
    },

    // ── Terms ─────────────────────────────────────────────────────
    terms: {
        textAlign: 'center',
        fontSize: 12,
        color: '#9CA3AF',
        marginTop: 20,
        lineHeight: 18,
    },
    termsLink: {
        color: '#22973a',
        fontWeight: '600',
    },

    // ── Forgot password link ───────────────────────────────────────
    forgotBtn: { alignSelf: 'flex-end', marginBottom: 16, marginTop: -8 },
    forgotText: { fontSize: 13, fontWeight: '700', color: '#22973a' },

    // ── Reset sent confirmation ─────────────────────────────────────
    resetSentText: { fontSize: 14, color: '#374151', lineHeight: 21, textAlign: 'center' },
});
