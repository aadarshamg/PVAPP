import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView, StatusBar, Image, Linking, Alert, ActivityIndicator
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';

const LOGO = require('../../assets/images/logo.png');
import { useAuth } from '../contexts/AuthContext';
import { useStore } from '../contexts/StoreContext';
import { useCart } from '../contexts/CartContext';

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
import { Package, MapPin, Tag, HelpCircle, Info, ChevronRight, LogOut, Trash2 } from 'lucide-react-native';

export default function ProfileScreen({ navigation }) {
    const { user, signOut, deleteAccount } = useAuth();
    const { selectedStore, setSelectedStore } = useStore();
    const { cartCount, clearCart } = useCart();
    const [deletingAccount, setDeletingAccount] = useState(false);
    const [rewardSlices, setRewardSlices] = useState(null);
    const [rewardEnabled, setRewardEnabled] = useState(true);
    const [slicesRequired, setSlicesRequired] = useState(6);
    const [freePizzaValue, setFreePizzaValue] = useState(250);

    const fetchSlices = useCallback(() => {
        if (!user?.id) return;
        supabase.from('profiles').select('reward_slices').eq('id', user.id).single()
            .then(({ data }) => setRewardSlices(data?.reward_slices ?? 0));
    }, [user?.id]);

    useEffect(() => { fetchSlices(); }, [fetchSlices]);

    useFocusEffect(useCallback(() => { fetchSlices(); }, [fetchSlices]));

    useEffect(() => {
        supabase.from('store_settings').select('key, value')
            .in('key', ['reward_enabled', 'reward_slices_required', 'reward_pizza_value'])
            .then(({ data }) => {
                const m = {};
                data?.forEach(r => { m[r.key] = r.value; });
                if (m.reward_enabled !== undefined) setRewardEnabled(m.reward_enabled !== 'false');
                if (m.reward_slices_required) setSlicesRequired(Number(m.reward_slices_required));
                if (m.reward_pizza_value) setFreePizzaValue(Number(m.reward_pizza_value));
            });
    }, []);

    const switchStore = async () => {
        clearCart();
        await setSelectedStore(null);
        navigation.navigate('StoreSelect');
    };

    const handleChangeStore = () => {
        if (cartCount > 0) {
            Alert.alert(
                'Switch Location?',
                'Switching locations will clear your cart since menu items differ by store.',
                [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Switch', style: 'destructive', onPress: switchStore },
                ]
            );
        } else {
            switchStore();
        }
    };

    const handleDeleteAccount = () => {
        Alert.alert(
            'Delete Your Account?',
            'This permanently deletes your Pizza Virus account, including your saved addresses, Pizza Rewards balance, and login access. This cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Continue',
                    style: 'destructive',
                    onPress: () => {
                        // Second, explicit confirmation — this is irreversible.
                        Alert.alert(
                            'Are You Absolutely Sure?',
                            'Your account will be deleted immediately and cannot be recovered.',
                            [
                                { text: 'Cancel', style: 'cancel' },
                                {
                                    text: 'Delete My Account',
                                    style: 'destructive',
                                    onPress: async () => {
                                        setDeletingAccount(true);
                                        try {
                                            await deleteAccount();
                                            // signOut() inside deleteAccount() clears the session;
                                            // App.js's Root() switches to the auth flow automatically.
                                        } catch (error) {
                                            Alert.alert('Could Not Delete Account', error.message || 'Something went wrong. Please try again or contact support.');
                                            setDeletingAccount(false);
                                        }
                                    },
                                },
                            ]
                        );
                    },
                },
            ]
        );
    };

    const menuItems = [
        { label: 'My Orders',        icon: Package,     screen: 'OrderHistory' },
        { label: 'Saved Addresses',  icon: MapPin,       screen: 'SavedAddresses' },
        { label: 'Offers & Coupons', icon: Tag,          screen: 'Offers' },
        { label: 'Help & Support',   icon: HelpCircle,   screen: 'Support' },
        { label: 'About',            icon: Info,         screen: 'About' },
    ];

    return (
        <SafeAreaView style={styles.safe} edges={['left', 'right']}>
            <StatusBar barStyle="light-content" />
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>

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
                    <SafeAreaView edges={['top']}>
                        <View style={{ alignItems: 'center', zIndex: 1 }}>
                            <View style={styles.avatar}>
                                <Image source={LOGO} style={styles.avatarImg} />
                            </View>
                            <Text style={styles.userName}>{user?.user_metadata?.name || 'Pizza Lover'}</Text>
                            <Text style={styles.userEmail}>{formatPhone(user?.email)}</Text>
                        </View>
                    </SafeAreaView>
                </View>

                {/* Reward Widget */}
                {rewardEnabled && rewardSlices !== null && (
                    <View style={styles.rewardWidget}>
                        <View style={styles.rewardWidgetRow}>
                            <Text style={styles.rewardWidgetTitle}>🍕 Pizza Rewards</Text>
                            <Text style={styles.rewardWidgetBadge}>{Math.min(rewardSlices, slicesRequired)}/{slicesRequired}</Text>
                        </View>
                        <View style={styles.sliceRow}>
                            {Array.from({ length: slicesRequired }, (_, i) => (
                                <Text key={i} style={{ fontSize: slicesRequired > 6 ? 22 : 28 }}>{i < rewardSlices ? '🍕' : '⬜'}</Text>
                            ))}
                        </View>
                        {rewardSlices >= slicesRequired ? (
                            <>
                                <Text style={[styles.rewardWidgetHint, { color: '#7c3aed', fontWeight: '800' }]}>
                                    🎉 You've earned a free pizza worth ₹{freePizzaValue}!
                                </Text>
                                <TouchableOpacity
                                    style={styles.redeemBtn}
                                    onPress={() => navigation.navigate('CartTab')}
                                    activeOpacity={0.85}
                                >
                                    <Text style={styles.redeemBtnText}>Redeem at Checkout →</Text>
                                </TouchableOpacity>
                            </>
                        ) : (
                            <Text style={styles.rewardWidgetHint}>
                                {(() => {
                                    const rem = slicesRequired - Math.min(rewardSlices, slicesRequired);
                                    return `${rem} more ${rem === 1 ? 'slice' : 'slices'} to earn a free pizza`;
                                })()}
                            </Text>
                        )}
                    </View>
                )}

                {/* Delivering From — store switcher */}
                <TouchableOpacity style={styles.storeRow} onPress={handleChangeStore} activeOpacity={0.8}>
                    <View style={styles.menuItemLeft}>
                        <View style={styles.menuIconBox}>
                            <MapPin size={20} color="#22973a" />
                        </View>
                        <View>
                            <Text style={styles.storeRowLabel}>Delivering from</Text>
                            <Text style={styles.storeRowName}>{selectedStore?.name || 'Select a store'}</Text>
                        </View>
                    </View>
                    <ChevronRight size={18} color="#cbd5e1" />
                </TouchableOpacity>

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

                {/* Delete Account — kept discoverable but visually quiet, separate from Sign Out */}
                <TouchableOpacity
                    style={styles.deleteAccountBtn}
                    onPress={handleDeleteAccount}
                    activeOpacity={0.7}
                    disabled={deletingAccount}
                >
                    {deletingAccount ? (
                        <ActivityIndicator size="small" color="#94a3b8" />
                    ) : (
                        <>
                            <Trash2 size={14} color="#94a3b8" />
                            <Text style={styles.deleteAccountText}>Delete Account</Text>
                        </>
                    )}
                </TouchableOpacity>

                <Text style={styles.version}>Pizza Virus v2.0.1</Text>
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

    // Delivering From row
    storeRow: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        backgroundColor: '#fff', marginHorizontal: 20, marginBottom: 16,
        borderRadius: 20, paddingHorizontal: 18, paddingVertical: 14,
        shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 3,
        borderWidth: 1.5, borderColor: '#dcfce7',
    },
    storeRowLabel: { fontSize: 11, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.4 },
    storeRowName: { fontSize: 15, fontWeight: '900', color: '#0f172a', marginTop: 2 },

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

    // Delete account — deliberately quieter than Sign Out (destructive, irreversible),
    // but still a real, tappable, discoverable control per Apple's account-deletion requirement.
    deleteAccountBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
        marginHorizontal: 20, marginTop: 14, paddingVertical: 10,
    },
    deleteAccountText: { fontSize: 13, fontWeight: '700', color: '#94a3b8' },

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
    rewardWidgetHint: { fontSize: 13, color: '#64748b', fontWeight: '600', marginBottom: 2 },
    redeemBtn: {
        marginTop: 12, backgroundColor: '#7c3aed', borderRadius: 14,
        paddingVertical: 13, alignItems: 'center',
    },
    redeemBtnText: { fontSize: 14, fontWeight: '900', color: '#fff', letterSpacing: 0.3 },

    version: { textAlign: 'center', color: '#cbd5e1', fontSize: 12, marginTop: 20 },
    devBy: { textAlign: 'center', fontSize: 12, color: '#cbd5e1', marginTop: 4, marginBottom: 20 },
    devByLink: { color: '#22973a', fontWeight: '700', textDecorationLine: 'underline' },
});
