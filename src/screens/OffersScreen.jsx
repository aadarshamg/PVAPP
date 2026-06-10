import React, { useEffect, useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    ScrollView, StatusBar, Alert, ActivityIndicator, Clipboard
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Tag as TagIcon, Copy, Clock } from 'lucide-react-native';
import { supabase } from '../lib/supabase';

const OFFER_COLORS = [
    { bg: '#7c3aed', light: '#ede9fe' },
    { bg: '#f97316', light: '#fff7ed' },
    { bg: '#0ea5e9', light: '#e0f2fe' },
    { bg: '#22973a', light: '#f0fdf4' },
    { bg: '#e11d48', light: '#fff1f2' },
];

const getOfferColor = (idx) => OFFER_COLORS[idx % OFFER_COLORS.length];

const getBadgeLabel = (offer) => {
    if (offer.discount_type === 'percentage') return `${offer.discount_value}% OFF`;
    return `₹${offer.discount_value} OFF`;
};

const getOfferTitle = (offer) => {
    if (offer.discount_type === 'percentage') return `${offer.discount_value}% OFF`;
    return `Flat ₹${offer.discount_value} OFF`;
};

const getOfferDesc = (offer) => {
    if (offer.discount_type === 'percentage') return `Get ${offer.discount_value}% off on all pizzas`;
    return `Get flat ₹${offer.discount_value} off on orders above ₹${offer.min_order_amount || 0}`;
};

const formatDate = (dateStr) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

export default function OffersScreen({ navigation }) {
    const [coupons, setCoupons] = useState([]);
    const [loading, setLoading] = useState(true);
    const [copied, setCopied] = useState(null);

    useEffect(() => {
        fetchOffers();
    }, []);

    const fetchOffers = async () => {
        setLoading(true);
        const { data } = await supabase
            .from('offers')
            .select('*')
            .eq('is_active', true)
            .order('created_at', { ascending: false });
        if (data) setCoupons(data);
        setLoading(false);
    };

    const copyCode = (code) => {
        Clipboard.setString(code);
        setCopied(code);
        setTimeout(() => setCopied(null), 2000);
    };

    return (
        <SafeAreaView style={styles.safe}>
            <StatusBar barStyle="light-content" backgroundColor="#22973a" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <ArrowLeft color="#fff" size={22} />
                </TouchableOpacity>
                <View style={styles.headerCenter}>
                    <Text style={styles.headerTitle}>Deals & Offers</Text>
                    <Text style={styles.headerSub}>Save more with amazing deals!</Text>
                </View>
                <View style={{ width: 40 }} />
            </View>

            {loading ? (
                <View style={styles.centerBox}>
                    <ActivityIndicator size="large" color="#22973a" />
                </View>
            ) : (
                <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

                    {/* Hero banner */}
                    <View style={styles.heroBanner}>
                        <View style={styles.heroLeft}>
                            <Text style={styles.heroEmoji}>🎉</Text>
                            <View>
                                <Text style={styles.heroTitle}>SUPER SAVER</Text>
                                <Text style={styles.heroDesc}>Get up to 40% OFF on weekend orders!</Text>
                            </View>
                        </View>
                        <View style={styles.heroCodeBox}>
                            <Text style={styles.heroCodeText}>Use Code: WEEKEND40</Text>
                        </View>
                    </View>

                    {/* Available Offers */}
                    {coupons.length > 0 && (
                        <>
                            <Text style={styles.sectionTitle}>Available Offers</Text>
                            {coupons.map((offer, idx) => {
                                const color = getOfferColor(idx);
                                const isCopied = copied === offer.code;
                                return (
                                    <View key={offer.id} style={styles.offerCard}>
                                        {/* Left icon */}
                                        <View style={[styles.offerIconBox, { backgroundColor: color.light }]}>
                                            <TagIcon color={color.bg} size={22} />
                                        </View>

                                        {/* Middle content */}
                                        <View style={styles.offerBody}>
                                            <View style={styles.offerTitleRow}>
                                                <Text style={styles.offerTitle}>{getOfferTitle(offer)}</Text>
                                                <View style={[styles.offerBadge, { backgroundColor: color.bg }]}>
                                                    <Text style={styles.offerBadgeText}>{getBadgeLabel(offer)}</Text>
                                                </View>
                                            </View>
                                            <Text style={styles.offerDesc}>{getOfferDesc(offer)}</Text>

                                            {/* Meta row */}
                                            <View style={styles.offerMeta}>
                                                {offer.min_order_amount > 0 && (
                                                    <View style={styles.metaItem}>
                                                        <Text style={styles.metaText}>Min order: ₹{offer.min_order_amount}</Text>
                                                    </View>
                                                )}
                                                {offer.valid_to && (
                                                    <View style={styles.metaItem}>
                                                        <Clock size={11} color="#94a3b8" />
                                                        <Text style={styles.metaText}>Valid till {formatDate(offer.valid_to)}</Text>
                                                    </View>
                                                )}
                                            </View>

                                            {/* Code + Copy */}
                                            <View style={styles.codeRow}>
                                                <View style={styles.codeBox}>
                                                    <Text style={styles.codeText}>{offer.code}</Text>
                                                </View>
                                                <TouchableOpacity
                                                    style={[styles.copyBtn, isCopied && styles.copyBtnCopied]}
                                                    onPress={() => copyCode(offer.code)}
                                                    activeOpacity={0.8}
                                                >
                                                    <Copy size={14} color="#fff" />
                                                    <Text style={styles.copyBtnText}>{isCopied ? 'Copied!' : 'Copy'}</Text>
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                    </View>
                                );
                            })}
                        </>
                    )}

                    {coupons.length === 0 && (
                        <View style={styles.emptyBox}>
                            <TagIcon size={56} color="#cbd5e1" />
                            <Text style={styles.emptyTitle}>No Active Offers</Text>
                            <Text style={styles.emptySub}>Check back later for exciting deals!</Text>
                        </View>
                    )}
                </ScrollView>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: '#f8fafc' },
    centerBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },

    // Header
    header: {
        backgroundColor: '#22973a', flexDirection: 'row', alignItems: 'center',
        justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14,
    },
    backBtn: {
        width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center', alignItems: 'center',
    },
    headerCenter: { flex: 1, alignItems: 'center' },
    headerTitle: { fontSize: 18, fontWeight: '900', color: '#fff' },
    headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 2 },

    content: { padding: 20 },

    // Hero Banner
    heroBanner: {
        backgroundColor: '#f97316',
        borderRadius: 20, padding: 20, marginBottom: 28,
        overflow: 'hidden',
    },
    heroLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
    heroEmoji: { fontSize: 32 },
    heroTitle: { fontSize: 22, fontWeight: '900', color: '#fff', letterSpacing: 0.5 },
    heroDesc: { fontSize: 13, color: 'rgba(255,255,255,0.9)', marginTop: 2 },
    heroCodeBox: {
        backgroundColor: '#fff', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 20,
        alignItems: 'center',
    },
    heroCodeText: { fontSize: 15, fontWeight: '900', color: '#f97316', letterSpacing: 1 },

    sectionTitle: { fontSize: 19, fontWeight: '900', color: '#0f172a', marginBottom: 16 },

    // Offer Card
    offerCard: {
        flexDirection: 'row', backgroundColor: '#fff', borderRadius: 18, padding: 16,
        marginBottom: 16, gap: 14,
        shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 3,
    },
    offerIconBox: {
        width: 44, height: 44, borderRadius: 22,
        justifyContent: 'center', alignItems: 'center', alignSelf: 'flex-start', marginTop: 2,
    },
    offerBody: { flex: 1 },
    offerTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
    offerTitle: { fontSize: 16, fontWeight: '900', color: '#0f172a', flex: 1, marginRight: 8 },
    offerBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
    offerBadgeText: { color: '#fff', fontSize: 11, fontWeight: '900' },
    offerDesc: { fontSize: 13, color: '#64748b', lineHeight: 18, marginBottom: 8 },

    // Meta
    offerMeta: { flexDirection: 'row', gap: 14, marginBottom: 12, flexWrap: 'wrap' },
    metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    metaText: { fontSize: 11, color: '#94a3b8', fontWeight: '600' },

    // Code row
    codeRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    codeBox: {
        flex: 1, borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 10,
        paddingVertical: 10, paddingHorizontal: 14, borderStyle: 'dashed',
    },
    codeText: { fontSize: 14, fontWeight: '900', color: '#0f172a', letterSpacing: 1 },
    copyBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: '#22973a', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10,
    },
    copyBtnCopied: { backgroundColor: '#16a34a' },
    copyBtnText: { color: '#fff', fontSize: 13, fontWeight: '800' },

    // Empty
    emptyBox: { alignItems: 'center', paddingTop: 40 },
    emptyTitle: { fontSize: 18, fontWeight: '900', color: '#0f172a', marginTop: 14 },
    emptySub: { fontSize: 13, color: '#94a3b8', marginTop: 6, textAlign: 'center' },
});
