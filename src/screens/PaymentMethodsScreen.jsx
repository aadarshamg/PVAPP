import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, StatusBar, TextInput, Alert, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, CreditCard, Smartphone, Plus, CreditCardIcon, X } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function PaymentMethodsScreen({ navigation }) {
    const [payments, setPayments] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState({ name: '', number: '', type: 'Card' });

    useEffect(() => {
        loadPayments();
    }, []);

    const loadPayments = async () => {
        try {
            const data = await AsyncStorage.getItem('@pizza_payments');
            if (data) setPayments(JSON.parse(data));
        } catch (e) { console.error('Failed to load payments', e); }
    };

    const savePayment = async () => {
        if (!form.name || !form.number) {
            Alert.alert('Error', 'Please fill in all fields.');
            return;
        }
        try {
            const newPay = { id: Date.now().toString(), ...form };
            const updated = [newPay, ...payments];
            setPayments(updated);
            await AsyncStorage.setItem('@pizza_payments', JSON.stringify(updated));
            setShowModal(false);
            setForm({ name: '', number: '', type: 'Card' });
        } catch (e) {
            Alert.alert('Error', 'Failed to save payment method.');
        }
    };

    const deletePayment = async (id) => {
        const updated = payments.filter(p => p.id !== id);
        setPayments(updated);
        await AsyncStorage.setItem('@pizza_payments', JSON.stringify(updated));
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
                        <Text style={styles.headerTitle}>Payment Methods</Text>
                        <View style={{ width: 40 }} />
                    </View>
                </SafeAreaView>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                {payments.length === 0 ? (
                    <View style={styles.centerBox}>
                        <CreditCardIcon size={64} color="#cbd5e1" />
                        <Text style={styles.emptyTitle}>No Methods Saved</Text>
                        <Text style={styles.emptySub}>You haven't added any credit cards or UPI accounts.</Text>
                    </View>
                ) : (
                    payments.map(pay => (
                        <View key={pay.id} style={styles.cardItem}>
                            <View style={[styles.cardIconBox, pay.type === 'UPI' && { backgroundColor: '#fef08a' }]}>
                                {pay.type === 'Card' ? <CreditCard size={24} color="#3b82f6" /> : <Smartphone size={24} color="#ca8a04" />}
                            </View>
                            <View style={styles.cardInfo}>
                                <Text style={styles.cardName}>{pay.name}</Text>
                                <Text style={styles.cardNumber}>
                                    {pay.type === 'Card' ? `**** **** **** ${pay.number.slice(-4)}` : pay.number}
                                </Text>
                            </View>
                            <TouchableOpacity onPress={() => deletePayment(pay.id)} style={styles.deleteBtn}>
                                <X size={16} color="#ef4444" />
                            </TouchableOpacity>
                        </View>
                    ))
                )}

                <TouchableOpacity style={styles.addBtn} onPress={() => setShowModal(true)} activeOpacity={0.8}>
                    <Plus size={20} color="#22973a" />
                    <Text style={styles.addBtnText}>Add New Payment Method</Text>
                </TouchableOpacity>
            </ScrollView>

            <Modal visible={showModal} animationType="slide" transparent={true}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Add Payment Method</Text>
                            <TouchableOpacity onPress={() => setShowModal(false)}><X size={24} color="#94a3b8" /></TouchableOpacity>
                        </View>
                        
                        <Text style={styles.label}>Type</Text>
                        <View style={styles.typeRow}>
                            {['Card', 'UPI'].map(t => (
                                <TouchableOpacity key={t} onPress={() => setForm(p => ({ ...p, type: t }))}
                                    style={[styles.typeBtn, form.type === t && styles.typeBtnActive]}>
                                    <Text style={[styles.typeText, form.type === t && styles.typeTextActive]}>{t}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={styles.label}>{form.type === 'Card' ? 'Card Holder Name' : 'UPI App / Bank Name'}</Text>
                        <TextInput style={styles.input} placeholder={form.type === 'Card' ? 'John Doe' : 'Google Pay'} placeholderTextColor="#94a3b8"
                            value={form.name} onChangeText={t => setForm(p => ({ ...p, name: t }))} />

                        <Text style={styles.label}>{form.type === 'Card' ? 'Card Number' : 'UPI ID / Number'}</Text>
                        <TextInput style={styles.input} placeholder={form.type === 'Card' ? '1234 5678 9101 1121' : 'user@okicici'} placeholderTextColor="#94a3b8"
                            keyboardType={form.type === 'Card' ? 'numeric' : 'default'}
                            value={form.number} onChangeText={t => setForm(p => ({ ...p, number: t }))} />

                        <TouchableOpacity style={styles.saveBtn} onPress={savePayment} activeOpacity={0.8}>
                            <Text style={styles.saveBtnText}>SAVE EXTERNALLY</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: '#f8fafc' },
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
    cardInfo: { flex: 1 },
    cardName: { fontSize: 16, fontWeight: '800', color: '#0f172a', marginBottom: 4 },
    cardNumber: { fontSize: 13, color: '#64748b' },
    addBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
        backgroundColor: '#ffffff', borderRadius: 16, padding: 18, borderWidth: 2, borderColor: '#f0fdf4', borderStyle: 'dashed', marginTop: 10
    },
    addBtnText: { fontSize: 16, fontWeight: '800', color: '#22973a' }
});
