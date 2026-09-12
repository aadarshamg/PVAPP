import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MapPin, ArrowRight } from 'lucide-react-native';
import { useStore } from '../contexts/StoreContext';

const LOGO = require('../../assets/images/logo.png');

export default function StoreSelectScreen({ navigation }) {
    const { stores, selectedStore, setSelectedStore, loading } = useStore();

    // A returning customer already has a remembered store — skip straight past this screen.
    useEffect(() => {
        if (!loading && selectedStore) {
            navigation.replace('ZoneCheck');
        }
    }, [loading, selectedStore, navigation]);

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
                    <Text style={styles.emptyText}>No stores available right now. Please try again later.</Text>
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
    emptyText: { textAlign: 'center', color: '#94a3b8', fontSize: 14, marginTop: 40 },
});
