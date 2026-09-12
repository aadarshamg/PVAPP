import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { MailCheck } from 'lucide-react-native';
import { useAuth } from '../contexts/AuthContext';
import AuthSubScreen, { authSubStyles } from '../components/AuthSubScreen';

const RESEND_COOLDOWN = 30;

export default function VerifyOtpScreen({ route, navigation }) {
    const { email } = route.params;
    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [resending, setResending] = useState(false);
    const [cooldown, setCooldown] = useState(RESEND_COOLDOWN);
    const { verifySignUpOtp, resendSignUpOtp } = useAuth();

    useEffect(() => {
        if (cooldown <= 0) return;
        const timer = setTimeout(() => setCooldown(c => c - 1), 1000);
        return () => clearTimeout(timer);
    }, [cooldown]);

    const handleVerify = async () => {
        if (code.length !== 6) {
            Alert.alert('Invalid Code', 'Please enter the 6-digit code sent to your email.');
            return;
        }
        setLoading(true);
        try {
            await verifySignUpOtp(email, code);
            // Successful verification signs the user in — App.js will route them in automatically
        } catch (error) {
            Alert.alert('Verification Failed', error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleResend = async () => {
        setResending(true);
        try {
            await resendSignUpOtp(email);
            setCooldown(RESEND_COOLDOWN);
            Alert.alert('Code Sent', 'A new verification code has been sent to your email.');
        } catch (error) {
            Alert.alert('Resend Failed', error.message);
        } finally {
            setResending(false);
        }
    };

    return (
        <AuthSubScreen
            onBack={() => navigation.navigate('Login')}
            icon={<MailCheck size={48} color="#22973a" strokeWidth={1.5} style={{ marginBottom: 12 }} />}
            title="Verify Your Email"
            subtitle={`Enter the 6-digit code sent to ${email}`}
        >
            <View style={authSubStyles.card}>
                <View style={authSubStyles.inputGroup}>
                    <Text style={authSubStyles.label}>Verification Code</Text>
                    <TextInput
                        style={[authSubStyles.input, { letterSpacing: 8, textAlign: 'center', fontSize: 20 }]}
                        placeholder="000000"
                        placeholderTextColor="#9CA3AF"
                        value={code}
                        onChangeText={t => setCode(t.replace(/\D/g, '').slice(0, 6))}
                        keyboardType="number-pad"
                        maxLength={6}
                        autoFocus
                    />
                </View>

                <TouchableOpacity
                    style={[authSubStyles.primaryBtn, loading && authSubStyles.btnDisabled]}
                    onPress={handleVerify}
                    disabled={loading}
                    activeOpacity={0.85}
                >
                    {loading
                        ? <ActivityIndicator color="#fff" />
                        : <Text style={authSubStyles.primaryBtnText}>Verify</Text>
                    }
                </TouchableOpacity>

                <TouchableOpacity
                    style={authSubStyles.linkBtn}
                    onPress={handleResend}
                    disabled={resending || cooldown > 0}
                >
                    <Text style={authSubStyles.linkText}>
                        Didn't get a code?{' '}
                        <Text style={authSubStyles.linkBold}>
                            {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend Code'}
                        </Text>
                    </Text>
                </TouchableOpacity>
            </View>
        </AuthSubScreen>
    );
}
