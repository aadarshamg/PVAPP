import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    Image, FlatList, ActivityIndicator, SafeAreaView,
    StatusBar, Dimensions, Platform, Animated, Modal
} from 'react-native';

const LOGO = require('../../assets/images/logo.png');
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import {
    ShoppingCart, MapPin, Package, AlertCircle,
    Pizza, Leaf, Drumstick, Crown, CupSoda, Star, ChevronRight
} from 'lucide-react-native';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';

const { width } = Dimensions.get('window');
const FEAT_W = width * 0.72;

const MINI_STAGES = ['placed', 'preparing', 'ready', 'out-for-delivery', 'delivered'];
const normalizeStage = (s) => s === 'accepted' ? 'preparing' : s;
const getMiniStageIdx = (status) => MINI_STAGES.indexOf(normalizeStage(status));

const ORDER_STATUS_META = {
    placed:             { label: 'Order Placed',   emoji: '📋', color: '#3b82f6' },
    accepted:           { label: 'Accepted',        emoji: '✅', color: '#f97316' },
    preparing:          { label: 'Preparing',       emoji: '🔥', color: '#f97316' },
    ready:              { label: 'Ready to Ship',   emoji: '📦', color: '#8b5cf6' },
    'out-for-delivery': { label: 'On the Way',      emoji: '🛵', color: '#6366f1' },
};

// Map category name → colored circle style + Lucide icon
const getCatStyle = (name) => {
    const n = (name || '').toLowerCase();
    if (n.includes('classic'))                        return { bg: '#f97316', Icon: Pizza };
    if (n.includes('premium'))                        return { bg: '#f59e0b', Icon: Crown };
    if (n.includes('veg') && !n.includes('non'))      return { bg: '#22973a', Icon: Leaf };
    if (n.includes('non') || n.includes('chicken') || n.includes('meat')) return { bg: '#e11d48', Icon: Drumstick };
    if (n.includes('drink') || n.includes('beverage'))return { bg: '#0ea5e9', Icon: CupSoda };
    if (n.includes('side'))                           return { bg: '#f97316', Icon: Package };
    if (n.includes('special') || n.includes('star'))  return { bg: '#7c3aed', Icon: Star };
    // Cycle through a palette for unlisted
    const PALETTE = [
        { bg: '#f97316', Icon: Pizza },
        { bg: '#f59e0b', Icon: Crown },
        { bg: '#22973a', Icon: Leaf },
        { bg: '#e11d48', Icon: Drumstick },
        { bg: '#0ea5e9', Icon: CupSoda },
        { bg: '#7c3aed', Icon: Star },
    ];
    return PALETTE[Math.abs(name?.charCodeAt(0) || 0) % PALETTE.length];
};

function AppLoadingScreen() {
    const pulse   = useRef(new Animated.Value(1)).current;
    const dot1    = useRef(new Animated.Value(0)).current;
    const dot2    = useRef(new Animated.Value(0)).current;
    const dot3    = useRef(new Animated.Value(0)).current;
    const fadeIn  = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        // Fade in
        Animated.timing(fadeIn, { toValue: 1, duration: 600, useNativeDriver: true }).start();

        // Logo pulse
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulse, { toValue: 1.08, duration: 800, useNativeDriver: true }),
                Animated.timing(pulse, { toValue: 1,    duration: 800, useNativeDriver: true }),
            ])
        ).start();

        // Bouncing dots (staggered)
        const makeBounce = (anim, delay) =>
            Animated.loop(
                Animated.sequence([
                    Animated.delay(delay),
                    Animated.timing(anim, { toValue: -14, duration: 350, useNativeDriver: true }),
                    Animated.timing(anim, { toValue: 0,   duration: 350, useNativeDriver: true }),
                    Animated.delay(600),
                ])
            );
        makeBounce(dot1, 0).start();
        makeBounce(dot2, 180).start();
        makeBounce(dot3, 360).start();
    }, []);

    return (
        <View style={loadStyles.screen}>
            <StatusBar barStyle="light-content" backgroundColor="#22973a" />

            {/* Decorative circles */}
            <View style={[loadStyles.circle, { width: 300, height: 300, top: -80, right: -80, opacity: 0.12 }]} />
            <View style={[loadStyles.circle, { width: 200, height: 200, bottom: 60, left: -60, opacity: 0.1 }]} />

            <Animated.View style={{ alignItems: 'center', opacity: fadeIn }}>
                {/* Logo */}
                <Animated.View style={[loadStyles.logoWrap, { transform: [{ scale: pulse }] }]}>
                    <Image source={LOGO} style={loadStyles.logoImage} />
                </Animated.View>

                {/* Brand */}
                <Text style={loadStyles.brand}>PIZZA VIRUS</Text>
                <Text style={loadStyles.tagline}>Hunger is a Deadly Virus</Text>

                {/* Bouncing dots */}
                <View style={loadStyles.dotsRow}>
                    {[dot1, dot2, dot3].map((anim, i) => (
                        <Animated.View
                            key={i}
                            style={[loadStyles.dot, { transform: [{ translateY: anim }] }]}
                        />
                    ))}
                </View>
            </Animated.View>
        </View>
    );
}

const loadStyles = StyleSheet.create({
    screen: {
        flex: 1, backgroundColor: '#22973a',
        justifyContent: 'center', alignItems: 'center',
        overflow: 'hidden',
    },
    circle: {
        position: 'absolute', borderRadius: 999,
        backgroundColor: '#fff',
    },
    logoWrap: {
        width: 120, height: 120, borderRadius: 32,
        overflow: 'hidden',
        shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 20, elevation: 12,
        marginBottom: 28,
    },
    logoImage: { width: '100%', height: '100%', resizeMode: 'cover' },
    brand: {
        fontSize: 32, fontWeight: '900', color: '#fff',
        letterSpacing: 2, marginBottom: 6,
    },
    tagline: {
        fontSize: 14, color: 'rgba(255,255,255,0.75)',
        fontWeight: '500', letterSpacing: 0.5, marginBottom: 48,
    },
    dotsRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-end', height: 24 },
    dot: {
        width: 12, height: 12, borderRadius: 6, backgroundColor: '#fff', opacity: 0.85,
    },
});

export default function HomeScreen({ navigation }) {
    const { cartCount } = useCart();
    const { user } = useAuth();
    const [categories, setCategories] = useState([]);
    const [featured, setFeatured]     = useState([]);
    const [popular, setPopular]       = useState([]);
    const [loading, setLoading]       = useState(true);
    const [currentLocation, setCurrentLocation] = useState('Law Gate, LPU');
    const [kitchenOpen, setKitchenOpen] = useState(true);
    const [activeOrder, setActiveOrder] = useState(null);

    useEffect(() => {
        fetchKitchenStatus();
        fetchData();
        const kitchenSub = supabase
            .channel('kitchen-status-customer')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'store_settings' }, payload => {
                if (payload.new?.key === 'kitchen_status') setKitchenOpen(payload.new?.value === 'open');
            })
            .subscribe();
        return () => supabase.removeChannel(kitchenSub);
    }, []);

    const fetchActiveOrder = useCallback(async () => {
        if (!user) return;
        const { data } = await supabase.from('orders').select('*')
            .eq('customer_id', user.id)
            .not('status', 'in', '("delivered","cancelled")')
            .or('payment_method.eq.cash,payment_status.eq.paid')
            .order('created_at', { ascending: false }).limit(1);
        setActiveOrder(data && data.length > 0 ? data[0] : null);
    }, [user]);

    // Re-fetch whenever screen comes into focus so cancelled orders clear immediately
    useFocusEffect(useCallback(() => {
        fetchActiveOrder();
    }, [fetchActiveOrder]));

    useEffect(() => {
        if (!user) return;
        fetchActiveOrder();
        const sub = supabase.channel('home-active-order')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, (payload) => {
                const o = payload.new;
                if (o.customer_id !== user.id) return;
                // Only show cash orders immediately; PhonePe orders wait for payment
                if (o.payment_method !== 'cash') return;
                setActiveOrder(o);
            })
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, (payload) => {
                const o = payload.new;
                if (o.customer_id !== user.id) return;
                if (['delivered', 'cancelled'].includes(o.status)) {
                    setActiveOrder(prev => prev?.id === o.id ? null : prev);
                } else if (o.payment_method !== 'cash' && o.payment_status === 'paid') {
                    // PhonePe payment confirmed — now show the tracker
                    setActiveOrder(o);
                } else {
                    setActiveOrder(prev => prev?.id === o.id ? { ...prev, ...o } : prev);
                }
            })
            .subscribe();
        return () => supabase.removeChannel(sub);
    }, [user]);

    const fetchKitchenStatus = async () => {
        try {
            const { data } = await supabase.from('store_settings').select('value').eq('key', 'kitchen_status').single();
            setKitchenOpen(data?.value === 'open');
        } catch { setKitchenOpen(true); }
    };

    useFocusEffect(useCallback(() => {
        const fetchLocation = async () => {
            try {
                const data = await AsyncStorage.getItem('@pizza_addresses');
                if (data) {
                    const parsed = JSON.parse(data);
                    if (parsed?.length > 0)
                        setCurrentLocation(parsed[0].title || parsed[0].address?.split(',')[0] || 'Law Gate, LPU');
                }
            } catch { /* silent */ }
        };
        fetchLocation();
    }, []));

    const fetchData = async () => {
        setLoading(true);
        try {
            const [catRes, featRes, orderItemsRes] = await Promise.all([
                supabase.from('categories').select('*').order('sort_order', { ascending: true }),
                supabase.from('products').select('*, category:categories(name)').eq('is_featured', true).eq('is_available', true).limit(8),
                supabase.from('order_items').select('product_id, quantity').order('created_at', { ascending: false }).limit(500),
            ]);
            if (catRes.data) setCategories(catRes.data);
            if (featRes.data) setFeatured(featRes.data);

            let popData = [];
            if (orderItemsRes.data?.length > 0) {
                const counts = {};
                orderItemsRes.data.forEach(item => { counts[item.product_id] = (counts[item.product_id] || 0) + item.quantity; });
                const topIds = Object.keys(counts).sort((a, b) => counts[b] - counts[a]).slice(0, 6);
                if (topIds.length > 0) {
                    const { data } = await supabase.from('products').select('*, category:categories(name)').in('id', topIds).eq('is_available', true);
                    if (data) popData = data.sort((a, b) => counts[b.id] - counts[a.id]);
                }
            }
            if (popData.length === 0) {
                const { data } = await supabase.from('products').select('*, category:categories(name)').eq('is_available', true).order('created_at', { ascending: false }).limit(6);
                if (data) popData = data;
            }
            setPopular(popData);
        } catch { /* silent */ }
        setLoading(false);
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#22973a" />

            {!kitchenOpen && (
                <View style={styles.closedBanner}>
                    <AlertCircle color="#991b1b" size={15} />
                    <Text style={styles.closedText}>Kitchen is closed — Orders on hold</Text>
                </View>
            )}

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: activeOrder ? 130 : 40 }}>

                {/* ── Header ── */}
                <View style={styles.header}>
                    <SafeAreaView>
                        <View style={styles.headerRow}>
                            {/* Logo */}
                            <View style={styles.logoSquare}>
                                <Image source={LOGO} style={styles.logoImg} />
                            </View>
                            <View style={styles.headerMid}>
                                <Text style={styles.brandName}>PIZZA VIRUS</Text>
                                <Text style={styles.brandTagline}>Hunger is a Deadly Virus</Text>
                            </View>
                            {/* Cart button */}
                            <TouchableOpacity style={styles.cartBtn} onPress={() => navigation.navigate('Cart')} activeOpacity={0.85}>
                                <ShoppingCart color="#22973a" size={22} strokeWidth={2.5} />
                                {cartCount > 0 && (
                                    <View style={styles.cartBadge}>
                                        <Text style={styles.cartBadgeText}>{cartCount}</Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        </View>

                        {/* Delivering to row */}
                        <View style={styles.locationRow}>
                            <MapPin color="rgba(255,255,255,0.8)" size={14} />
                            <Text style={styles.locationLabel}>Delivering to: </Text>
                            <Text style={styles.locationValue} numberOfLines={1}>{currentLocation}</Text>
                        </View>
                    </SafeAreaView>
                </View>

                {/* ── Featured Pizzas ── */}
                {featured.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>🔥 Featured Pizzas</Text>
                        <FlatList
                            data={featured}
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            keyExtractor={item => item.id}
                            contentContainerStyle={{ paddingLeft: 20, paddingRight: 8, paddingTop: 16 }}
                            snapToInterval={FEAT_W + 16}
                            decelerationRate="fast"
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={styles.featCard}
                                    onPress={() => navigation.navigate('ProductDetail', { product: item })}
                                    activeOpacity={0.93}
                                >
                                    {/* Image */}
                                    <View style={styles.featImgWrap}>
                                        {item.image_url
                                            ? <Image source={{ uri: item.image_url }} style={styles.featImg} />
                                            : <View style={styles.featImgPlaceholder}><Text style={{ fontSize: 64 }}>🍕</Text></View>
                                        }
                                        <View style={styles.featBadge}>
                                            <Text style={styles.featBadgeText}>FEATURED</Text>
                                        </View>
                                    </View>
                                    {/* Orange info */}
                                    <View style={styles.featInfo}>
                                        <Text style={styles.featName} numberOfLines={1}>{item.name}</Text>
                                        <Text style={styles.featDesc} numberOfLines={1}>{item.description || 'Freshly baked pizza'}</Text>
                                        <View style={styles.featFooter}>
                                            <Text style={styles.featPrice}>₹{item.base_price_small}</Text>
                                            <TouchableOpacity
                                                style={styles.featAddBtn}
                                                onPress={() => navigation.navigate('ProductDetail', { product: item })}
                                                activeOpacity={0.85}
                                            >
                                                <Text style={styles.featAddBtnText}>ADD</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                </TouchableOpacity>
                            )}
                        />
                    </View>
                )}

                {/* ── Categories ── */}
                {categories.length > 0 && (
                    <View style={[styles.section, { marginTop: 28 }]}>
                        <Text style={styles.sectionTitle}>Categories</Text>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.catScroll}
                            style={{ marginTop: 16 }}
                        >
                            {categories.map(cat => {
                                const { bg, Icon } = getCatStyle(cat.name);
                                return (
                                    <TouchableOpacity
                                        key={cat.id}
                                        style={styles.catCard}
                                        onPress={() => navigation.navigate('Menu', { categoryId: cat.id })}
                                        activeOpacity={0.85}
                                    >
                                        <View style={[styles.catCircle, { backgroundColor: bg }]}>
                                            <Icon size={26} color="#fff" strokeWidth={2} />
                                        </View>
                                        <Text style={styles.catName} numberOfLines={2}>{cat.name}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                    </View>
                )}

                {/* ── Quick Actions ── */}
                <View style={[styles.section, { marginTop: 28 }]}>
                    <Text style={styles.sectionTitle}>Quick Actions</Text>
                    <View style={styles.quickRow}>
                        <TouchableOpacity style={[styles.quickCard, { backgroundColor: '#7c3aed' }]} onPress={() => navigation.navigate('Menu')} activeOpacity={0.85}>
                            <Text style={styles.quickIcon}>📦</Text>
                            <Text style={styles.quickTitle}>Bulk Order</Text>
                            <Text style={styles.quickSub}>Min 10 Items</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.quickCard, { backgroundColor: '#2196F3' }]} onPress={() => navigation.navigate('OrderHistory')} activeOpacity={0.85}>
                            <Text style={styles.quickIcon}>📋</Text>
                            <Text style={styles.quickTitle}>Order History</Text>
                            <Text style={styles.quickSub}>Track orders</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.quickCard, { backgroundColor: '#f97316' }]} onPress={() => navigation.navigate('Offers')} activeOpacity={0.85}>
                            <Text style={styles.quickIcon}>🎁</Text>
                            <Text style={styles.quickTitle}>Deals</Text>
                            <Text style={styles.quickSub}>Save more</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* ── Popular Items ── */}
                {popular.length > 0 && (
                    <View style={[styles.section, { marginTop: 28 }]}>
                        <View style={styles.sectionRow}>
                            <Text style={styles.sectionTitle}>Popular Items</Text>
                            <TouchableOpacity onPress={() => navigation.navigate('Menu')}>
                                <Text style={styles.seeAll}>See All →</Text>
                            </TouchableOpacity>
                        </View>
                        <View style={styles.popularGrid}>
                            {popular.map(item => (
                                <TouchableOpacity
                                    key={item.id}
                                    style={styles.popularCard}
                                    onPress={() => navigation.navigate('ProductDetail', { product: item })}
                                    activeOpacity={0.9}
                                >
                                    <View style={styles.popularImgWrap}>
                                        {item.image_url
                                            ? <Image source={{ uri: item.image_url }} style={styles.popularImg} />
                                            : <View style={styles.popularImgPlaceholder}><Text style={{ fontSize: 36 }}>🍕</Text></View>
                                        }
                                        {/* White circle veg indicator */}
                                        <View style={styles.popularVegDotOuter}>
                                            <View style={[styles.popularVegDotInner, { backgroundColor: item.is_veg ? '#22973a' : '#f97316' }]} />
                                        </View>
                                    </View>
                                    <View style={styles.popularInfo}>
                                        <Text style={styles.popularName} numberOfLines={2}>{item.name}</Text>
                                        <Text style={styles.popularDesc} numberOfLines={1}>{item.description || 'Freshly baked'}</Text>
                                        <View style={styles.popularFooter}>
                                            <Text style={styles.popularPrice}>₹{item.base_price_small}</Text>
                                            <TouchableOpacity
                                                style={styles.popularAddBtn}
                                                onPress={() => navigation.navigate('ProductDetail', { product: item })}
                                                activeOpacity={0.85}
                                            >
                                                <Text style={styles.popularAddBtnText}>+</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                )}

            </ScrollView>

            {/* ── Full-screen loading splash (covers tab bar via Modal) ── */}
            <Modal visible={loading} transparent={false} statusBarTranslucent animationType="none">
                <AppLoadingScreen />
            </Modal>

            {/* ── Active order banner ── */}
            {activeOrder && (() => {
                const meta = ORDER_STATUS_META[activeOrder.status] || ORDER_STATUS_META.placed;
                const currentIdx = getMiniStageIdx(activeOrder.status);
                return (
                    <TouchableOpacity
                        style={styles.orderBanner}
                        onPress={() => navigation.navigate('OrderHistory')}
                        activeOpacity={0.92}
                    >
                        <View style={styles.bannerContent}>
                            <View style={styles.bannerTopRow}>
                                <View style={[styles.bannerPulse, { backgroundColor: meta.color }]} />
                                <Text style={styles.bannerOrderId}>Order #{activeOrder.display_id}</Text>
                                <Text style={[styles.bannerStatusLabel, { color: meta.color }]}>
                                    {meta.emoji} {meta.label}
                                </Text>
                            </View>
                            <View style={styles.miniStepper}>
                                {MINI_STAGES.map((stage, idx) => (
                                    <React.Fragment key={stage}>
                                        {idx > 0 && (
                                            <View style={[styles.miniLine, { backgroundColor: idx <= currentIdx ? '#22973a' : '#e2e8f0' }]} />
                                        )}
                                        <View style={[
                                            styles.miniDot,
                                            idx <= currentIdx ? styles.miniDotDone : styles.miniDotPending,
                                            idx === currentIdx && styles.miniDotActive,
                                        ]} />
                                    </React.Fragment>
                                ))}
                            </View>
                            <Text style={styles.bannerHint}>Tap to view details</Text>
                        </View>
                        <ChevronRight color="#22973a" size={22} />
                    </TouchableOpacity>
                );
            })()}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F0F0F5' },
    loadingBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },

    // ── Header ──
    header: {
        backgroundColor: '#22973a',
        paddingHorizontal: 20,
        paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight ?? 36) + 12 : 10,
        paddingBottom: 20,
        borderBottomLeftRadius: 28,
        borderBottomRightRadius: 28,
    },
    headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },

    // Logo
    logoSquare: {
        width: 68, height: 68,
        borderRadius: 18,
        overflow: 'hidden',
        marginRight: 14,
        shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.2, shadowRadius: 6, elevation: 5,
    },
    logoImg: { width: '100%', height: '100%', resizeMode: 'cover' },

    headerMid: { flex: 1 },
    brandName: { fontSize: 22, fontWeight: '900', color: '#fff', letterSpacing: 0.5 },
    brandTagline: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2 },

    cartBtn: {
        width: 46, height: 46, backgroundColor: '#fff', borderRadius: 23,
        justifyContent: 'center', alignItems: 'center', position: 'relative',
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 5, elevation: 4,
    },
    cartBadge: {
        position: 'absolute', top: -3, right: -3,
        backgroundColor: '#ef4444', minWidth: 18, height: 18, borderRadius: 9,
        justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#22973a',
    },
    cartBadgeText: { color: '#fff', fontSize: 9, fontWeight: '900' },

    locationRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    locationLabel: { fontSize: 13, color: 'rgba(255,255,255,0.85)', fontWeight: '500' },
    locationValue: { fontSize: 13, color: '#fff', fontWeight: '800', flex: 1 },

    // ── Closed banner ──
    closedBanner: {
        backgroundColor: '#fee2e2', flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        paddingVertical: 9, paddingHorizontal: 20, gap: 8,
    },
    closedText: { fontSize: 13, color: '#991b1b', fontWeight: '700' },

    // ── Section ──
    section: { paddingHorizontal: 20, marginTop: 24 },
    sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    sectionTitle: { fontSize: 19, fontWeight: '900', color: '#111827' },
    seeAll: { fontSize: 13, fontWeight: '700', color: '#22973a' },

    // ── Featured Cards ──
    featCard: {
        width: FEAT_W,
        backgroundColor: '#fff',
        borderRadius: 20,
        overflow: 'hidden',
        marginRight: 16,
        shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.12, shadowRadius: 14, elevation: 6,
    },
    featImgWrap: { width: '100%', height: 180, backgroundColor: '#f3feb0', position: 'relative' },
    featImg: { width: '100%', height: '100%', resizeMode: 'cover' },
    featImgPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f3feb0' },
    featBadge: {
        position: 'absolute', top: 12, left: 12,
        backgroundColor: '#22973a', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8,
    },
    featBadgeText: { color: '#fff', fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
    featInfo: {
        backgroundColor: '#f97316',
        paddingHorizontal: 16, paddingTop: 14, paddingBottom: 16,
    },
    featName: { fontSize: 18, fontWeight: '900', color: '#fff', marginBottom: 4 },
    featDesc: { fontSize: 12, color: 'rgba(255,255,255,0.85)', lineHeight: 17, marginBottom: 14 },
    featFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    featPrice: { fontSize: 24, fontWeight: '900', color: '#fff' },
    featAddBtn: {
        backgroundColor: '#fff',
        paddingHorizontal: 24, paddingVertical: 10,
        borderRadius: 24,
    },
    featAddBtnText: { color: '#22973a', fontSize: 14, fontWeight: '900' },

    // ── Categories ── white card containing colored circle
    catScroll: { gap: 14, paddingRight: 8, paddingBottom: 8, paddingTop: 4 },
    catCard: {
        width: 90,
        backgroundColor: '#fff',
        borderRadius: 18,
        paddingVertical: 16, paddingHorizontal: 8,
        alignItems: 'center',
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
    },
    catCircle: {
        width: 58, height: 58, borderRadius: 29,
        justifyContent: 'center', alignItems: 'center', marginBottom: 10,
    },
    catName: { fontSize: 12, fontWeight: '700', color: '#111827', textAlign: 'center', lineHeight: 16 },

    // ── Quick Actions ──
    quickRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
    quickCard: {
        flex: 1, borderRadius: 18,
        paddingTop: 20, paddingBottom: 16, paddingHorizontal: 8,
        alignItems: 'center',
        shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 8, elevation: 4,
    },
    quickIcon: { fontSize: 28 },
    quickTitle: { fontSize: 12, fontWeight: '900', color: '#fff', marginTop: 8, textAlign: 'center', lineHeight: 16 },
    quickSub: { fontSize: 10, color: 'rgba(255,255,255,0.85)', marginTop: 3, textAlign: 'center' },

    // ── Popular Items — 2-column grid ──
    popularGrid: {
        flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 16,
    },
    popularCard: {
        width: (width - 52) / 2,
        backgroundColor: '#fff', borderRadius: 18,
        overflow: 'hidden',
        shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 3,
    },
    popularImgWrap: { width: '100%', height: 130, position: 'relative', backgroundColor: '#f3feb0' },
    popularImg: { width: '100%', height: '100%', resizeMode: 'cover' },
    popularImgPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f3feb0' },
    popularVegDotOuter: {
        position: 'absolute', top: 8, right: 8,
        width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff',
        justifyContent: 'center', alignItems: 'center',
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.15, shadowRadius: 3, elevation: 2,
    },
    popularVegDotInner: { width: 9, height: 9, borderRadius: 5 },
    popularInfo: { padding: 10 },
    popularName: { fontSize: 13, fontWeight: '900', color: '#111827', lineHeight: 18 },
    popularDesc: { fontSize: 11, color: '#94a3b8', marginTop: 2, marginBottom: 8 },
    popularFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    popularPrice: { fontSize: 15, fontWeight: '900', color: '#111827' },
    popularAddBtn: {
        backgroundColor: '#22973a', width: 28, height: 28, borderRadius: 14,
        justifyContent: 'center', alignItems: 'center',
    },
    popularAddBtnText: { color: '#fff', fontSize: 18, fontWeight: '900', lineHeight: 22 },

    // ── Active order banner ──
    orderBanner: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        backgroundColor: '#fff',
        borderTopLeftRadius: 24, borderTopRightRadius: 24,
        paddingHorizontal: 20, paddingVertical: 16,
        flexDirection: 'row', alignItems: 'center',
        shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 14,
    },
    bannerContent: { flex: 1 },
    bannerTopRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
    bannerPulse: { width: 10, height: 10, borderRadius: 5 },
    bannerOrderId: { fontSize: 15, fontWeight: '900', color: '#111827' },
    bannerStatusLabel: { fontSize: 13, fontWeight: '800' },
    miniStepper: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
    miniDot: { width: 12, height: 12, borderRadius: 6 },
    miniDotDone:    { backgroundColor: '#22973a' },
    miniDotPending: { backgroundColor: '#e2e8f0' },
    miniDotActive:  { width: 16, height: 16, borderRadius: 8, backgroundColor: '#22973a', borderWidth: 2, borderColor: '#bbf7d0' },
    miniLine: { flex: 1, height: 2, marginHorizontal: 3 },
    bannerHint: { fontSize: 11, color: '#94a3b8', fontWeight: '600' },
});
