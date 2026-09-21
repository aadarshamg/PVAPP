import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MapPin, ArrowRight } from 'lucide-react-native';
import { useStore } from '../contexts/StoreContext';

const LOGO = require('../../assets/images/logo.png');

export default function StoreSelectScreen({ navigation }) {
    const { stores, selectedStore, setSelectedStore, loading, loadError, refetchStores } = useStore();
    const [elapsed, setElapsed] = useState(0);

    // A returning customer already has a remembered store — skip straight past this screen.
    useEffect(() => {
        if (!loading && selectedStore) {
            navigation.replace('ZoneCheck');
        }
    }, [loading, selectedStore, navigation]);

    // Visible seconds-elapsed counter on the spinner itself — diagnostic, so it's
    // obvious from the screen alone whether the fetch is still in flight, timed out,
    // or something is stuck before this screen's own logic even runs.
    useEffect(() => {
        if (!loading) { setElapsed(0); return; }
        const start = Date.now();
        const id = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 1000);
        return () => clearInterval(id);
    }, [loading]);

    const choose = async (store) => {
        // Clear any cached "inside the zone" result — it was computed against whichever
        // store was previously selected and would otherwise wrongly skip the check here.
        await AsyncStorage.removeItem('@zone_check_cache');
        await setSelectedStore(store);
        navigation.replace('ZoneCheck');
    };

    if (loading || selectedStore) {
        return (
            <View style={styles.centerScreen}>
                <ActivityIndicator size="large" color="#22973a" />
                {loading && <Text style={styles.elapsedText}>{elapsed}s</Text>}
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.safe}>
            <View style={styles.header}>
                <Image source={LOGO} style={styles.logo} />
                <Text style={styles.title}>Choose Your Store</Text>
                <Text style={styles.subtitle}>Select the location you'd like to order from</Text>
            </View>

            <View style={styles.list}>
                {stores.map(store => (
                    <TouchableOpacity
                        key={store.id}
                        style={styles.card}
                        onPress={() => choose(store)}
                        activeOpacity={0.88}
                    >
                        <View style={styles.cardIconWrap}>
                            <MapPin size={26} color="#22973a" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.cardName}>{store.name}</Text>
                            {store.address_text ? (
                                <Text style={styles.cardAddress} numberOfLines={2}>{store.address_text}</Text>
                            ) : null}
                        </View>
                        <ArrowRight size={20} color="#94a3b8" />
                    </TouchableOpacity>
                ))}
                {stores.length === 0 && (
                    <View style={{ alignItems: 'center' }}>
                        <Text style={styles.emptyText}>Couldn't load stores. Check your connection and try again.</Text>
                        {loadError ? <Text style={styles.errorDetail}>{loadError}</Text> : null}
                        <TouchableOpacity style={styles.retryBtn} onPress={refetchStores} activeOpacity={0.85}>
                            <Text style={styles.retryBtnText}>Retry</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: '#fff' },
    centerScreen: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },

    header: { alignItems: 'center', paddingTop: 40, paddingHorizontal: 32, paddingBottom: 24 },
    logo: { width: 72, height: 72, borderRadius: 18, marginBottom: 16 },
    title: { fontSize: 24, fontWeight: '900', color: '#0f172a', textAlign: 'center' },
    subtitle: { fontSize: 14, color: '#64748b', textAlign: 'center', marginTop: 6 },

    list: { paddingHorizontal: 24, gap: 14, marginTop: 12 },
    card: {
        flexDirection: 'row', alignItems: 'center', gap: 14,
        backgroundColor: '#f8fafc', borderRadius: 18, padding: 18,
        borderWidth: 1.5, borderColor: '#e2e8f0',
    },
    cardIconWrap: {
        width: 48, height: 48, borderRadius: 24, backgroundColor: '#f0fdf4',
        justifyContent: 'center', alignItems: 'center',
    },
    cardName: { fontSize: 17, fontWeight: '900', color: '#0f172a' },
    cardAddress: { fontSize: 13, color: '#64748b', marginTop: 3 },
    emptyText: { textAlign: 'center', color: '#94a3b8', fontSize: 14, marginTop: 40, paddingHorizontal: 12 },
    errorDetail: { textAlign: 'center', color: '#ef4444', fontSize: 12, marginTop: 10, paddingHorizontal: 20, fontFamily: 'monospace' },
    elapsedText: { color: '#94a3b8', fontSize: 12, marginTop: 12, fontVariant: ['tabular-nums'] },
    retryBtn: {
        marginTop: 16, backgroundColor: '#22973a', borderRadius: 12,
        paddingVertical: 12, paddingHorizontal: 32,
    },
    retryBtnText: { color: '#fff', fontSize: 14, fontWeight: '800' },
});
