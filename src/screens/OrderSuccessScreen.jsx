import React from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    StatusBar, ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Home, Package } from 'lucide-react-native';

export default function OrderSuccessScreen({ route, navigation }) {
    const { orderId, total, address, addressTitle } = route.params || {};

    const now = new Date();
    const eta = new Date(now.getTime() + 30 * 60000);
    const etaStr = eta.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return (
        <SafeAreaView style={styles.safe}>
            <StatusBar barStyle="dark-content" backgroundColor="#dff0d8" />
            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

                {/* Big green checkmark circle */}
                <View style={styles.checkCircleWrap}>
                    <View style={styles.checkCircle}>
                        <Text style={styles.checkMark}>✓</Text>
                    </View>
                </View>

                {/* White card */}
                <View style={styles.card}>
                    {/* Order Number */}
                    <View style={styles.orderNumBox}>
                        <Text style={styles.orderNumLabel}>Order Number</Text>
                        <Text style={styles.orderNumValue}>{orderId || '—'}</Text>
                    </View>

                    {/* Estimated delivery */}
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

                    {/* Delivery address */}
                    <View style={styles.addrSection}>
                        <Text style={styles.addrLabel}>Delivery Address</Text>
                        <Text style={styles.addrTitle}>{addressTitle || 'Home'}</Text>
                        <Text style={styles.addrText} numberOfLines={2}>{address || '—'}</Text>
                    </View>
                </View>

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

    // Checkmark
    checkCircleWrap: { marginBottom: -36, zIndex: 10 },
    checkCircle: {
        width: 80, height: 80, borderRadius: 40, backgroundColor: '#22973a',
        justifyContent: 'center', alignItems: 'center',
        shadowColor: '#22973a', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.35, shadowRadius: 16, elevation: 10,
    },
    checkMark: { fontSize: 38, color: '#fff', fontWeight: '900', lineHeight: 44 },

    // Main card
    card: {
        width: '100%', backgroundColor: '#fff', borderRadius: 24,
        paddingTop: 52, paddingBottom: 24, paddingHorizontal: 20,
        shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 20, elevation: 6,
        marginBottom: 20,
    },
    orderNumBox: {
        backgroundColor: '#22973a', borderRadius: 16,
        paddingHorizontal: 20, paddingVertical: 16, marginBottom: 20,
        alignItems: 'center',
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
        paddingVertical: 16, justifyContent: 'center', alignItems: 'center',
    },
    trackBtnText: { color: '#22973a', fontSize: 15, fontWeight: '900', letterSpacing: 1 },

    // Thank You Box
    thankYouBox: {
        width: '100%',
        backgroundColor: '#fefce8',
        borderWidth: 2,
        borderColor: '#fbbf24',
        borderRadius: 16,
        padding: 16,
        marginTop: 16,
    },
    thankYouTitle: { fontSize: 14, fontWeight: '900', color: '#0f172a', marginBottom: 4 },
    thankYouSub: { fontSize: 12, color: '#475569', lineHeight: 18 },
});
