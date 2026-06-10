import React, { useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, StyleSheet,
    KeyboardAvoidingView, Platform, ActivityIndicator, Alert, ScrollView, SafeAreaView
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';

export default function SignUpScreen({ navigation }) {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const { signUp } = useAuth();

    const handleSignUp = async () => {
        if (!name || !email || !password) {
            Alert.alert('Error', 'Please fill in all fields');
            return;
        }
        if (password.length < 6) {
            Alert.alert('Error', 'Password must be at least 6 characters');
            return;
        }
        setLoading(true);
        try {
            await signUp(email, password, name);
            Alert.alert('Success', 'Account created! You can now sign in.', [
                { text: 'OK', onPress: () => navigation.navigate('Login') }
            ]);
        } catch (error) {
            Alert.alert('Sign Up Failed', error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.safe}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
                    <View style={styles.header}>
                        <Text style={styles.emoji}>🍕</Text>
                        <Text style={styles.title}>Create Account</Text>
                        <Text style={styles.subtitle}>Join Pizza Virus for delicious deals</Text>
                    </View>

                    <View style={styles.card}>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Full Name</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Your full name"
                                placeholderTextColor="#9CA3AF"
                                value={name}
                                onChangeText={setName}
                            />
                        </View>

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
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Password</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Min. 6 characters"
                                placeholderTextColor="#9CA3AF"
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry
                            />
                        </View>

                        <TouchableOpacity
                            style={[styles.button, loading && styles.buttonDisabled]}
                            onPress={handleSignUp}
                            disabled={loading}
                            activeOpacity={0.8}
                        >
                            {loading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.buttonText}>Create Account</Text>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.linkButton}
                            onPress={() => navigation.navigate('Login')}
                        >
                            <Text style={styles.linkText}>
                                Already have an account? <Text style={styles.linkBold}>Sign In</Text>
                            </Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: '#f3feb0' },
    scrollContent: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 40 },
    header: { alignItems: 'center', paddingTop: 50, paddingBottom: 28 },
    emoji: { fontSize: 56, marginBottom: 12 },
    title: { fontSize: 28, fontWeight: '800', color: '#22973a', letterSpacing: -0.5 },
    subtitle: { fontSize: 15, color: '#22973a', marginTop: 4, opacity: 0.6 },
    card: {
        backgroundColor: '#fff', borderRadius: 24, padding: 24,
        shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 16, elevation: 6,
        borderWidth: 1, borderColor: '#F3F4F6',
    },
    inputGroup: { marginBottom: 16 },
    label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 6 },
    input: {
        backgroundColor: '#F9FAFB', borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 14,
        paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, color: '#111827',
    },
    button: {
        backgroundColor: '#48d23c', paddingVertical: 16, borderRadius: 16, alignItems: 'center', marginTop: 8,
        shadowColor: '#48d23c', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 10, elevation: 4,
    },
    buttonDisabled: { opacity: 0.7 },
    buttonText: { color: '#fff', fontSize: 17, fontWeight: '700' },
    linkButton: { alignItems: 'center', marginTop: 20, paddingVertical: 8 },
    linkText: { fontSize: 14, color: '#6B7280' },
    linkBold: { color: '#48d23c', fontWeight: '700' },
});
