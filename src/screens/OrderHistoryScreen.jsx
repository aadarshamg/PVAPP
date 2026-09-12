import React, { useEffect, useState, useRef } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    ScrollView, StatusBar, ActivityIndicator, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, PackageMinus, CheckCircle, ChefHat, Truck } from 'lucide-react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { useStore } from '../contexts/StoreContext';
import { formatOrderNumber } from '../utils/storeCode';

const TAB_FILTERS = [
    { key: 'all',       label: 'All Orders' },
    { key: 'delivered', label: 'Delivered' },
    { key: 'cancelled', label: 'Cancelled' },
];

const STATUS_LABELS = {
    placed:             'Order Placed',
    accepted:           'Accepted',
    preparing:          'Preparing',
    ready:              'Ready',
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

const STAGES_ACTIVE = [
    { key: 'placed',           label: 'Confirmed', Icon: CheckCircle },
    { key: 'preparing',        label: 'Preparing', Icon: ChefHat },
    { key: 'out-for-delivery', label: 'On the way', Icon: Truck },
];
const normalizeStatus = (s) => s === 'accepted' ? 'preparing' : s;

const formatDate = (iso) =>
    new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

export default function OrderHistoryScreen({ navigation }) {
    const { user } = useAuth();
    const { stores } = useStore();
    const [orders, setOrders]     = useState([]);
    const [loading, setLoading]   = useState(true);
    const [activeTab, setActiveTab] = useState('all');
    // Unique per-mount suffix so a fast remount never reuses a channel that's still tearing down
    const instanceId = useRef(Math.random().toString(36).slice(2)).current;

    useEffect(() => {
        if (!user) return;
        fetchOrders();

        const sub = supabase
            .channel(`customer-orders-v2-${instanceId}`)
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, (payload) => {
                const updated = payload.new;
                setOrders(prev => prev.map(o => o.id === updated.id ? { ...o, ...updated } : o));
                if (updated.status === 'cancelled') {
                    Alert.alert(
                        '❌ Order Rejected',
                        'Sorry, your order has been rejected by the restaurant. Please place a new order or contact support.',
                        [{ text: 'OK' }]
                    );
                }
            })
            .subscribe();

        return () => supabase.removeChannel(sub);
    }, [user]);

    const fetchOrders = async () => {
        setLoading(true);
        const { data } = await supabase
            .from('orders')
            .select('*, order_items(*)')
            .eq('customer_id', user.id)
            .order('created_at', { ascending: false });
        if (data) setOrders(data);
        setLoading(false);
    };

    const filteredOrders = orders.filter(o => {
        if (activeTab === 'all')       return true;
        if (activeTab === 'delivered') return o.status === 'delivered';
        if (activeTab === 'cancelled') return o.status === 'cancelled';
        return true;
    });

    const isActive = (o) => !['delivered', 'cancelled'].includes(o.status);

    const totalSpent = filteredOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);

    return (
        <SafeAreaView style={styles.safe} edges={['bottom', 'left', 'right']}>
            <StatusBar barStyle="light-content" />

            {/* Header with tabs inside */}
            <View style={styles.header}>
                <SafeAreaView edges={['top']}>
                    <View style={styles.headerRow}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                            <ArrowLeft color="#fff" size={22} />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>Order History</Text>
                        <View style={{ width: 40 }} />
                    </View>

                    <View style={styles.tabBar}>
                        {TAB_FILTERS.map(tab => (
                            <TouchableOpacity
                                key={tab.key}
                                style={[styles.tab, activeTab === tab.key && styles.tabActive]}
                                onPress={() => setActiveTab(tab.key)}
                                activeOpacity={0.8}
                            >
                                <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
                                    {tab.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </SafeAreaView>
            </View>

            {loading ? (
                <View style={styles.centerBox}>
                    <ActivityIndicator size="large" color="#22973a" />
                </View>
            ) : filteredOrders.length === 0 ? (
                <View style={styles.centerBox}>
                    <PackageMinus size={56} color="#cbd5e1" />
                    <Text style={styles.emptyTitle}>No Orders</Text>
                    <Text style={styles.emptySub}>Your orders will appear here.</Text>
                </View>
            ) : (
                <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                    {filteredOrders.map(order => (
                        isActive(order)
                            ? <ActiveOrderCard key={order.id} order={order} navigation={navigation} stores={stores} />
                            : <PastOrderCard   key={order.id} order={order} navigation={navigation} stores={stores} />
                    ))}

                    {/* Bottom Summary Card */}
                    <View style={styles.summaryCard}>
                        <View style={styles.summaryRow}>
                            <View>
                                <Text style={styles.summaryLabel}>Total Orders</Text>
                                <Text style={styles.summaryValue}>{filteredOrders.length}</Text>
                            </View>
                            <View style={{ alignItems: 'flex-end' }}>
                                <Text style={styles.summaryLabel}>Total Spent</Text>
                                <Text style={styles.summaryValue}>₹{totalSpent}</Text>
                            </View>
                        </View>
                    </View>
                </ScrollView>
            )}
        </SafeAreaView>
    );
}

function ActiveOrderCard({ order, navigation, stores }) {
    const norm = normalizeStatus(order.status);
    const currentIdx = STAGES_ACTIVE.findIndex(s => s.key === norm);
    const orderNumber = formatOrderNumber(stores.find(s => s.id === order.store_id)?.slug, order.display_id);

    return (
        <View style={styles.orderCard}>
            {/* Top row */}
            <View style={styles.cardTopRow}>
                <View style={styles.cardTopLeft}>
                    <Text style={styles.orderId}>{orderNumber}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: (STATUS_COLORS[order.status] || STATUS_COLORS.placed).bg }]}>
                        <CheckCircle size={11} color={(STATUS_COLORS[order.status] || STATUS_COLORS.placed).text} />
                        <Text style={[styles.statusText, { color: (STATUS_COLORS[order.status] || STATUS_COLORS.placed).text }]}>
                            {STATUS_LABELS[order.status] || order.status}
                        </Text>
                    </View>
                </View>
                <View style={styles.cardTopRight}>
                    <Text style={styles.orderPrice}>₹{order.total}</Text>
                    <Text style={styles.itemCount}>{order.order_items?.length || 0} items</Text>
                </View>
            </View>

            {/* Date */}
            <Text style={styles.orderDate}>{formatDate(order.created_at)}</Text>

            {/* Mini stepper */}
            <View style={styles.miniStepper}>
                {STAGES_ACTIVE.map((stage, idx) => {
                    const done = idx <= currentIdx;
                    const active = idx === currentIdx;
                    return (
                        <React.Fragment key={stage.key}>
                            {idx > 0 && <View style={[styles.miniLine, { backgroundColor: idx <= currentIdx ? '#22973a' : '#e2e8f0' }]} />}
                            <View style={[styles.miniDot, done && styles.miniDotDone, active && styles.miniDotActive]}>
                                <stage.Icon size={12} color={done ? '#fff' : '#cbd5e1'} />
                            </View>
                        </React.Fragment>
                    );
                })}
            </View>

            {/* Address */}
            <View style={styles.addrBox}>
                <Text style={styles.addrLabel}>Delivering to:</Text>
                <Text style={styles.addrText} numberOfLines={1}>{order.delivery_address || '—'}</Text>
            </View>

            {/* Buttons */}
            <View style={styles.btnRow}>
                <TouchableOpacity
                    style={styles.viewBtn}
                    activeOpacity={0.8}
                    onPress={() => navigation.navigate('OrderDetail', { order })}
                >
                    <Text style={styles.viewBtnText}>View Details</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

function PastOrderCard({ order, navigation, stores }) {
    const colors = STATUS_COLORS[order.status] || STATUS_COLORS.delivered;
    const delivered = order.status === 'delivered';
    const orderNumber = formatOrderNumber(stores.find(s => s.id === order.store_id)?.slug, order.display_id);
    const { addRawItems } = useCart();

    const handleReorder = () => {
        // Sides & Drinks (product_id null) aren't reorderable here — only pizza/menu items
        const items = (order.order_items || []).filter(i => i.product_id);
        if (items.length === 0) {
            Alert.alert('Unable to Reorder', 'No reorderable items were found in this order.');
            return;
        }
        addRawItems(items.map(item => ({
            product: { id: item.product_id, name: item.product_name },
            size: { label: item.size },
            crust: item.crust_name ? { name: item.crust_name } : null,
            toppings: item.toppings_text ? item.toppings_text.split(', ').map(name => ({ name })) : [],
            cheese: item.cheese_name ? { name: item.cheese_name } : null,
            dips: item.dips_text ? item.dips_text.split(', ').map(name => ({ name })) : [],
            instructions: item.instructions || '',
            qty: item.quantity,
            unitPrice: Number(item.price),
        })));
        navigation.navigate('Cart');
    };

    return (
        <View style={styles.orderCard}>
            {/* Top row */}
            <View style={styles.cardTopRow}>
                <View style={styles.cardTopLeft}>
                    <Text style={styles.orderId}>{orderNumber}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: colors.bg }]}>
                        {delivered && <CheckCircle size={11} color={colors.text} />}
                        <Text style={[styles.statusText, { color: colors.text }]}>
                            {STATUS_LABELS[order.status] || order.status}
                        </Text>
                    </View>
                </View>
                <View style={styles.cardTopRight}>
                    <Text style={styles.orderPrice}>₹{order.total}</Text>
                    <Text style={styles.itemCount}>{order.order_items?.length || 0} items</Text>
                </View>
            </View>

            {/* Date */}
            <Text style={styles.orderDate}>{formatDate(order.created_at)}</Text>

            {/* Address */}
            <View style={styles.addrBox}>
                <Text style={styles.addrLabel}>{order.status === 'cancelled' ? 'Order address:' : 'Delivered to:'}</Text>
                <Text style={styles.addrText} numberOfLines={2}>{order.delivery_address || '—'}</Text>
            </View>

            {/* Buttons */}
            <View style={styles.btnRow}>
                <TouchableOpacity
                    style={styles.viewBtn}
                    activeOpacity={0.8}
                    onPress={() => navigation.navigate('OrderDetail', { order })}
                >
                    <Text style={styles.viewBtnText}>View Details</Text>
                </TouchableOpacity>
                {delivered && (
                    <TouchableOpacity
                        style={styles.reorderBtn}
                        onPress={handleReorder}
                        activeOpacity={0.85}
                    >
                        <Text style={styles.reorderBtnText}>Reorder</Text>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: '#f8fafc' },
    centerBox: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
    emptyTitle: { fontSize: 18, fontWeight: '900', color: '#0f172a', marginTop: 14 },
    emptySub: { fontSize: 13, color: '#94a3b8', marginTop: 6, textAlign: 'center' },

    // Header (now contains tabs)
    header: {
        backgroundColor: '#22973a',
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: 16,
    },
    headerRow: {
        flexDirection: 'row', alignItems: 'center',
        justifyContent: 'space-between', marginBottom: 14,
    },
    backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
    headerTitle: { fontSize: 19, fontWeight: '900', color: '#fff' },

    // Tabs — inside green header
    tabBar: {
        flexDirection: 'row', gap: 8,
    },
    tab: {
        flex: 1, paddingVertical: 9, borderRadius: 12, alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.2)',
    },
    tabActive: { backgroundColor: '#fff' },
    tabText: { fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.9)' },
    tabTextActive: { color: '#22973a' },

    content: { padding: 16, paddingBottom: 40 },

    // Order Card
    orderCard: {
        backgroundColor: '#fff', borderRadius: 20, padding: 16, marginBottom: 14,
        shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 3,
    },
    cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
    cardTopLeft: { flex: 1, gap: 6 },
    cardTopRight: { alignItems: 'flex-end' },
    orderId: { fontSize: 16, fontWeight: '900', color: '#0f172a' },
    statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
    statusText: { fontSize: 12, fontWeight: '800' },
    orderPrice: { fontSize: 18, fontWeight: '900', color: '#0f172a' },
    itemCount: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
    orderDate: { fontSize: 12, color: '#94a3b8', marginBottom: 12 },

    // Mini stepper (active orders only)
    miniStepper: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    miniDot: {
        width: 28, height: 28, borderRadius: 14, backgroundColor: '#f1f5f9',
        justifyContent: 'center', alignItems: 'center',
        borderWidth: 2, borderColor: '#e2e8f0',
    },
    miniDotDone:   { backgroundColor: '#22973a', borderColor: '#22973a' },
    miniDotActive: { backgroundColor: '#22973a', borderColor: '#bbf7d0', transform: [{ scale: 1.15 }] },
    miniLine: { flex: 1, height: 2, marginHorizontal: 2 },

    // Address
    addrBox: { backgroundColor: '#f8fafc', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 14 },
    addrLabel: { fontSize: 11, color: '#94a3b8', fontWeight: '600', marginBottom: 3 },
    addrText: { fontSize: 13, fontWeight: '700', color: '#0f172a', lineHeight: 18 },

    // Bottom Summary Card
    summaryCard: {
        backgroundColor: '#22973a', borderRadius: 20, padding: 20, marginTop: 6,
        shadowColor: '#22973a', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 10, elevation: 4,
    },
    summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    summaryLabel: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginBottom: 4 },
    summaryValue: { fontSize: 26, fontWeight: '900', color: '#fff' },

    // Buttons
    btnRow: { flexDirection: 'row', gap: 10 },
    viewBtn: {
        flex: 1, borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 12,
        paddingVertical: 12, alignItems: 'center',
    },
    viewBtnText: { fontSize: 13, fontWeight: '800', color: '#475569' },
    reorderBtn: {
        flex: 1, backgroundColor: '#22973a', borderRadius: 12,
        paddingVertical: 12, alignItems: 'center',
    },
    reorderBtnText: { fontSize: 13, fontWeight: '900', color: '#fff' },
});
