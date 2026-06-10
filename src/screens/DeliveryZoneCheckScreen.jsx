import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
    TextInput, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { isPointInPolygon } from 'geolib';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MapPin, ArrowRight, User, Phone } from 'lucide-react-native';
import * as Location from 'expo-location';
import { supabase } from '../lib/supabase';

// Step states
const STEP_CHECKING = 'checking';
const STEP_OUTSIDE  = 'outside';
const STEP_RECEIVER = 'receiver';

export default function DeliveryZoneCheckScreen({ navigation }) {
    const [step, setStep] = useState(STEP_CHECKING);
    const [receiverName, setReceiverName] = useState('');
    const [receiverPhone, setReceiverPhone] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        checkZone();
    }, []);

    const proceedToApp = () => {
        navigation.replace('MainTabs');
    };

    const checkZone = async () => {
        try {
            // Request GPS permission
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                // GPS denied — allow app access without check
                proceedToApp();
                return;
            }

            // Get position
            const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
            const coord = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };

            // Fetch delivery zone from Supabase
            const { data } = await supabase
                .from('store_settings')
                .select('value')
                .eq('key', 'delivery_zone')
                .single();

            if (!data?.value) {
                // No zone configured — allow all
                proceedToApp();
                return;
            }

            const coords = JSON.parse(data.value);
            const zone = coords.map(([lat, lng]) => ({ latitude: lat, longitude: lng }));

            if (zone.length < 3 || isPointInPolygon(coord, zone)) {
                // Inside zone — proceed normally
                proceedToApp();
            } else {
                // Outside zone — show gate
                setStep(STEP_OUTSIDE);
            }
        } catch {
            // Any error (GPS timeout, offline, etc.) — allow access
            proceedToApp();
        }
    };

    const handleContinueWithReceiver = async () => {
        setSaving(true);
        try {
            await AsyncStorage.setItem('@pizza_delivery_receiver', JSON.stringify({
                name: receiverName.trim(),
                phone: receiverPhone.trim(),
            }));
            proceedToApp();
        } catch {
            proceedToApp();
        } finally {
            setSaving(false);
        }
    };

    const canContinue = receiverName.trim().length > 0 && receiverPhone.trim().length > 0;

    // ── Checking / Loading ─────────────────────────────────────────────────
    if (step === STEP_CHECKING) {
        return (
            <View style={styles.centerScreen}>
                <ActivityIndicator size="large" color="#22973a" />
                <Text style={styles.checkingText}>Checking delivery area...</Text>
            </View>
        );
    }

    // ── Outside Zone — Step 1 ──────────────────────────────────────────────
    if (step === STEP_OUTSIDE) {
        return (
            <SafeAreaView style={styles.safe}>
                <View style={styles.outsideContainer}>
                    <View style={styles.iconCircle}>
                        <MapPin size={40} color="#ef4444" />
                    </View>

                    <Text style={styles.outsideTitle}>We don't deliver to your area yet</Text>
                    <Text style={styles.outsideSub}>
                        Pizza Virus currently delivers in select areas of Phagwara. But you can still order for someone who is in our delivery zone!
                    </Text>

                    <TouchableOpacity
                        style={styles.orderForBtn}
                        onPress={() => setStep(STEP_RECEIVER)}
                        activeOpacity={0.85}
                    >
                        <Text style={styles.orderForBtnText}>Order for Someone Else</Text>
                        <ArrowRight size={20} color="#fff" />
                    </TouchableOpacity>

                    <TouchableOpacity onPress={proceedToApp} style={styles.laterBtn}>
                        <Text style={styles.laterBtnText}>Maybe Later</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    // ── Outside Zone — Step 2: Receiver Form ──────────────────────────────
    return (
        <SafeAreaView style={styles.safe}>
            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                <ScrollView contentContainerStyle={styles.receiverContainer} keyboardShouldPersistTaps="handled">

                    <Text style={styles.receiverTitle}>Who are you ordering for?</Text>
                    <Text style={styles.receiverSub}>
                        Enter the details of the person who will receive the order. Make sure their address is within our delivery area.
                    </Text>

                    <Text style={styles.label}>Receiver's Name</Text>
                    <View style={styles.inputRow}>
                        <User size={16} color="#94a3b8" style={{ marginRight: 10 }} />
                        <TextInput
                            style={styles.inputInner}
                            placeholder="Full name"
                            placeholderTextColor="#94a3b8"
                            value={receiverName}
                            onChangeText={setReceiverName}
                        />
                    </View>

                    <Text style={styles.label}>Receiver's Phone Number</Text>
                    <View style={styles.inputRow}>
                        <Phone size={16} color="#94a3b8" style={{ marginRight: 10 }} />
                        <TextInput
                            style={styles.inputInner}
                            placeholder="+91 XXXXX XXXXX"
                            placeholderTextColor="#94a3b8"
                            keyboardType="phone-pad"
                            value={receiverPhone}
                            onChangeText={setReceiverPhone}
                        />
                    </View>

                    <TouchableOpacity
                        style={[styles.continueBtn, !canContinue && styles.continueBtnDisabled]}
                        onPress={handleContinueWithReceiver}
                        disabled={!canContinue || saving}
                        activeOpacity={0.85}
                    >
                        {saving
                            ? <ActivityIndicator color="#fff" />
                            : <>
                                <Text style={styles.continueBtnText}>Continue</Text>
                                <ArrowRight size={20} color="#fff" />
                              </>
                        }
                    </TouchableOpacity>

                    <TouchableOpacity onPress={() => setStep(STEP_OUTSIDE)} style={styles.backLink}>
                        <Text style={styles.backLinkText}>← Go Back</Text>
                    </TouchableOpacity>

                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: '#fff' },

    centerScreen: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff', gap: 16 },
    checkingText: { fontSize: 16, color: '#64748b', fontWeight: '600' },

    outsideContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32, gap: 16 },
    iconCircle: {
        width: 96, height: 96, borderRadius: 48, backgroundColor: '#fef2f2',
        justifyContent: 'center', alignItems: 'center', marginBottom: 8,
    },
    outsideTitle: { fontSize: 24, fontWeight: '900', color: '#0f172a', textAlign: 'center', lineHeight: 32 },
    outsideSub: { fontSize: 15, color: '#64748b', textAlign: 'center', lineHeight: 22 },

    orderForBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
        backgroundColor: '#22973a', borderRadius: 16, paddingVertical: 18,
        width: '100%', marginTop: 8,
    },
    orderForBtnText: { color: '#fff', fontSize: 17, fontWeight: '900' },

    laterBtn: { paddingVertical: 12 },
    laterBtnText: { fontSize: 15, color: '#94a3b8', fontWeight: '600' },

    receiverContainer: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 28, paddingVertical: 32, gap: 12 },
    receiverTitle: { fontSize: 26, fontWeight: '900', color: '#0f172a', marginBottom: 4 },
    receiverSub: { fontSize: 14, color: '#64748b', lineHeight: 20, marginBottom: 8 },

    label: { fontSize: 14, fontWeight: '700', color: '#475569', marginBottom: 4 },
    inputRow: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc',
        borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, paddingHorizontal: 14,
    },
    inputInner: { flex: 1, paddingVertical: 14, fontSize: 15, color: '#0f172a' },

    continueBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
        backgroundColor: '#22973a', borderRadius: 14, paddingVertical: 18, marginTop: 8,
    },
    continueBtnDisabled: { backgroundColor: '#cbd5e1' },
    continueBtnText: { color: '#fff', fontSize: 17, fontWeight: '900' },

    backLink: { alignItems: 'center', paddingVertical: 10 },
    backLinkText: { fontSize: 14, color: '#64748b', fontWeight: '600' },
});
