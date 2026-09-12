import React from 'react';
import {
    View, Text, TouchableOpacity, StyleSheet,
    KeyboardAvoidingView, Platform, ScrollView, StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft } from 'lucide-react-native';

// Shared shell for auth sub-screens (email sign in, forgot password, reset password, sign up)
export default function AuthSubScreen({ onBack, icon, title, subtitle, children }) {
    const insets = useSafeAreaInsets();
    return (
        <KeyboardAvoidingView
            style={{ flex: 1, backgroundColor: '#fff' }}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <StatusBar barStyle="dark-content" />
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

// Shared styles for the form content screens build inside AuthSubScreen (card, inputs, buttons)
export const authSubStyles = StyleSheet.create({
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
    linkBtn: {
        alignItems: 'center',
        marginTop: 16,
        paddingVertical: 8,
    },
    linkText: { fontSize: 14, color: '#6B7280' },
    linkBold: { color: '#22973a', fontWeight: '700' },
});

// Internal styles for the shell itself (back button, hero)
const styles = StyleSheet.create({
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
});
