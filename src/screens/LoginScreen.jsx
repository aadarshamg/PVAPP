import React, { useState, useCallback } from 'react';
import {
    View, Text, TouchableOpacity, StyleSheet,
    KeyboardAvoidingView, Platform, ActivityIndicator,
    Alert, TextInput, ScrollView, Image, StatusBar, BackHandler,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Svg, { Path } from 'react-native-svg';
import { Phone, Mail, ArrowLeft } from 'lucide-react-native';
import { useAuth } from '../contexts/AuthContext';

const LOGO = require('../../assets/images/logo.png');

const GoogleIcon = () => (
    <Svg width="20" height="20" viewBox="0 0 48 48">
        <Path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
        <Path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
        <Path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
        <Path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </Svg>
);

// ─── Options Screen ────────────────────────────────────────────────────────────
function OptionsView({ onPhone, onGoogle, onEmail, loading }) {
    const insets = useSafeAreaInsets();
    return (
        <View style={{ flex: 1, backgroundColor: '#22973a' }}>
            <StatusBar barStyle="light-content" backgroundColor="#22973a" />

            {/* Hero */}
            <View style={[styles.hero, { paddingTop: insets.top + 24 }]}>
                <Image source={LOGO} style={styles.logo} resizeMode="contain" />
                <Text style={styles.appName}>Pizza Virus</Text>
                <Text style={styles.tagline}>Order delicious pizzas in minutes</Text>
            </View>

            {/* Bottom Sheet */}
            <View style={[styles.sheet, { paddingBottom: insets.bottom + 20 }]}>
                <Text style={styles.sheetTitle}>Get Started</Text>

                {/* Phone — Primary */}
                <TouchableOpacity style={styles.primaryBtn} onPress={onPhone} activeOpacity={0.85}>
                    <Phone size={20} color="#fff" strokeWidth={2.5} />
                    <Text style={styles.primaryBtnText}>Continue with Phone</Text>
                </TouchableOpacity>

                {/* Divider */}
                <View style={styles.divider}>
                    <View style={styles.dividerLine} />
                    <Text style={styles.dividerText}>or</Text>
                    <View style={styles.dividerLine} />
                </View>

                {/* Google */}
                <TouchableOpacity
                    style={styles.socialBtn}
                    onPress={onGoogle}
                    activeOpacity={0.8}
                    disabled={loading}
                >
                    <GoogleIcon />
                    <Text style={styles.socialBtnText}>Continue with Google</Text>
                </TouchableOpacity>

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
                    <Text style={styles.termsLink}>Terms of Service</Text>
                    {' '}and{' '}
                    <Text style={styles.termsLink}>Privacy Policy</Text>
                </Text>
            </View>
        </View>
    );
}

// ─── Sub-screen shell ──────────────────────────────────────────────────────────
function SubScreen({ onBack, icon, title, subtitle, children }) {
    const insets = useSafeAreaInsets();
    return (
        <KeyboardAvoidingView
            style={{ flex: 1, backgroundColor: '#fff' }}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <StatusBar barStyle="dark-content" backgroundColor="#fff" />
            <ScrollView
                style={{ backgroundColor: '#fff' }}
                contentContainerStyle={[styles.subScroll, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 32 }]}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                <TouchableOpacity style={styles.backBtn} onPress={onBack} activeOpacity={0.7}>
                    <ArrowLeft size={22} color="#22973a" strokeWidth={2.5} />
                    <Text style={styles.backText}>Back</Text>
                </TouchableOpacity>

                <View style={styles.subHero}>
                    {icon}
                    <Text style={styles.subTitle}>{title}</Text>
                    {subtitle ? <Text style={styles.subSubtitle}>{subtitle}</Text> : null}
                </View>

                {children}
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function LoginScreen({ navigation }) {
    const [mode, setMode]               = useState('options');
    const [phone, setPhone]             = useState('');
    const [otp, setOtp]                 = useState('');
    const [email, setEmail]             = useState('');
    const [password, setPassword]       = useState('');
    const [loading, setLoading]         = useState(false);
    const [confirmation, setConfirmation] = useState(null); // Firebase confirmation object

    const { signInWithEmail, sendOtp, verifyOtp, signInWithGoogle } = useAuth();

    // Intercept Android hardware back so it navigates between modes, not out of the app
    useFocusEffect(
        useCallback(() => {
            const onBack = () => {
                if (mode === 'otp')   { setMode('phone');   return true; }
                if (mode === 'phone') { setMode('options'); return true; }
                if (mode === 'email') { setMode('options'); return true; }
                return false;
            };
            const subscription = BackHandler.addEventListener('hardwareBackPress', onBack);
            return () => subscription.remove();
        }, [mode])
    );

    const handleSendOtp = async () => {
        if (!phone || phone.length < 10) {
            Alert.alert('Invalid Number', 'Please enter a valid 10-digit phone number.');
            return;
        }
        setLoading(true);
        try {
            const formatted = phone.startsWith('+') ? phone : `+91${phone}`;
            const conf = await sendOtp(formatted);
            setConfirmation(conf); // store Firebase confirmation for verify step
            setMode('otp');
            Alert.alert('OTP Sent!', 'Check your phone for the verification code.');
        } catch (e) {
            Alert.alert('Error', e.message);
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOtp = async () => {
        if (!otp || otp.length < 6) {
            Alert.alert('Invalid OTP', 'Please enter the 6-digit code.');
            return;
        }
        setLoading(true);
        try {
            await verifyOtp(confirmation, otp); // pass Firebase confirmation object
        } catch (e) {
            Alert.alert('Verification Failed', e.message);
        } finally {
            setLoading(false);
        }
    };

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

    if (mode === 'options') {
        return (
            <OptionsView
                onPhone={() => setMode('phone')}
                onGoogle={handleGoogle}
                onEmail={() => setMode('email')}
                loading={loading}
            />
        );
    }

    if (mode === 'phone') {
        return (
            <SubScreen
                onBack={() => setMode('options')}
                icon={<Phone size={48} color="#22973a" strokeWidth={1.5} style={{ marginBottom: 12 }} />}
                title="Your Phone Number"
                subtitle="We'll send a one-time verification code"
            >
                <View style={styles.card}>
                    <View style={styles.phoneRow}>
                        <View style={styles.countryBox}>
                            <Text style={styles.flag}>🇮🇳</Text>
                            <Text style={styles.countryCode}>+91</Text>
                        </View>
                        <TextInput
                            style={styles.phoneInput}
                            placeholder="9876543210"
                            placeholderTextColor="#9CA3AF"
                            value={phone}
                            onChangeText={setPhone}
                            keyboardType="phone-pad"
                            maxLength={10}
                            autoFocus
                        />
                    </View>
                    <TouchableOpacity
                        style={[styles.primaryBtn, loading && styles.btnDisabled]}
                        onPress={handleSendOtp}
                        disabled={loading}
                        activeOpacity={0.85}
                    >
                        {loading
                            ? <ActivityIndicator color="#fff" />
                            : <Text style={styles.primaryBtnText}>Send OTP</Text>
                        }
                    </TouchableOpacity>
                </View>
            </SubScreen>
        );
    }

    if (mode === 'otp') {
        return (
            <SubScreen
                onBack={() => setMode('phone')}
                icon={
                    <View style={styles.otpBadge}>
                        <Text style={styles.otpBadgeText}>🔐</Text>
                    </View>
                }
                title="Enter OTP"
                subtitle={`Sent to +91 ${phone}`}
            >
                <View style={styles.card}>
                    <TextInput
                        style={styles.otpInput}
                        placeholder="• • • • • •"
                        placeholderTextColor="#D1D5DB"
                        value={otp}
                        onChangeText={setOtp}
                        keyboardType="number-pad"
                        maxLength={6}
                        autoFocus
                        textAlign="center"
                    />
                    <TouchableOpacity
                        style={[styles.primaryBtn, loading && styles.btnDisabled]}
                        onPress={handleVerifyOtp}
                        disabled={loading}
                        activeOpacity={0.85}
                    >
                        {loading
                            ? <ActivityIndicator color="#fff" />
                            : <Text style={styles.primaryBtnText}>Verify & Sign In</Text>
                        }
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.resendBtn} onPress={handleSendOtp} disabled={loading}>
                        <Text style={styles.resendText}>Didn't receive it? <Text style={styles.resendLink}>Resend OTP</Text></Text>
                    </TouchableOpacity>
                </View>
            </SubScreen>
        );
    }

    if (mode === 'email') {
        return (
            <SubScreen
                onBack={() => setMode('options')}
                icon={<Mail size={48} color="#EA4335" strokeWidth={1.5} style={{ marginBottom: 12 }} />}
                title="Sign In with Email"
                subtitle="Use your registered email and password"
            >
                <View style={styles.card}>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Email</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="you@example.com"
                            placeholderTextColor="#9CA3AF"
                            value={email}
                            onChangeText={setEmail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            autoFocus
                        />
                    </View>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Password</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Enter your password"
                            placeholderTextColor="#9CA3AF"
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                        />
                    </View>
                    <TouchableOpacity
                        style={[styles.primaryBtn, loading && styles.btnDisabled]}
                        onPress={handleEmailLogin}
                        disabled={loading}
                        activeOpacity={0.85}
                    >
                        {loading
                            ? <ActivityIndicator color="#fff" />
                            : <Text style={styles.primaryBtnText}>Sign In</Text>
                        }
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.resendBtn} onPress={() => navigation.navigate('SignUp')}>
                        <Text style={styles.resendText}>
                            New here?{' '}
                            <Text style={styles.resendLink}>Create Account</Text>
                        </Text>
                    </TouchableOpacity>
                </View>
            </SubScreen>
        );
    }

    return null;
}

const styles = StyleSheet.create({
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

    // ── Buttons ───────────────────────────────────────────────────
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
    btnDisabled: { opacity: 0.65 },

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

    // ── Sub-screen ────────────────────────────────────────────────
    subScroll: {
        flexGrow: 1,
        paddingHorizontal: 24,
    },
    backBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingVertical: 10,
        alignSelf: 'flex-start',
    },
    backText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#22973a',
    },
    subHero: {
        alignItems: 'center',
        paddingTop: 28,
        paddingBottom: 28,
    },
    subTitle: {
        fontSize: 26,
        fontWeight: '900',
        color: '#0f172a',
    },
    subSubtitle: {
        fontSize: 14,
        color: '#64748b',
        marginTop: 6,
        textAlign: 'center',
        lineHeight: 20,
    },
    otpBadge: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: '#f0fdf4',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    otpBadgeText: { fontSize: 36 },

    // ── Card ──────────────────────────────────────────────────────
    card: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
        elevation: 4,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },

    // ── Phone input ───────────────────────────────────────────────
    phoneRow: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 20,
    },
    countryBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#F9FAFB',
        borderWidth: 1.5,
        borderColor: '#E5E7EB',
        borderRadius: 14,
        paddingHorizontal: 12,
        paddingVertical: 14,
    },
    flag: { fontSize: 18 },
    countryCode: { fontSize: 16, fontWeight: '700', color: '#374151' },
    phoneInput: {
        flex: 1,
        backgroundColor: '#F9FAFB',
        borderWidth: 1.5,
        borderColor: '#E5E7EB',
        borderRadius: 14,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 18,
        fontWeight: '600',
        color: '#111827',
        letterSpacing: 1,
    },

    // ── OTP input ─────────────────────────────────────────────────
    otpInput: {
        backgroundColor: '#F9FAFB',
        borderWidth: 2,
        borderColor: '#E5E7EB',
        borderRadius: 16,
        paddingHorizontal: 20,
        paddingVertical: 18,
        fontSize: 28,
        fontWeight: '800',
        color: '#111827',
        letterSpacing: 8,
        marginBottom: 20,
    },

    // ── Resend ────────────────────────────────────────────────────
    resendBtn: {
        alignItems: 'center',
        marginTop: 16,
        paddingVertical: 8,
    },
    resendText: { fontSize: 14, color: '#6B7280' },
    resendLink: { color: '#22973a', fontWeight: '700' },

    // ── Form inputs ───────────────────────────────────────────────
    inputGroup: { marginBottom: 16 },
    label: {
        fontSize: 13,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 6,
    },
    input: {
        backgroundColor: '#F9FAFB',
        borderWidth: 1.5,
        borderColor: '#E5E7EB',
        borderRadius: 14,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 15,
        color: '#111827',
    },
});
