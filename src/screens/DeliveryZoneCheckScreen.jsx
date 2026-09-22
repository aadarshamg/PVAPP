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
import { useStore } from '../contexts/StoreContext';
import { withTimeout } from '../utils/withTimeout';

const STORAGE_TIMEOUT_MS = 5000;         // plain device storage — should be near-instant
const PERMISSION_TIMEOUT_MS = 60000;     // a native OS dialog needs human reaction time (1 min)
const FETCH_TIMEOUT_MS = 10000;          // plain network round-trip

// Step states
const STEP_CHECKING = 'checking';
const STEP_OUTSIDE  = 'outside';
const STEP_RECEIVER = 'receiver';

export default function DeliveryZoneCheckScreen({ navigation }) {
    const { selectedStore } = useStore();
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
        setStep(STEP_CHECKING);
        try {
            // Only cache "inside" results (3-min TTL) — never cache "outside"
            // because admin may update the zone at any time
            const cached = await withTimeout(
                AsyncStorage.getItem('@zone_check_cache'),
                STORAGE_TIMEOUT_MS,
                'zone_cache_get_timeout'
            );
            if (cached) {
                const { result, ts } = JSON.parse(cached);
                if (result === 'inside' && Date.now() - ts < 3 * 60 * 1000) {
                    proceedToApp();
                    return;
                }
            }
            // Clear any stale cache before fresh check
            await withTimeout(
                AsyncStorage.removeItem('@zone_check_cache'),
                STORAGE_TIMEOUT_MS,
                'zone_cache_remove_timeout'
            );

            // Request GPS permission — a native OS dialog that only ever appears the
            // very first time (later launches resolve instantly with no dialog at all,
            // which is why a hang here specifically only shows up on a first attempt).
            const { status } = await withTimeout(
                Location.requestForegroundPermissionsAsync(),
                PERMISSION_TIMEOUT_MS,
                'location_permission_timeout'
            );
            if (status !== 'granted') { proceedToApp(); return; }

            // Fetch this store's delivery zone (each store draws its own polygon)
            if (!selectedStore?.id) { proceedToApp(); return; }
            const { data } = await withTimeout(
                supabase.from('stores').select('delivery_zone').eq('id', selectedStore.id).single(),
                FETCH_TIMEOUT_MS,
                'delivery_zone_fetch_timeout'
            );

            if (!data?.delivery_zone) { proceedToApp(); return; }

            const zone = data.delivery_zone.map(([lat, lng]) => ({ latitude: lat, longitude: lng }));
            if (zone.length < 3) { proceedToApp(); return; }

            // Always get a fresh GPS position — never use last-known (can be hours old)
            const pos = await withTimeout(
                Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
                12000,
                'gps_timeout'
            );
            const coord = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
            const inside = isPointInPolygon(coord, zone);

            if (inside) {
                // Cache "inside" for 3 minutes to avoid GPS on every open
                await withTimeout(
                    AsyncStorage.setItem('@zone_check_cache', JSON.stringify({
                        result: 'inside',
                        ts: Date.now(),
                    })),
                    STORAGE_TIMEOUT_MS,
                    'zone_cache_set_timeout'
                );
                proceedToApp();
            } else {
                setStep(STEP_OUTSIDE);
            }
        } catch {
            // GPS timeout, permission denied, offline — allow access
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

                    <TouchableOpacity onPress={checkZone} style={styles.retryBtn}>
                        <Text style={styles.retryBtnText}>↺ Try Again</Text>
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

    retryBtn: { paddingVertical: 12, paddingHorizontal: 24, borderWidth: 1.5, borderColor: '#22973a', borderRadius: 12 },
    retryBtnText: { fontSize: 15, color: '#22973a', fontWeight: '700' },

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
