import React from 'react';
import {
    View, Text, StyleSheet, ScrollView,
    TouchableOpacity, StatusBar
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, MapPin, CreditCard, CheckCircle, ChefHat, Truck, Package } from 'lucide-react-native';
import { useStore } from '../contexts/StoreContext';
import { formatOrderNumber } from '../utils/storeCode';

const STATUS_LABELS = {
    placed:             'Order Placed',
    accepted:           'Accepted',
    preparing:          'Preparing',
    ready:              'Ready for Pickup',
    'out-for-delivery': 'On the Way',
    delivered:          'Delivered',
    cancelled:          'Order Rejected',
};

const STATUS_COLORS = {
    placed:             { bg: '#eff6ff', text: '#1d4ed8' },
    accepted:           { bg: '#fff7ed', text: '#c2410c' },
    preparing:          { bg: '#fff7ed', text: '#c2410c' },
    ready:              { bg: '#f5f3ff', text: '#6d28d9' },
    'out-for-delivery': { bg: '#eef2ff', text: '#4338ca' },
    delivered:          { bg: '#f0fdf4', text: '#166534' },
    cancelled:          { bg: '#fef2f2', text: '#991b1b' },
};

const STAGES = [
    { key: 'placed',           label: 'Confirmed',  Icon: CheckCircle },
    { key: 'preparing',        label: 'Preparing',  Icon: ChefHat },
    { key: 'out-for-delivery', label: 'On the Way', Icon: Truck },
    { key: 'delivered',        label: 'Delivered',  Icon: Package },
];

const normalizeStatus = (s) => s === 'accepted' ? 'preparing' : s;

const formatDate = (iso) =>
    new Date(iso).toLocaleString('en-IN', {
        day: 'numeric', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });

const PAYMENT_LABELS = { cash: 'Cash on Delivery', phonepe: 'PhonePe (Online)', cod: 'Cash on Delivery' };

export default function OrderDetailScreen({ route, navigation }) {
    const { order } = route.params;
    const { stores } = useStore();
    const orderNumber = formatOrderNumber(stores.find(s => s.id === order.store_id)?.slug, order.display_id);
    const colors = STATUS_COLORS[order.status] || STATUS_COLORS.placed;
    const norm = normalizeStatus(order.status);
    const currentIdx = STAGES.findIndex(s => s.key === norm);
    const cancelled = order.status === 'cancelled';
    const delivered = order.status === 'delivered';

    const itemTotal = (order.order_items || []).reduce((s, i) => s + Number(i.price || 0), 0);
    const codFee = order.payment_method === 'cash' ? 20 : 0;

    return (
        <SafeAreaView style={styles.safe} edges={['bottom', 'left', 'right']}>
            <StatusBar barStyle="light-content" />

            {/* Header */}
            <View style={styles.header}>
                <SafeAreaView edges={['top']}>
                    <View style={styles.headerRow}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                            <ArrowLeft color="#fff" size={22} />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>Order #{orderNumber}</Text>
                        <View style={{ width: 40 }} />
                    </View>
                </SafeAreaView>
            </View>

            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

                {/* Status + date */}
                <View style={styles.card}>
                    <View style={styles.statusRow}>
                        <View style={[styles.statusBadge, { backgroundColor: colors.bg }]}>
                            <Text style={[styles.statusText, { color: colors.text }]}>
                                {STATUS_LABELS[order.status] || order.status}
                            </Text>
                        </View>
                        <Text style={styles.dateText}>{formatDate(order.created_at)}</Text>
                    </View>

                    {/* Stepper — hide for cancelled */}
                    {!cancelled && (
                        <View style={styles.stepper}>
                            {STAGES.map((stage, idx) => {
                                const done   = idx <= currentIdx;
                                const active = idx === currentIdx;
                                return (
                                    <React.Fragment key={stage.key}>
                                        {idx > 0 && (
                                            <View style={[styles.stepLine, { backgroundColor: idx <= currentIdx ? '#22973a' : '#e2e8f0' }]} />
                                        )}
                                        <View style={styles.stepItem}>
                                            <View style={[
                                                styles.stepDot,
                                                done   && styles.stepDotDone,
                                                active && styles.stepDotActive,
                                            ]}>
                                                <stage.Icon size={13} color={done ? '#fff' : '#cbd5e1'} />
                                            </View>
                                            <Text style={[styles.stepLabel, done && styles.stepLabelDone]}>{stage.label}</Text>
                                        </View>
                                    </React.Fragment>
                                );
                            })}
                        </View>
                    )}

                    {delivered && order.delivered_at && (
                        <Text style={styles.deliveredAt}>
                            Delivered at {new Date(order.delivered_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                    )}
                </View>

                {/* Items */}
                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Items Ordered</Text>
                    {(order.order_items || []).map((item, idx) => (
                        <View key={idx} style={[styles.itemRow, idx > 0 && styles.itemBorder]}>
                            <View style={styles.itemLeft}>
                                <Text style={styles.itemName}>{item.name || item.product_name || `Item ${idx + 1}`}</Text>
                                {item.size  && <Text style={styles.itemMeta}>Size: {item.size}</Text>}
                                {item.crust && <Text style={styles.itemMeta}>Crust: {item.crust}</Text>}
                                {item.toppings && item.toppings.length > 0 && (
                                    <Text style={styles.itemMeta}>Extras: {item.toppings.join(', ')}</Text>
                                )}
                            </View>
                            <View style={styles.itemRight}>
                                <Text style={styles.itemQty}>×{item.quantity || 1}</Text>
                                <Text style={styles.itemPrice}>₹{Number(item.price || 0).toLocaleString()}</Text>
                            </View>
                        </View>
                    ))}
                </View>

                {/* Price breakdown */}
                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Bill Details</Text>
                    <View style={styles.billRow}>
                        <Text style={styles.billLabel}>Item Total</Text>
                        <Text style={styles.billValue}>₹{itemTotal.toLocaleString()}</Text>
                    </View>
                    {codFee > 0 && (
                        <View style={styles.billRow}>
                            <Text style={styles.billLabel}>COD Fee</Text>
                            <Text style={styles.billValue}>₹{codFee}</Text>
                        </View>
                    )}
                    {order.discount > 0 && (
                        <View style={styles.billRow}>
                            <Text style={[styles.billLabel, { color: '#16a34a' }]}>Discount</Text>
                            <Text style={[styles.billValue, { color: '#16a34a' }]}>−₹{order.discount}</Text>
                        </View>
                    )}
                    <View style={[styles.billRow, styles.billTotalRow]}>
                        <Text style={styles.billTotalLabel}>Total Paid</Text>
                        <Text style={styles.billTotalValue}>₹{Number(order.total).toLocaleString()}</Text>
                    </View>
                </View>

                {/* Delivery Address */}
                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Delivery Address</Text>
                    <View style={styles.addrRow}>
                        <MapPin size={16} color="#22973a" />
                        <Text style={styles.addrText}>{order.delivery_address || '—'}</Text>
                    </View>
                </View>

                {/* Payment */}
                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Payment Method</Text>
                    <View style={styles.addrRow}>
                        <CreditCard size={16} color="#22973a" />
                        <Text style={styles.addrText}>
                            {PAYMENT_LABELS[order.payment_method] || order.payment_method || '—'}
                        </Text>
                    </View>
                    {order.payment_status === 'paid' && (
                        <View style={styles.paidBadge}>
                            <Text style={styles.paidBadgeText}>✓ Paid</Text>
                        </View>
                    )}
                </View>

            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: '#f8fafc' },
    header: {
        backgroundColor: '#22973a',
    },
    headerRow: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16, paddingVertical: 14,
    },
    backBtn: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center', alignItems: 'center',
    },
    headerTitle: { fontSize: 18, fontWeight: '900', color: '#fff' },
    scroll: { padding: 16, paddingBottom: 40 },

    card: {
        backgroundColor: '#fff', borderRadius: 20, padding: 16, marginBottom: 14,
        shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 3,
    },
    sectionTitle: { fontSize: 15, fontWeight: '900', color: '#0f172a', marginBottom: 14 },

    statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    statusBadge: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 },
    statusText: { fontSize: 13, fontWeight: '800' },
    dateText: { fontSize: 12, color: '#94a3b8', fontWeight: '600' },

    // Stepper
    stepper: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 4 },
    stepItem: { alignItems: 'center', width: 52 },
    stepDot: {
        width: 32, height: 32, borderRadius: 16,
        backgroundColor: '#f1f5f9', borderWidth: 2, borderColor: '#e2e8f0',
        justifyContent: 'center', alignItems: 'center', marginBottom: 6,
    },
    stepDotDone:   { backgroundColor: '#22973a', borderColor: '#22973a' },
    stepDotActive: { backgroundColor: '#22973a', borderColor: '#bbf7d0', transform: [{ scale: 1.1 }] },
    stepLine: { flex: 1, height: 2, marginTop: 15, marginHorizontal: 2 },
    stepLabel: { fontSize: 10, fontWeight: '700', color: '#cbd5e1', textAlign: 'center' },
    stepLabelDone: { color: '#22973a' },
    deliveredAt: { fontSize: 12, color: '#16a34a', fontWeight: '700', marginTop: 8, textAlign: 'center' },

    // Items
    itemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingVertical: 10 },
    itemBorder: { borderTopWidth: 1, borderTopColor: '#f1f5f9' },
    itemLeft: { flex: 1, paddingRight: 12 },
    itemName: { fontSize: 14, fontWeight: '800', color: '#0f172a', marginBottom: 2 },
    itemMeta: { fontSize: 12, color: '#94a3b8', marginTop: 1 },
    itemRight: { alignItems: 'flex-end' },
    itemQty: { fontSize: 12, color: '#94a3b8', fontWeight: '700' },
    itemPrice: { fontSize: 15, fontWeight: '900', color: '#0f172a', marginTop: 2 },

    // Bill
    billRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
    billLabel: { fontSize: 14, color: '#64748b', fontWeight: '600' },
    billValue: { fontSize: 14, color: '#0f172a', fontWeight: '700' },
    billTotalRow: {
        borderTopWidth: 1.5, borderTopColor: '#f1f5f9',
        marginTop: 6, paddingTop: 12, marginBottom: 0,
    },
    billTotalLabel: { fontSize: 15, fontWeight: '900', color: '#0f172a' },
    billTotalValue: { fontSize: 18, fontWeight: '900', color: '#22973a' },

    // Address / Payment
    addrRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
    addrText: { flex: 1, fontSize: 14, fontWeight: '700', color: '#0f172a', lineHeight: 20 },
    paidBadge: {
        marginTop: 10, alignSelf: 'flex-start',
        backgroundColor: '#f0fdf4', borderRadius: 20,
        paddingHorizontal: 12, paddingVertical: 5,
    },
    paidBadgeText: { fontSize: 12, fontWeight: '800', color: '#16a34a' },
});
