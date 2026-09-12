import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { KeyRound } from 'lucide-react-native';
import { useAuth } from '../contexts/AuthContext';
import AuthSubScreen, { authSubStyles } from '../components/AuthSubScreen';
import { isValidPassword, PASSWORD_HINT } from '../utils/passwordValidation';

export default function ResetPasswordScreen() {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const { updatePassword, signOut } = useAuth();

    const handleSetPassword = async () => {
        if (!password || !confirmPassword) {
            Alert.alert('Missing Fields', 'Please fill in both password fields.');
            return;
        }
        if (!isValidPassword(password)) {
            Alert.alert('Error', `Password must be ${PASSWORD_HINT.toLowerCase()}`);
            return;
        }
        if (password !== confirmPassword) {
            Alert.alert('Error', 'Passwords do not match');
            return;
        }
        setLoading(true);
        try {
            await updatePassword(password);
        } catch (error) {
            Alert.alert('Reset Failed', error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthSubScreen
            onBack={signOut}
            icon={<KeyRound size={48} color="#22973a" strokeWidth={1.5} style={{ marginBottom: 12 }} />}
            title="Set New Password"
            subtitle="Choose a new password for your account"
        >
            <View style={authSubStyles.card}>
                <View style={authSubStyles.inputGroup}>
                    <Text style={authSubStyles.label}>New Password</Text>
                    <TextInput
                        style={authSubStyles.input}
                        placeholder={PASSWORD_HINT}
                        placeholderTextColor="#9CA3AF"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                        autoFocus
                    />
                </View>

                <View style={authSubStyles.inputGroup}>
                    <Text style={authSubStyles.label}>Confirm Password</Text>
                    <TextInput
                        style={authSubStyles.input}
                        placeholder="Re-enter password"
                        placeholderTextColor="#9CA3AF"
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        secureTextEntry
                    />
                </View>

                <TouchableOpacity
                    style={[authSubStyles.primaryBtn, loading && authSubStyles.btnDisabled]}
                    onPress={handleSetPassword}
                    disabled={loading}
                    activeOpacity={0.85}
                >
                    {loading
                        ? <ActivityIndicator color="#fff" />
                        : <Text style={authSubStyles.primaryBtnText}>Set New Password</Text>
                    }
                </TouchableOpacity>
            </View>
        </AuthSubScreen>
    );
}
