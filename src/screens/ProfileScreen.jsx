import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView, StatusBar, Image, Linking
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';

const LOGO = require('../../assets/images/logo.png');
import { useAuth } from '../contexts/AuthContext';

const formatPhone = (email) => {
    if (!email) return '';
    if (email.endsWith('@phone.pizzavirus.app')) {
        const raw = email.replace('@phone.pizzavirus.app', '');
        if (raw.startsWith('91') && raw.length === 12) {
            return `+91 ${raw.slice(2, 7)} ${raw.slice(7)}`;
        }
        return `+${raw}`;
    }
    return email;
};
import { Package, MapPin, Tag, HelpCircle, Info, ChevronRight, LogOut } from 'lucide-react-native';

export default function ProfileScreen({ navigation }) {
    const { user, signOut } = useAuth();
    const [rewardSlices, setRewardSlices] = useState(null);

    useEffect(() => {
        if (!user?.id) return;
        supabase.from('profiles').select('reward_slices').eq('id', user.id).single()
            .then(({ data }) => setRewardSlices(data?.reward_slices ?? 0));
    }, [user?.id]);

    const menuItems = [
        { label: 'My Orders',        icon: Package,     screen: 'OrderHistory' },
        { label: 'Saved Addresses',  icon: MapPin,       screen: 'SavedAddresses' },
        { label: 'Offers & Coupons', icon: Tag,          screen: 'Offers' },
        { label: 'Help & Support',   icon: HelpCircle,   screen: 'Support' },
        { label: 'About',            icon: Info,         screen: 'About' },
    ];

    return (
        <SafeAreaView style={styles.safe}>
            <StatusBar barStyle="light-content" backgroundColor="#22973a" />
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>

                {/* Green header with avatar + name + pizza illustration */}
                <View style={styles.header}>
                    {/* Decorative pizza emojis */}
                    <Text style={[styles.deco, { top: 14, left: 18, fontSize: 38, transform: [{ rotate: '-15deg' }] }]}>🍕</Text>
                    <Text style={[styles.deco, { top: 8,  right: 22, fontSize: 28, transform: [{ rotate: '20deg' }] }]}>🍕</Text>
                    <Text style={[styles.deco, { bottom: 20, left: 30, fontSize: 22, transform: [{ rotate: '10deg' }] }]}>🌿</Text>
                    <Text style={[styles.deco, { bottom: 14, right: 16, fontSize: 32, transform: [{ rotate: '-20deg' }] }]}>🍕</Text>
                    <Text style={[styles.deco, { top: 50, left: 60, fontSize: 18, transform: [{ rotate: '25deg' }] }]}>🧄</Text>
                    <Text style={[styles.deco, { top: 20, right: 70, fontSize: 20, transform: [{ rotate: '-10deg' }] }]}>🫑</Text>

                    {/* Avatar + name (above decorations) */}
                    <View style={{ alignItems: 'center', zIndex: 1 }}>
                        <View style={styles.avatar}>
                            <Image source={LOGO} style={styles.avatarImg} />
                        </View>
                        <Text style={styles.userName}>{user?.user_metadata?.name || 'Pizza Lover'}</Text>
                        <Text style={styles.userEmail}>{formatPhone(user?.email)}</Text>
                    </View>
                </View>

                {/* Reward Widget */}
                {rewardSlices !== null && (
                    <View style={styles.rewardWidget}>
                        <View style={styles.rewardWidgetRow}>
                            <Text style={styles.rewardWidgetTitle}>🍕 Pizza Rewards</Text>
                            <Text style={styles.rewardWidgetBadge}>{Math.min(rewardSlices, 6)}/6</Text>
                        </View>
                        <View style={styles.sliceRow}>
                            {[0, 1, 2, 3, 4, 5].map(i => (
                                <Text key={i} style={{ fontSize: 28 }}>{i < rewardSlices ? '🍕' : '⬜'}</Text>
                            ))}
                        </View>
                        <Text style={styles.rewardWidgetHint}>
                            {rewardSlices >= 6
                                ? '🎉 Redeem your free pizza at checkout!'
                                : `${6 - Math.min(rewardSlices, 6)} more ${6 - Math.min(rewardSlices, 6) === 1 ? 'slice' : 'slices'} to earn a free pizza`}
                        </Text>
                    </View>
                )}

                {/* Menu Items */}
                <View style={styles.menuSection}>
                    {menuItems.map((item, index) => {
                        const Icon = item.icon;
                        const isLast = index === menuItems.length - 1;
                        return (
                            <TouchableOpacity
                                key={index}
                                style={[styles.menuItem, isLast && { borderBottomWidth: 0 }]}
                                onPress={() => item.screen && navigation.navigate(item.screen)}
                                activeOpacity={0.7}
                            >
                                <View style={styles.menuItemLeft}>
                                    <View style={styles.menuIconBox}>
                                        <Icon size={20} color="#22973a" />
                                    </View>
                                    <Text style={styles.menuLabel}>{item.label}</Text>
                                </View>
                                <ChevronRight size={18} color="#cbd5e1" />
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {/* Sign Out */}
                <TouchableOpacity style={styles.signOutBtn} onPress={signOut} activeOpacity={0.8}>
                    <LogOut size={20} color="#dc2626" />
                    <Text style={styles.signOutText}>Sign Out</Text>
                </TouchableOpacity>

                <Text style={styles.version}>Pizza Virus v1.0.0</Text>
                <TouchableOpacity onPress={() => Linking.openURL('https://www.falqonstudio.com')}>
                    <Text style={styles.devBy}>Developed by <Text style={styles.devByLink}>Falqon Studio</Text></Text>
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: '#f8fafc' },

    // Green header
    header: {
        backgroundColor: '#22973a',
        alignItems: 'center',
        paddingTop: 36,
        paddingBottom: 36,
        borderBottomLeftRadius: 32,
        borderBottomRightRadius: 32,
        marginBottom: 24,
        overflow: 'hidden',
        position: 'relative',
    },
    deco: {
        position: 'absolute',
        opacity: 0.25,
        zIndex: 0,
    },
    avatar: {
        width: 88, height: 88, borderRadius: 28,
        overflow: 'hidden',
        shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 10, elevation: 6,
        marginBottom: 14,
    },
    avatarImg: { width: '100%', height: '100%', resizeMode: 'cover' },
    userName: { fontSize: 22, fontWeight: '900', color: '#fff', marginBottom: 4 },
    userEmail: { fontSize: 13, color: 'rgba(255,255,255,0.8)' },

    // Menu card
    menuSection: {
        backgroundColor: '#fff', marginHorizontal: 20, borderRadius: 20,
        shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 3,
        overflow: 'hidden',
    },
    menuItem: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 18, paddingVertical: 16,
        borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
    },
    menuItemLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    menuIconBox: {
        width: 40, height: 40, borderRadius: 12,
        backgroundColor: '#f0fdf4',
        justifyContent: 'center', alignItems: 'center',
    },
    menuLabel: { fontSize: 15, fontWeight: '700', color: '#0f172a' },

    // Sign out
    signOutBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
        marginHorizontal: 20, marginTop: 20,
        backgroundColor: '#fef2f2', paddingVertical: 16, borderRadius: 16,
        borderWidth: 1.5, borderColor: '#fecaca',
    },
    signOutText: { fontSize: 15, fontWeight: '800', color: '#dc2626' },

    rewardWidget: {
        backgroundColor: '#fff', marginHorizontal: 20, borderRadius: 20,
        padding: 18, marginBottom: 16,
        shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 3,
        borderWidth: 1.5, borderColor: '#dcfce7',
    },
    rewardWidgetRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
    rewardWidgetTitle: { fontSize: 15, fontWeight: '900', color: '#0f172a' },
    rewardWidgetBadge: {
        backgroundColor: '#dcfce7', color: '#15803d', fontWeight: '900', fontSize: 13,
        paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
    },
    sliceRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
    rewardWidgetHint: { fontSize: 13, color: '#64748b', fontWeight: '600' },

    version: { textAlign: 'center', color: '#cbd5e1', fontSize: 12, marginTop: 20 },
    devBy: { textAlign: 'center', fontSize: 12, color: '#cbd5e1', marginTop: 4, marginBottom: 20 },
    devByLink: { color: '#22973a', fontWeight: '700', textDecorationLine: 'underline' },
});
