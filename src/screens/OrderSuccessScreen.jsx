import React, { useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    StatusBar, ScrollView, Animated
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Home, Package } from 'lucide-react-native';

export default function OrderSuccessScreen({ route, navigation }) {
    const { orderId, total, address, addressTitle, sliceEarned } = route.params || {};

    const now = new Date();
    const eta = new Date(now.getTime() + 30 * 60000);
    const etaStr = eta.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Animations
    const sliceScale = useRef(new Animated.Value(0)).current;
    const sliceFade = useRef(new Animated.Value(0)).current;
    const bounceAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        if (!sliceEarned) return;
        // Delay then pop in
        setTimeout(() => {
            Animated.parallel([
                Animated.spring(sliceScale, {
                    toValue: 1,
                    friction: 5,
                    tension: 80,
                    useNativeDriver: true,
                }),
                Animated.timing(sliceFade, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                }),
            ]).start(() => {
                // Bounce loop on emoji
                Animated.loop(
                    Animated.sequence([
                        Animated.timing(bounceAnim, { toValue: 1.15, duration: 450, useNativeDriver: true }),
                        Animated.timing(bounceAnim, { toValue: 1, duration: 450, useNativeDriver: true }),
                    ])
                ).start();
            });
        }, 600);
    }, [sliceEarned]);

    return (
        <SafeAreaView style={styles.safe}>
            <StatusBar barStyle="dark-content" />
            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

                {/* Big green checkmark circle */}
                <View style={styles.checkCircleWrap}>
                    <View style={styles.checkCircle}>
                        <Text style={styles.checkMark}>✓</Text>
                    </View>
                </View>

                {/* White card */}
                <View style={styles.card}>
                    <View style={styles.orderNumBox}>
                        <Text style={styles.orderNumLabel}>Order Number</Text>
                        <Text style={styles.orderNumValue}>{orderId || '—'}</Text>
                    </View>

                    <View style={styles.etaRow}>
                        <View style={styles.etaIconBox}>
                            <Package color="#f5a623" size={26} />
                        </View>
                        <View style={styles.etaInfo}>
                            <Text style={styles.etaLabel}>Estimated Delivery</Text>
                            <Text style={styles.etaTime}>30 minutes</Text>
                            <Text style={styles.etaSubLabel}>Around {etaStr}</Text>
                        </View>
                    </View>

                    <View style={styles.dashed} />

                    <View style={styles.addrSection}>
                        <Text style={styles.addrLabel}>Delivery Address</Text>
                        <Text style={styles.addrTitle}>{addressTitle || 'Home'}</Text>
                        <Text style={styles.addrText} numberOfLines={2}>{address || '—'}</Text>
                    </View>
                </View>

                {/* 🍕 SLICE EARNED BANNER — shown BEFORE buttons so it's seen immediately */}
                {sliceEarned && (
                    <Animated.View style={[styles.sliceBanner, { opacity: sliceFade, transform: [{ scale: sliceScale }] }]}>
                        {/* Decorative confetti row */}
                        <Text style={styles.confetti}>🎊 🍕 🎊</Text>

                        {/* Big animated pizza */}
                        <Animated.Text style={[styles.sliceBigEmoji, { transform: [{ scale: bounceAnim }] }]}>
                            🍕
                        </Animated.Text>

                        {/* +1 badge */}
                        <View style={styles.plusOneBadge}>
                            <Text style={styles.plusOneText}>+1 SLICE</Text>
                        </View>

                        <Text style={styles.sliceBannerTitle}>Slice Incoming!</Text>
                        <Text style={styles.sliceBannerSub}>
                            You're earning a pizza slice with this order!{'\n'}
                            Collect <Text style={styles.sliceBannerBold}>6 slices</Text> and get a{' '}
                            <Text style={styles.sliceBannerBold}>FREE PIZZA 🎁</Text>
                        </Text>

                        {/* Progress dots */}
                        <View style={styles.sliceDots}>
                            {[0,1,2,3,4,5].map(i => (
                                <View key={i} style={i === 0 ? styles.sliceDotFilled : styles.sliceDotEmpty} />
                            ))}
                        </View>
                        <Text style={styles.sliceProgress}>You just earned slice #1 of 6</Text>
                    </Animated.View>
                )}

                {/* Buttons */}
                <TouchableOpacity
                    style={styles.homeBtn}
                    onPress={() => navigation.navigate('MainTabs', { screen: 'HomeTab' })}
                    activeOpacity={0.85}
                >
                    <Home color="#fff" size={20} />
                    <Text style={styles.homeBtnText}>BACK TO HOME</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.trackBtn}
                    onPress={() => navigation.navigate('OrderHistory')}
                    activeOpacity={0.85}
                >
                    <Text style={styles.trackBtnText}>TRACK ORDER</Text>
                </TouchableOpacity>

                {/* Thank You Message */}
                <View style={styles.thankYouBox}>
                    <Text style={styles.thankYouTitle}>🎉 Thank you for ordering from Pizza Virus!</Text>
                    <Text style={styles.thankYouSub}>We're spreading deliciousness, one pizza at a time!</Text>
                </View>

            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: '#dff0d8' },
    scroll: { paddingHorizontal: 24, paddingTop: 40, paddingBottom: 40, alignItems: 'center' },

    checkCircleWrap: { marginBottom: -36, zIndex: 10 },
    checkCircle: {
        width: 80, height: 80, borderRadius: 40, backgroundColor: '#22973a',
        justifyContent: 'center', alignItems: 'center',
        shadowColor: '#22973a', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.35, shadowRadius: 16, elevation: 10,
    },
    checkMark: { fontSize: 38, color: '#fff', fontWeight: '900', lineHeight: 44 },

    card: {
        width: '100%', backgroundColor: '#fff', borderRadius: 24,
        paddingTop: 52, paddingBottom: 24, paddingHorizontal: 20,
        shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 20, elevation: 6,
        marginBottom: 20,
    },
    orderNumBox: {
        backgroundColor: '#22973a', borderRadius: 16,
        paddingHorizontal: 20, paddingVertical: 16, marginBottom: 20, alignItems: 'center',
    },
    orderNumLabel: { fontSize: 13, color: 'rgba(255,255,255,0.75)', fontWeight: '600', marginBottom: 4, textAlign: 'center' },
    orderNumValue: { fontSize: 32, color: '#fff', fontWeight: '900', letterSpacing: 1, textAlign: 'center' },
    etaRow: { flexDirection: 'column', alignItems: 'center', marginBottom: 16 },
    etaIconBox: {
        width: 52, height: 52, borderRadius: 26, backgroundColor: '#FFF8E1',
        justifyContent: 'center', alignItems: 'center', marginBottom: 10,
    },
    etaInfo: { alignItems: 'center' },
    etaLabel: { fontSize: 12, color: '#94a3b8', fontWeight: '600', textAlign: 'center' },
    etaTime: { fontSize: 22, fontWeight: '900', color: '#0f172a', marginTop: 2, textAlign: 'center' },
    etaSubLabel: { fontSize: 12, color: '#64748b', marginTop: 2, textAlign: 'center' },
    dashed: { borderTopWidth: 1, borderColor: '#e2e8f0', borderStyle: 'dashed', marginVertical: 16 },
    addrSection: { alignItems: 'center' },
    addrLabel: { fontSize: 12, color: '#94a3b8', fontWeight: '600', marginBottom: 6, textAlign: 'center' },
    addrTitle: { fontSize: 16, fontWeight: '900', color: '#0f172a', textAlign: 'center' },
    addrText: { fontSize: 14, color: '#475569', marginTop: 2, lineHeight: 20, textAlign: 'center' },

    // 🍕 Slice Banner
    sliceBanner: {
        width: '100%',
        backgroundColor: '#1a0533',
        borderRadius: 24,
        paddingVertical: 24,
        paddingHorizontal: 20,
        alignItems: 'center',
        marginBottom: 20,
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: '#7c3aed',
        shadowColor: '#7c3aed',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
        elevation: 12,
    },
    confetti: { fontSize: 22, marginBottom: 8, letterSpacing: 8 },
    sliceBigEmoji: { fontSize: 72, marginBottom: 4 },
    plusOneBadge: {
        backgroundColor: '#7c3aed',
        paddingHorizontal: 20,
        paddingVertical: 6,
        borderRadius: 30,
        marginBottom: 14,
    },
    plusOneText: { fontSize: 16, fontWeight: '900', color: '#fff', letterSpacing: 2 },
    sliceBannerTitle: { fontSize: 26, fontWeight: '900', color: '#fff', marginBottom: 10, textAlign: 'center' },
    sliceBannerSub: {
        fontSize: 14, color: '#c4b5fd', lineHeight: 22, textAlign: 'center', marginBottom: 18,
    },
    sliceBannerBold: { fontWeight: '900', color: '#fff' },

    // Progress dots
    sliceDots: { flexDirection: 'row', gap: 8, marginBottom: 8 },
    sliceDotFilled: {
        width: 28, height: 10, borderRadius: 5,
        backgroundColor: '#7c3aed',
        shadowColor: '#7c3aed', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.8, shadowRadius: 4, elevation: 3,
    },
    sliceDotEmpty: { width: 10, height: 10, borderRadius: 5, backgroundColor: 'rgba(255,255,255,0.15)' },
    sliceProgress: { fontSize: 12, color: '#a78bfa', fontWeight: '700', textAlign: 'center' },

    // Buttons
    homeBtn: {
        width: '100%', backgroundColor: '#22973a', borderRadius: 16,
        paddingVertical: 18, flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
        gap: 10, marginBottom: 12,
        shadowColor: '#22973a', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 4,
    },
    homeBtnText: { color: '#fff', fontSize: 15, fontWeight: '900', letterSpacing: 1 },
    trackBtn: {
        width: '100%', borderRadius: 16, borderWidth: 2, borderColor: '#22973a',
        paddingVertical: 16, justifyContent: 'center', alignItems: 'center', marginBottom: 16,
    },
    trackBtnText: { color: '#22973a', fontSize: 15, fontWeight: '900', letterSpacing: 1 },

    thankYouBox: {
        width: '100%', backgroundColor: '#fefce8',
        borderWidth: 2, borderColor: '#fbbf24', borderRadius: 16, padding: 16,
    },
    thankYouTitle: { fontSize: 14, fontWeight: '900', color: '#0f172a', marginBottom: 4 },
    thankYouSub: { fontSize: 12, color: '#475569', lineHeight: 18 },
});
