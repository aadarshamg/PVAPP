import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, StatusBar, TextInput, Alert, Modal, KeyboardAvoidingView, Platform, ActivityIndicator, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, MapPin, Plus, MapPinOff, Home, Briefcase, Globe, X } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ── Isolated modal component — its own state never re-renders the parent list ──
// Returns cleaned 10-digit number or null if invalid
const parseIndianPhone = (input) => {
    const digits = input.replace(/\D/g, '');
    if (digits.startsWith('91') && digits.length === 12) return digits.slice(2);
    if (digits.startsWith('0')  && digits.length === 11) return digits.slice(1);
    if (digits.length === 10)                             return digits;
    return null;
};

const AddressFormModal = React.memo(({ visible, onClose, onSave }) => {
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [address, setAddress] = useState('');
    const [phoneError, setPhoneError] = useState('');
    const [saving, setSaving] = useState(false);

    const reset = () => { setName(''); setPhone(''); setAddress(''); setPhoneError(''); };

    const handleClose = () => { reset(); onClose(); };

    const handlePhoneChange = (text) => {
        // Allow digits, +, spaces, hyphens — strip everything else
        setPhone(text.replace(/[^\d+\- ]/g, ''));
        if (phoneError) setPhoneError('');
    };

    const handleSave = async () => {
        if (!name.trim() || !address.trim()) {
            Alert.alert('Error', 'Please fill in all fields.');
            return;
        }
        const cleaned = parseIndianPhone(phone);
        if (!cleaned || !/^[6-9]\d{9}$/.test(cleaned)) {
            setPhoneError('Enter a valid 10-digit Indian mobile number (starts with 6-9).');
            return;
        }
        setSaving(true);
        try {
            const newAddr = {
                id: Date.now().toString(),
                title: name.trim(),
                name: name.trim(),
                phone: cleaned,   // always store clean 10-digit number
                address: address.trim(),
                type: 'Home',
                lat: null,
                lng: null,
            };
            await onSave(newAddr);
            reset();
        } catch {
            Alert.alert('Error', 'Failed to save address.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={handleClose}
            statusBarTranslucent={true}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.modalOverlay}
            >
                <TouchableWithoutFeedback onPress={handleClose}>
                    <View style={{ flex: 1 }} />
                </TouchableWithoutFeedback>

                <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHandle} />
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Add Address</Text>
                            <TouchableOpacity onPress={handleClose}><X size={24} color="#94a3b8" /></TouchableOpacity>
                        </View>

                        <ScrollView
                            keyboardShouldPersistTaps="handled"
                            showsVerticalScrollIndicator={false}
                            bounces={false}
                        >
                            <Text style={styles.label}>Name</Text>
                            <TextInput style={styles.input} placeholder="Receiver's full name" placeholderTextColor="#94a3b8"
                                value={name} onChangeText={setName} returnKeyType="next" />

                            <Text style={styles.label}>Phone Number</Text>
                            <TextInput
                                style={[styles.input, phoneError ? styles.inputError : null]}
                                placeholder="+91 XXXXX XXXXX"
                                placeholderTextColor="#94a3b8"
                                keyboardType="phone-pad"
                                value={phone}
                                onChangeText={handlePhoneChange}
                                returnKeyType="next"
                                maxLength={15}
                            />
                            {phoneError ? <Text style={styles.errorText}>{phoneError}</Text> : null}

                            <Text style={styles.label}>Address</Text>
                            <TextInput style={[styles.input, { height: 80, textAlignVertical: 'top', paddingTop: 12 }]}
                                placeholder="Street, Apt, Landmark, City..." placeholderTextColor="#94a3b8"
                                multiline value={address} onChangeText={setAddress} />

                            <TouchableOpacity style={styles.saveBtn} onPress={handleSave} activeOpacity={0.8} disabled={saving}>
                                {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>SAVE ADDRESS</Text>}
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </TouchableWithoutFeedback>
            </KeyboardAvoidingView>
        </Modal>
    );
});

// ── Main screen ───────────────────────────────────────────────────────────────
export default function SavedAddressesScreen({ navigation }) {
    const [addresses, setAddresses] = useState([]);
    const [showModal, setShowModal] = useState(false);

    useEffect(() => { loadAddresses(); }, []);

    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', loadAddresses);
        return unsubscribe;
    }, [navigation]);

    const loadAddresses = async () => {
        try {
            const data = await AsyncStorage.getItem('@pizza_addresses');
            if (data) setAddresses(JSON.parse(data));
        } catch (e) { console.error('Failed to load addresses', e); }
    };

    const handleClose = useCallback(() => setShowModal(false), []);

    const handleSave = useCallback(async (newAddr) => {
        // Read from AsyncStorage so this callback never needs `addresses` in its closure
        const stored = await AsyncStorage.getItem('@pizza_addresses');
        const current = stored ? JSON.parse(stored) : [];
        const updated = [newAddr, ...current];
        setAddresses(updated);
        await AsyncStorage.setItem('@pizza_addresses', JSON.stringify(updated));
        setShowModal(false);
    }, []);

    const deleteAddress = async (id) => {
        const updated = addresses.filter(a => a.id !== id);
        setAddresses(updated);
        await AsyncStorage.setItem('@pizza_addresses', JSON.stringify(updated));
    };

    const selectAddress = async (id) => {
        const selected = addresses.find(a => a.id === id);
        if (selected) {
            const others = addresses.filter(a => a.id !== id);
            const updated = [selected, ...others];
            setAddresses(updated);
            await AsyncStorage.setItem('@pizza_addresses', JSON.stringify(updated));
            navigation.goBack();
        }
    };

    const getIcon = (type) => {
        if (type === 'Home') return <Home size={20} color="#22973a" />;
        if (type === 'Work') return <Briefcase size={20} color="#3b82f6" />;
        return <Globe size={20} color="#f97316" />;
    };

    return (
        <SafeAreaView style={styles.safe} edges={['bottom', 'left', 'right']}>
            <StatusBar barStyle="light-content" />
            <View style={styles.header}>
                <SafeAreaView edges={['top']}>
                    <View style={styles.headerRow}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                            <ArrowLeft color="#fff" size={24} />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>Saved Addresses</Text>
                        <View style={{ width: 40 }} />
                    </View>
                </SafeAreaView>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <Text style={styles.sectionHeader}>Select Delivery Location</Text>

                {addresses.length === 0 ? (
                    <View style={styles.centerBox}>
                        <MapPinOff size={64} color="#cbd5e1" />
                        <Text style={styles.emptyTitle}>No Addresses Saved</Text>
                        <Text style={styles.emptySub}>You haven't added any delivery locations yet.</Text>
                    </View>
                ) : (
                    addresses.map((addr, idx) => (
                        <TouchableOpacity key={addr.id} style={[styles.card, idx === 0 && styles.cardActive]} onPress={() => selectAddress(addr.id)} activeOpacity={0.7}>
                            <View style={[styles.iconBox, idx === 0 && styles.iconBoxActive]}>
                                {getIcon(addr.type)}
                            </View>
                            <View style={styles.info}>
                                <View style={styles.titleRow}>
                                    <Text style={styles.title}>{addr.title}</Text>
                                    {idx === 0 && (
                                        <View style={[styles.badge, { backgroundColor: '#dcfce7' }]}>
                                            <Text style={[styles.badgeText, { color: '#16a34a' }]}>ACTIVE</Text>
                                        </View>
                                    )}
                                </View>
                                <Text style={styles.addressText} numberOfLines={3}>{addr.address}</Text>
                            </View>
                            <TouchableOpacity onPress={() => deleteAddress(addr.id)} style={styles.deleteBtn}>
                                <X size={16} color="#ef4444" />
                            </TouchableOpacity>
                        </TouchableOpacity>
                    ))
                )}

                <TouchableOpacity style={styles.addBtn} onPress={() => setShowModal(true)} activeOpacity={0.8}>
                    <Plus size={20} color="#22973a" />
                    <Text style={styles.addBtnText}>Add New Address</Text>
                </TouchableOpacity>
            </ScrollView>

            <AddressFormModal
                visible={showModal}
                onClose={handleClose}
                onSave={handleSave}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: '#f8fafc' },
    sectionHeader: { fontSize: 13, fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', marginBottom: 12, marginLeft: 4, letterSpacing: 1 },
    centerBox: { justifyContent: 'center', alignItems: 'center', paddingVertical: 60 },
    emptyTitle: { fontSize: 20, fontWeight: '900', color: '#0f172a', marginTop: 16 },
    emptySub: { fontSize: 14, color: '#64748b', textAlign: 'center', marginTop: 8 },
    header: {
        backgroundColor: '#22973a',
    },
    headerRow: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 20, height: 60,
    },
    backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20 },
    headerTitle: { fontSize: 20, fontWeight: '900', color: '#ffffff' },
    content: { padding: 20 },
    addBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
        backgroundColor: '#ffffff', borderRadius: 16, padding: 18, borderWidth: 2, borderColor: '#f0fdf4', borderStyle: 'dashed', marginTop: 10,
    },
    addBtnText: { fontSize: 16, fontWeight: '800', color: '#22973a' },
    card: {
        flexDirection: 'row', backgroundColor: '#ffffff', borderRadius: 16, padding: 16, marginBottom: 16,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2, position: 'relative',
        borderWidth: 2, borderColor: 'transparent',
    },
    cardActive: { borderColor: '#22973a', backgroundColor: '#f0fdf4' },
    iconBox: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#f8fafc', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
    iconBoxActive: { backgroundColor: '#dcfce7' },
    info: { flex: 1, paddingRight: 20 },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
    title: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
    badge: { backgroundColor: '#e2e8f0', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
    badgeText: { fontSize: 10, fontWeight: '700', color: '#475569', textTransform: 'uppercase' },
    addressText: { fontSize: 13, color: '#64748b', lineHeight: 20 },
    deleteBtn: { position: 'absolute', right: 16, top: 16, padding: 4, backgroundColor: '#fee2e2', borderRadius: 10 },
    // Modal styles
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 48 },
    modalHandle: { width: 40, height: 4, backgroundColor: '#e2e8f0', borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 20, fontWeight: '900', color: '#0f172a' },
    label: { fontSize: 14, fontWeight: '700', color: '#475569', marginBottom: 8, marginTop: 8 },
    input: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, paddingHorizontal: 16, fontSize: 15, height: 50, color: '#0f172a' },
    inputError: { borderColor: '#ef4444', backgroundColor: '#fff5f5' },
    errorText: { fontSize: 12, color: '#ef4444', fontWeight: '600', marginTop: 6, marginLeft: 4 },
    saveBtn: { backgroundColor: '#22973a', paddingVertical: 16, borderRadius: 14, alignItems: 'center', marginTop: 24 },
    saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '900', letterSpacing: 1 },
});
