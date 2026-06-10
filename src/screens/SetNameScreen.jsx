import React, { useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, StyleSheet,
    ActivityIndicator, Alert, Image, StatusBar, KeyboardAvoidingView, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';

const LOGO = require('../../assets/images/logo.png');

export default function SetNameScreen() {
    const [name, setName] = useState('');
    const [loading, setLoading] = useState(false);

    const handleContinue = async () => {
        const trimmed = name.trim();
        if (trimmed.length < 2) {
            Alert.alert('Name Required', 'Please enter your name (at least 2 characters).');
            return;
        }
        setLoading(true);
        try {
            const { error } = await supabase.auth.updateUser({ data: { name: trimmed } });
            if (error) throw error;
            // onAuthStateChange fires → App.js re-evaluates → navigates to AppNavigator
        } catch (e) {
            Alert.alert('Error', e.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.safe}>
            <StatusBar barStyle="dark-content" backgroundColor="#fff" />
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <View style={styles.container}>
                    <Image source={LOGO} style={styles.logo} resizeMode="contain" />

                    <Text style={styles.title}>What's your name?</Text>
                    <Text style={styles.sub}>We'll use this to personalise your orders</Text>

                    <TextInput
                        style={styles.input}
                        placeholder="Enter your full name"
                        placeholderTextColor="#94a3b8"
                        value={name}
                        onChangeText={setName}
                        autoFocus
                        returnKeyType="done"
                        onSubmitEditing={handleContinue}
                        autoCapitalize="words"
                    />

                    <TouchableOpacity
                        style={[styles.btn, (loading || name.trim().length < 2) && styles.btnDisabled]}
                        onPress={handleContinue}
                        disabled={loading || name.trim().length < 2}
                        activeOpacity={0.85}
                    >
                        {loading
                            ? <ActivityIndicator color="#fff" />
                            : <Text style={styles.btnText}>Continue</Text>
                        }
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: '#fff' },
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 32,
        paddingBottom: 40,
    },
    logo: { width: 100, height: 100, marginBottom: 32 },
    title: { fontSize: 26, fontWeight: '900', color: '#0f172a', textAlign: 'center', marginBottom: 8 },
    sub: { fontSize: 14, color: '#64748b', textAlign: 'center', marginBottom: 32, lineHeight: 20 },
    input: {
        width: '100%',
        backgroundColor: '#f8fafc',
        borderWidth: 1.5,
        borderColor: '#e2e8f0',
        borderRadius: 16,
        paddingHorizontal: 20,
        paddingVertical: 16,
        fontSize: 17,
        color: '#0f172a',
        marginBottom: 20,
        fontWeight: '600',
    },
    btn: {
        width: '100%',
        backgroundColor: '#22973a',
        borderRadius: 16,
        paddingVertical: 18,
        alignItems: 'center',
        shadowColor: '#22973a',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 4,
    },
    btnDisabled: { backgroundColor: '#cbd5e1', shadowOpacity: 0 },
    btnText: { color: '#fff', fontSize: 17, fontWeight: '900', letterSpacing: 0.5 },
});
