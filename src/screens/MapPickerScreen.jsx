import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    StatusBar, Alert, ActivityIndicator, ScrollView, TextInput
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MapPin, ArrowLeft, Check, Target, Navigation } from 'lucide-react-native';
import * as Location from 'expo-location';

export default function MapPickerScreen({ navigation, route }) {
    const [selectedLocation, setSelectedLocation] = useState(null);
    const [addressTitle, setAddressTitle] = useState(route.params?.title || '');
    const [loading, setLoading] = useState(false);
    const [saveLoading, setSaveLoading] = useState(false);

    const addressId = route.params?.addressId || null;
    const isRelocating = !!addressId;

    const getGPSLocation = async () => {
        setLoading(true);
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Denied', 'Location permission is required to pin your position.');
                return;
            }
            const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
            setSelectedLocation({
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
            });
        } catch {
            Alert.alert('Error', 'Could not get your location. Make sure GPS is enabled.');
        } finally {
            setLoading(false);
        }
    };

    const handleSaveLocation = async () => {
        if (!selectedLocation) {
            Alert.alert('No Location', 'Please use GPS to pin your current location first.');
            return;
        }
        if (!addressTitle.trim()) {
            Alert.alert('Missing Name', 'Please enter a name for this location.');
            return;
        }

        setSaveLoading(true);
        try {
            const stored = await AsyncStorage.getItem('@pizza_addresses');
            const addressList = stored ? JSON.parse(stored) : [];

            if (isRelocating) {
                const updatedList = addressList.map(a =>
                    a.id.toString() === addressId.toString()
                        ? {
                            ...a,
                            address: `${selectedLocation.latitude.toFixed(5)}, ${selectedLocation.longitude.toFixed(5)}`,
                            lat: selectedLocation.latitude.toString(),
                            lng: selectedLocation.longitude.toString(),
                        }
                        : a
                );
                await AsyncStorage.setItem('@pizza_addresses', JSON.stringify(updatedList));
                Alert.alert('Location Updated!', `${addressTitle} has been moved to your current GPS position.`, [{ text: 'OK', onPress: () => navigation.goBack() }]);
            } else {
                const newAddress = {
                    id: Date.now(),
                    title: addressTitle.trim(),
                    address: `${selectedLocation.latitude.toFixed(5)}, ${selectedLocation.longitude.toFixed(5)}`,
                    lat: selectedLocation.latitude.toString(),
                    lng: selectedLocation.longitude.toString(),
                    name: route.params?.name || 'Customer',
                    phone: route.params?.phone || '',
                };
                addressList.unshift(newAddress);
                await AsyncStorage.setItem('@pizza_addresses', JSON.stringify(addressList.slice(0, 5)));
                Alert.alert('Location Saved!', `${addressTitle} has been saved.`, [{ text: 'OK', onPress: () => navigation.goBack() }]);
            }
        } catch {
            Alert.alert('Error', 'Could not save location. Please try again.');
        } finally {
            setSaveLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
            <StatusBar barStyle="light-content" backgroundColor="#22973a" />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <ArrowLeft color="#fff" size={24} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{isRelocating ? 'Relocate Address' : 'Pin Location'}</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.gpsCard}>
                    <View style={styles.gpsCardTop}>
                        <Navigation size={28} color="#22973a" />
                        <Text style={styles.gpsCardTitle}>Use Your Current Location</Text>
                        <Text style={styles.gpsCardSub}>Tap below to pin your exact GPS position as the delivery address.</Text>
                    </View>

                    <TouchableOpacity style={styles.gpsBtn} onPress={getGPSLocation} disabled={loading} activeOpacity={0.85}>
                        {loading
                            ? <ActivityIndicator size="small" color="#fff" />
                            : <Target size={20} color="#fff" />
                        }
                        <Text style={styles.gpsBtnText}>{loading ? 'Getting Location...' : 'Pin My Current Location'}</Text>
                    </TouchableOpacity>
                </View>

                {selectedLocation && (
                    <View style={styles.coordCard}>
                        <View style={styles.coordRow}>
                            <MapPin size={18} color="#22973a" />
                            <Text style={styles.coordLabel}>Location Pinned</Text>
                        </View>
                        <Text style={styles.coordText}>
                            {selectedLocation.latitude.toFixed(5)}, {selectedLocation.longitude.toFixed(5)}
                        </Text>
                        <Text style={styles.coordHint}>Your GPS position has been captured successfully.</Text>
                    </View>
                )}

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Location Name</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="e.g. Home, Office, Friend's Place"
                        placeholderTextColor="#94a3b8"
                        value={addressTitle}
                        onChangeText={setAddressTitle}
                    />
                </View>

                <TouchableOpacity
                    style={[styles.saveBtn, (!selectedLocation || !addressTitle.trim()) && styles.saveBtnDisabled]}
                    onPress={handleSaveLocation}
                    disabled={!selectedLocation || !addressTitle.trim() || saveLoading}
                    activeOpacity={0.85}
                >
                    {saveLoading
                        ? <ActivityIndicator color="#fff" />
                        : <>
                            <Check color="#fff" size={20} />
                            <Text style={styles.saveBtnText}>{isRelocating ? 'UPDATE LOCATION' : 'SAVE & CONTINUE'}</Text>
                          </>
                    }
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    header: {
        backgroundColor: '#22973a', flexDirection: 'row', alignItems: 'center',
        justifyContent: 'space-between', paddingHorizontal: 20, height: 60,
    },
    backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20 },
    headerTitle: { fontSize: 20, fontWeight: '900', color: '#fff' },
    content: { padding: 20, gap: 16 },

    gpsCard: { backgroundColor: '#fff', borderRadius: 20, padding: 24, borderWidth: 2, borderColor: '#f0fdf4', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
    gpsCardTop: { alignItems: 'center', marginBottom: 20 },
    gpsCardTitle: { fontSize: 18, fontWeight: '900', color: '#0f172a', marginTop: 12, marginBottom: 6 },
    gpsCardSub: { fontSize: 14, color: '#64748b', textAlign: 'center', lineHeight: 20 },
    gpsBtn: { backgroundColor: '#22973a', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 16, borderRadius: 14 },
    gpsBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },

    coordCard: { backgroundColor: '#f0fdf4', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#bbf7d0' },
    coordRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
    coordLabel: { fontSize: 14, fontWeight: '800', color: '#16a34a' },
    coordText: { fontSize: 15, fontWeight: '700', color: '#0f172a', fontFamily: 'monospace', marginBottom: 4 },
    coordHint: { fontSize: 12, color: '#4ade80' },

    inputGroup: { gap: 8 },
    label: { fontSize: 14, fontWeight: '700', color: '#475569' },
    input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: '#0f172a' },

    saveBtn: { backgroundColor: '#22973a', borderRadius: 14, paddingVertical: 18, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 10, marginTop: 8 },
    saveBtnDisabled: { backgroundColor: '#cbd5e1' },
    saveBtnText: { color: '#fff', fontWeight: '900', fontSize: 15, letterSpacing: 0.5 },
});
