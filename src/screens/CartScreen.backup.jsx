import React, { useState, useCallback, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    Image, ScrollView, TextInput, StatusBar, Alert, ActivityIndicator,
    FlatList, Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { ArrowLeft, Trash2, Tag as TagIcon, Minus, Plus, MapPin, Banknote, Smartphone } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { isStoreOpen } from '../utils/storeStatus';
import PhonePePaymentSDK from 'react-native-phonepe-pg';

const { width } = Dimensions.get('window');
const ADDON_CARD_W = width * 0.38;

export default function CartScreen({ navigation }) {
    const {
        cartItems, subtotal, gst, discount, total, activeCoupon,
        updateQuantity, removeFromCart, applyCoupon, removeCoupon, clearCart
    } = useCart();
    const { user } = useAuth();

    const [couponInput, setCouponInput] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('phonepe'); // 'cash' | 'phonepe'
    const [codExtraCharge, setCodExtraCharge] = useState(0);
    const codFee = paymentMethod === 'cash' ? codExtraCharge : 0;
    const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
    const [isCheckingOut, setIsCheckingOut] = useState(false);
    const [activeAddress, setActiveAddress] = useState(null);
    const [minOrderAmount, setMinOrderAmount] = useState(0);
    const [availableAddons, setAvailableAddons] = useState([]);
    const [selectedAddons, setSelectedAddons] = useState([]);
    const [rewardSlices, setRewardSlices] = useState(0);
    const [rewardPizzaActive, setRewardPizzaActive] = useState(false);
    const [rewardEnabled, setRewardEnabled] = useState(true);
    const [slicesRequired, setSlicesRequired] = useState(6);
    const [freePizzaValue, setFreePizzaValue] = useState(250);
    const [minOrderForSlice, setMinOrderForSlice] = useState(300);
    const addonTotal = selectedAddons.reduce((s, a) => s + Number(a.price) * a.qty, 0);
    const effectiveSubtotal = subtotal + addonTotal;
    const rewardDiscount = rewardPizzaActive ? freePizzaValue : 0;
    const finalTotal = Math.max(0, total + codFee + addonTotal - rewardDiscount);

    useEffect(() => {
        supabase
            .from('store_settings')
            .select('value')
            .eq('key', 'min_order_amount')
            .maybeSingle()
            .then(({ data }) => { if (data?.value) setMinOrderAmount(Number(data.value)); });
    }, []);

    useEffect(() => {
        supabase.from('addons').select('*').eq('is_available', true)
            .order('is_veg', { ascending: false }).order('price', { ascending: true }).order('name', { ascending: true })
            .then(({ data }) => { if (data) setAvailableAddons(data); });
    }, []);

    useEffect(() => {
        if (!user?.id) return;
        supabase.from('profiles').select('reward_slices').eq('id', user.id).single()
            .then(({ data }) => setRewardSlices(data?.reward_slices ?? 0));
    }, [user?.id]);

    useEffect(() => {
        supabase.from('store_settings').select('key, value')
            .in('key', ['reward_enabled', 'reward_slices_required', 'reward_pizza_value', 'reward_min_order_total', 'cod_extra_charge'])
            .then(({ data }) => {
                const m = {};
                data?.forEach(r => { m[r.key] = r.value; });
                if (m.reward_enabled !== undefined) setRewardEnabled(m.reward_enabled !== 'false');
                if (m.reward_slices_required) setSlicesRequired(Number(m.reward_slices_required));
                if (m.reward_pizza_value) setFreePizzaValue(Number(m.reward_pizza_value));
                if (m.reward_min_order_total) setMinOrderForSlice(Number(m.reward_min_order_total));
                if (m.cod_extra_charge !== undefined) setCodExtraCharge(Number(m.cod_extra_charge));
            });
    }, []);

    useFocusEffect(
        useCallback(() => {
            const fetchAddress = async () => {
                try {
                    const data = await AsyncStorage.getItem('@pizza_addresses');
                    if (data) {
                        const parsed = JSON.parse(data);
                        if (parsed && parsed.length > 0) {
                            setActiveAddress(parsed[0]);
                        } else {
                            setActiveAddress(null);
                        }
                    } else {
                        setActiveAddress(null);
                    }
                } catch {
                    // address load failed — user will see "no address" UI
                }
            };
            fetchAddress();
        }, [])
    );

    // Shared validation + address fetch used by both payment paths
    const prepareCheckout = async () => {
        if (user?.id) {
            const { data: profileCheck } = await supabase
                .from('profiles')
                .select('is_blocked')
                .eq('id', user.id)
                .single();
            if (profileCheck?.is_blocked) {
                Alert.alert('Account Suspended', 'Your account has been suspended due to suspicious activity. Please contact support.');
                return null;
            }
        }
        if (!user || !user.id) {
            Alert.alert('Sign In Required', 'You must be logged in to place an order.');
            return null;
        }
        const { data: storeSettings } = await supabase
            .from('store_settings')
            .select('key, value')
            .in('key', ['store_open', 'opening_time', 'closing_time']);
        const settingsMap = {};
        storeSettings?.forEach(r => { settingsMap[r.key] = r.value; });
        if (!isStoreOpen(settingsMap.store_open, settingsMap.opening_time, settingsMap.closing_time)) {
            Alert.alert('Store Closed', "We're currently closed. Please check back during our operating hours.");
            return null;
        }
        if (cartItems.length === 0) {
            Alert.alert('Empty Cart', 'Add items to your cart before checking out.');
            return null;
        }
        if (total <= 0) {
            Alert.alert('Invalid Total', 'Order total must be greater than zero.');
            return null;
        }
        const addrData = await AsyncStorage.getItem('@pizza_addresses');
        const addresses = addrData ? JSON.parse(addrData) : [];
        const deliveryAddress = addresses.length > 0 ? addresses[0] : null;
        if (!deliveryAddress || !deliveryAddress.address) {
            Alert.alert(
                'Delivery Address Required',
                'Please add a delivery address before placing your order.',
                [
                    { text: 'Add Address', onPress: () => navigation.navigate('SavedAddresses') },
                    { text: 'Cancel', style: 'cancel' },
                ]
            );
            return null;
        }
        // Always fetch fresh at checkout so RLS failures on mount don't silently disable the check
        const { data: minSetting } = await supabase
            .from('store_settings')
            .select('value')
            .eq('key', 'min_order_amount')
            .maybeSingle();
        const effectiveMin = minSetting?.value ? Number(minSetting.value) : minOrderAmount;
        if (effectiveMin > 0 && effectiveSubtotal < effectiveMin) {
            const needed = effectiveMin - effectiveSubtotal;
            Alert.alert(
                'Minimum Order Required',
                `Minimum order amount is ₹${effectiveMin}. Add ₹${needed} more to place your order.`
            );
            return null;
        }
        // Use receiver details if user is ordering for someone outside the zone
        const receiverData = await AsyncStorage.getItem('@pizza_delivery_receiver');
        const receiver = receiverData ? JSON.parse(receiverData) : null;
        const safeName    = (receiver?.name  || deliveryAddress.name  || '').trim().slice(0, 100) || 'Customer';
        const safePhone   = (receiver?.phone || deliveryAddress.phone || '').replace(/[^\d+\-() ]/g, '').slice(0, 20);
        const safeAddress = (deliveryAddress.address || '').trim().slice(0, 300);
        const sanitizedItems = [
            ...cartItems.map(item => ({
                product_id:    item.product.id,
                product_name:  item.product.name.trim().slice(0, 150),
                size:          item.size.label,
                crust_name:    item.crust?.name || null,
                toppings_text: item.toppings?.length > 0 ? item.toppings.map(t => t.name).join(', ') : null,
                cheese_name:   item.cheese?.name || null,
                dips_text:     item.dips?.length > 0 ? item.dips.map(d => d.name).join(', ') : null,
                instructions:  item.instructions?.trim() || null,
                quantity:      Math.max(1, Math.min(item.qty, 50)),
                price:         Math.round(item.unitPrice * 100) / 100,
            })),
            ...selectedAddons.map(addon => ({
                product_id:    null,
                product_name:  addon.name,
                size:          'Add-on',
                crust_name:    null,
                toppings_text: null,
                cheese_name:   null,
                dips_text:     null,
                instructions:  null,
                quantity:      Math.max(1, Math.min(addon.qty, 50)),
                price:         Math.round(Number(addon.price) * 100) / 100,
            })),
        ];
        return { safeName, safePhone, safeAddress, sanitizedItems, deliveryAddress };
    };

    const addAddon = (addon) => {
        setSelectedAddons(prev => {
            const exists = prev.find(a => a.id === addon.id);
            return exists ? prev : [...prev, { ...addon, qty: 1 }];
        });
    };

    const updateAddonQty = (addonId, delta) => {
        setSelectedAddons(prev =>
            prev.map(a => a.id === addonId ? { ...a, qty: Math.max(1, a.qty + delta) } : a)
        );
    };

    const removeAddon = (addonId) => {
        setSelectedAddons(prev => prev.filter(a => a.id !== addonId));
    };

    const handleCheckout = async () => {
        const prepared = await prepareCheckout();
        if (!prepared) return;

        if (paymentMethod === 'phonepe') {
            await handlePhonePeCheckout(prepared);
        } else {
            await handleCashCheckout(prepared);
        }
    };

    const handleCashCheckout = async ({ safeName, safePhone, safeAddress, sanitizedItems, deliveryAddress }) => {
        setIsCheckingOut(true);
        try {
            const orderData = {
                customer_id:      user.id,
                customer_name:    safeName,
                customer_phone:   safePhone,
                delivery_address: safeAddress,
                subtotal:         Math.round(effectiveSubtotal * 100) / 100,
                gst:              Math.round(gst         * 100) / 100,
                delivery_charge:  codFee,
                discount:         Math.round((discount + rewardDiscount) * 100) / 100,
                total:            Math.round(finalTotal  * 100) / 100,
                payment_method:   'cash',
                payment_status:   'pending',
                promo_code:       activeCoupon || null,
                special_instructions: '',
                status:           'placed',
                created_at:       new Date().toISOString(),
            };

            const { data: insertedOrder, error: orderError } = await supabase
                .from('orders').insert([orderData]).select().single();
            if (orderError) {
                console.error('Order insert failed:', orderError);
                Alert.alert('Order Failed', orderError.message || 'Could not place your order. Please try again.');
                return;
            }

            const { error: itemsError } = await supabase.from('order_items').insert(
                sanitizedItems.map(item => ({ ...item, order_id: insertedOrder.id }))
            );
            if (itemsError) {
                console.error('Order items insert failed:', itemsError);
                Alert.alert('Order Failed', itemsError.message || 'Could not save order details. Please try again.');
                return;
            }

            if (rewardPizzaActive && user?.id) {
                await supabase.from('profiles')
                    .update({ reward_slices: Math.max(0, rewardSlices - slicesRequired) })
                    .eq('id', user.id);
            }

            await AsyncStorage.removeItem('@pizza_delivery_receiver');
            clearCart();
            navigation.replace('OrderSuccess', {
                orderId:      insertedOrder.display_id,
                total:        total,
                address:      safeAddress,
                addressTitle: deliveryAddress.title || 'Home',
                sliceEarned:  rewardEnabled && finalTotal >= minOrderForSlice,
            });
        } catch {
            Alert.alert('Error', 'Something went wrong. Please try again.');
        } finally {
            setIsCheckingOut(false);
        }
    };

    const handlePhonePeCheckout = async ({ safeName, safePhone, safeAddress, sanitizedItems, deliveryAddress }) => {
        setIsCheckingOut(true);
        let insertedOrder = null;
        try {
            // 1. Create draft order with payment_status: 'pending'
            const orderData = {
                customer_id:      user.id,
                customer_name:    safeName,
                customer_phone:   safePhone,
                delivery_address: safeAddress,
                subtotal:         Math.round(effectiveSubtotal * 100) / 100,
                gst:              Math.round(gst        * 100) / 100,
                delivery_charge:  0,
                discount:         Math.round((discount + rewardDiscount) * 100) / 100,
                total:            Math.round(finalTotal * 100) / 100,
                payment_method:   'phonepe',
                payment_status:   'pending',
                promo_code:       activeCoupon || null,
                special_instructions: '',
                status:           'placed',
                created_at:       new Date().toISOString(),
            };

            const { data: order, error: orderError } = await supabase
                .from('orders').insert([orderData]).select().single();
            if (orderError) {
                console.error('PhonePe order insert failed:', orderError);
                Alert.alert('Order Failed', orderError.message || 'Could not initiate order. Please try again.');
                return;
            }
            insertedOrder = order;

            const { error: itemsError } = await supabase.from('order_items').insert(
                sanitizedItems.map(item => ({ ...item, order_id: insertedOrder.id }))
            );
            if (itemsError) {
                console.error('PhonePe order items insert failed:', itemsError);
                Alert.alert('Order Failed', itemsError.message || 'Could not save order details. Please try again.');
                return;
            }

            // 2. Get PhonePe payload + checksum from Edge Function
            const amountInPaise = Math.round(finalTotal * 100);
            const { data: pgData, error: fnError } = await supabase.functions.invoke('create-phonepe-order', {
                body: {
                    orderId:    `PV${insertedOrder.display_id}`,
                    amount:     amountInPaise,
                    customerId: user.id,
                    phone:      safePhone,
                },
            });

            if (fnError || !pgData?.success) {
                throw new Error(pgData?.error || fnError?.message || 'Payment initiation failed');
            }

            const { token } = pgData;

            if (!token) {
                throw new Error('No order token received from payment gateway');
            }

                    // 3. Initialize PhonePe SDK and start native transaction flow
                    const sdkInit = await PhonePePaymentSDK.init(
                        process.env.PHONEPE_ENV === 'PRODUCTION' ? 'PRODUCTION' : 'SANDBOX',
                        process.env.PHONEPE_MERCHANT_ID || '',
                        user.id || '',
                        false
                    );

                    if (!sdkInit) {
                        throw new Error('PhonePe SDK initialization failed');
                    }

                    const sdkRequestPayload = JSON.stringify({
                        orderId: `PV${insertedOrder.display_id}`,
                        merchantId: process.env.PHONEPE_MERCHANT_ID || '',
                        token: token,
                        amount: amountInPaise,
                        paymentMode: { type: 'PAY_PAGE' },
                    });

                    // Base64-encode request body for the native SDK (fall back to Buffer when btoa unavailable)
                    let sdkRequestBase64;
                    try {
                        if (typeof btoa === 'function') {
                            sdkRequestBase64 = btoa(sdkRequestPayload);
                        } else {
                            const { Buffer } = await import('buffer');
                            sdkRequestBase64 = Buffer.from(sdkRequestPayload).toString('base64');
                        }
                    } catch (_) {
                        // Last resort: send raw JSON string (some SDK versions accept this)
                        sdkRequestBase64 = sdkRequestPayload;
                    }

                    const transactionResult = await PhonePePaymentSDK.startTransaction(
                        sdkRequestBase64,
                        null
                    );

                    if (!transactionResult || transactionResult.status !== 'SUCCESS') {
                        const message = transactionResult?.error || 'PhonePe transaction failed';
                        throw new Error(message);
                    }

                    // 4. Transaction flow returned — check if payment was confirmed by webhook
            const { data: orderStatus } = await supabase
                .from('orders')
                .select('payment_status')
                .eq('id', insertedOrder.id)
                .single();

            if (orderStatus?.payment_status === 'paid') {
                if (rewardPizzaActive && user?.id) {
                    await supabase.from('profiles')
                        .update({ reward_slices: Math.max(0, rewardSlices - slicesRequired) })
                        .eq('id', user.id);
                }
                await AsyncStorage.removeItem('@pizza_delivery_receiver');
                clearCart();
                navigation.replace('OrderSuccess', {
                    orderId:      insertedOrder.display_id,
                    total:        total,
                    address:      safeAddress,
                    addressTitle: deliveryAddress.title || 'Home',
                    sliceEarned:  rewardEnabled && finalTotal >= minOrderForSlice,
                });
            } else {
                // Mark order as cancelled (customers cannot delete — RLS blocks it)
                await supabase.from('orders')
                    .update({ status: 'cancelled', payment_status: 'failed' })
                    .eq('id', insertedOrder.id)
                    .eq('customer_id', user.id);
                Alert.alert('Payment Incomplete', 'Payment was not completed. Please try again.', [{ text: 'OK' }]);
            }
        } catch (error) {
            // Mark draft order as cancelled on unexpected error
            if (insertedOrder?.id) {
                await supabase.from('orders')
                    .update({ status: 'cancelled', payment_status: 'failed' })
                    .eq('id', insertedOrder.id)
                    .eq('customer_id', user.id);
            }
            Alert.alert('Payment Error', error?.message || 'Something went wrong. Please try again.');
        } finally {
            setIsCheckingOut(false);
        }
    };

    const handleApplyCoupon = async () => {
        const code = couponInput.trim().toUpperCase();
        if (!code) return;

        setIsApplyingCoupon(true);
        try {
            const { data, error } = await supabase
                .from('offers')
                .select('*')
                .eq('code', code)
                .eq('is_active', true)
                .single();

            if (error || !data) {
                Alert.alert('Invalid Coupon', 'This coupon code is not valid or is inactive.');
                return;
            }

            const now = new Date();
            if (data.valid_from && new Date(data.valid_from) > now) {
                Alert.alert('Not Yet Active', 'This coupon is not active yet.');
                return;
            }
            if (data.valid_to && new Date(data.valid_to) < now) {
                Alert.alert('Expired', 'This coupon has expired.');
                return;
            }
            if (data.max_uses && (data.current_uses || 0) >= data.max_uses) {
                Alert.alert('Limit Reached', 'This coupon has reached its usage limit.');
                return;
            }
            if (data.min_order_amount && subtotal < data.min_order_amount) {
                Alert.alert('Minimum Order', `This coupon requires a minimum order of ₹${data.min_order_amount}.`);
                return;
            }

            const discountAmount = data.discount_type === 'percentage'
                ? Math.round(subtotal * data.discount_value / 100)
                : data.discount_value;

            applyCoupon(code, discountAmount);
            setCouponInput('');
            Alert.alert('Coupon Applied!', `You save ₹${discountAmount} on this order.`);
        } catch {
            Alert.alert('Error', 'Could not verify coupon. Please try again.');
        } finally {
            setIsApplyingCoupon(false);
        }
    };

    if (cartItems.length === 0) {
        return (
            <SafeAreaView style={styles.safeContainer}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                        <ArrowLeft color="#fff" size={24} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>My Cart</Text>
                    <View style={{ width: 40 }} />
                </View>
                <View style={styles.emptyContainer}>
                    <Text style={{ fontSize: 64, marginBottom: 16 }}>🛒</Text>
                    <Text style={styles.emptyTitle}>Your cart is empty</Text>
                    <TouchableOpacity style={styles.browseBtn} onPress={() => navigation.navigate('MainTabs', { screen: 'MenuTab' })}>
                        <Text style={styles.browseBtnText}>Browse Menu</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.safeContainer}>
            <StatusBar barStyle="light-content" backgroundColor="#22973a" />
            
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <ArrowLeft color="#fff" size={24} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>My Cart</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} bounces={false}>

                {/* Cart Items */}
                {cartItems.map((item) => (
                    <View key={item.cartItemId} style={styles.cartCard}>
                        <View style={styles.cartImgWrapper}>
                            {item.product.image_url ? (
                                <Image source={{ uri: item.product.image_url }} style={styles.cartImg} />
                            ) : (
                                <View style={{ flex: 1, backgroundColor: '#f3feb0', justifyContent: 'center', alignItems: 'center' }}>
                                    <Text style={{ fontSize: 40 }}>🍕</Text>
                                </View>
                            )}
                        </View>
                        <View style={styles.cartInfo}>
                            <View style={styles.cartTopRow}>
                                <View style={{ flex: 1, paddingRight: 8 }}>
                                    <Text style={styles.cartItemName} numberOfLines={2}>{item.product.name}</Text>
                                    <Text style={styles.cartItemSize}>Size: <Text style={{fontWeight:'900', color: '#0f172a'}}>{item.size.label}</Text></Text>
                                    {item.crust && <Text style={styles.cartItemAddon}>Crust: {item.crust.name}</Text>}
                                    {item.toppings.length > 0 && (
                                        <Text style={styles.cartItemAddon} numberOfLines={1}>
                                            Extra: {item.toppings.map(t => t.name).join(', ')}
                                        </Text>
                                    )}
                                </View>
                                <TouchableOpacity onPress={() => removeFromCart(item.cartItemId)}>
                                    <Trash2 color="#ef4444" size={20} />
                                </TouchableOpacity>
                            </View>
                            
                            <View style={styles.cartBottomRow}>
                                <View style={styles.qtyContainer}>
                                    <TouchableOpacity style={styles.qtyBtn} onPress={() => updateQuantity(item.cartItemId, -1)}>
                                        <Minus size={16} color="#94a3b8" />
                                    </TouchableOpacity>
                                    <Text style={styles.qtyText}>{item.qty}</Text>
                                    <TouchableOpacity style={styles.qtyBtn} onPress={() => updateQuantity(item.cartItemId, 1)}>
                                        <Plus size={16} color="#94a3b8" />
                                    </TouchableOpacity>
                                </View>
                                <Text style={styles.cartItemPrice}>₹{item.unitPrice * item.qty}</Text>
                            </View>
                        </View>
                    </View>
                ))}

                {/* Selected Sides & Drinks — shown as cart line items too */}
                {selectedAddons.map((addon) => (
                    <View key={`addon-${addon.id}`} style={styles.cartCard}>
                        <View style={styles.cartImgWrapper}>
                            {addon.image_url ? (
                                <Image source={{ uri: addon.image_url }} style={styles.cartImg} />
                            ) : (
                                <View style={{ flex: 1, backgroundColor: '#f3feb0', justifyContent: 'center', alignItems: 'center' }}>
                                    <Text style={{ fontSize: 40 }}>🥤</Text>
                                </View>
                            )}
                        </View>
                        <View style={styles.cartInfo}>
                            <View style={styles.cartTopRow}>
                                <View style={{ flex: 1, paddingRight: 8 }}>
                                    <Text style={styles.cartItemName} numberOfLines={2}>{addon.name}</Text>
                                    <Text style={styles.cartItemSize}>Sides & Drinks</Text>
                                </View>
                                <TouchableOpacity onPress={() => removeAddon(addon.id)}>
                                    <Trash2 color="#ef4444" size={20} />
                                </TouchableOpacity>
                            </View>
                            <View style={styles.cartBottomRow}>
                                <View style={styles.qtyContainer}>
                                    <TouchableOpacity style={styles.qtyBtn} onPress={() => updateAddonQty(addon.id, -1)}>
                                        <Minus size={16} color="#94a3b8" />
                                    </TouchableOpacity>
                                    <Text style={styles.qtyText}>{addon.qty}</Text>
                                    <TouchableOpacity style={styles.qtyBtn} onPress={() => updateAddonQty(addon.id, 1)}>
                                        <Plus size={16} color="#94a3b8" />
                                    </TouchableOpacity>
                                </View>
                                <Text style={styles.cartItemPrice}>₹{addon.price * addon.qty}</Text>
                            </View>
                        </View>
                    </View>
                ))}

                {/* Sides & Drinks */}
                {availableAddons.length > 0 && (
                    <View style={styles.addonSection}>
                        <Text style={styles.addonSectionTitle}>🥤 Sides & Drinks</Text>
                        <Text style={styles.addonSectionSub}>Add something on the side</Text>
                        <FlatList
                            data={availableAddons}
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            keyExtractor={item => item.id}
                            contentContainerStyle={{ paddingRight: 8, paddingTop: 4 }}
                            snapToInterval={ADDON_CARD_W + 12}
                            decelerationRate="fast"
                            renderItem={({ item: addon }) => {
                                const selectedEntry = selectedAddons.find(a => a.id === addon.id);
                                return (
                                    <View style={styles.addonCard}>
                                        <View style={styles.addonImgWrap}>
                                            {addon.image_url
                                                ? <Image source={{ uri: addon.image_url }} style={styles.addonImg} />
                                                : <View style={styles.addonImgPlaceholder}><Text style={{ fontSize: 32 }}>🥤</Text></View>
                                            }
                                            <View style={[styles.vegMark, { borderColor: addon.is_veg ? '#22973a' : '#EF4444' }]}>
                                                <View style={[styles.vegMarkDot, { backgroundColor: addon.is_veg ? '#22973a' : '#EF4444' }]} />
                                            </View>
                                        </View>
                                        <Text style={styles.addonCardName} numberOfLines={1}>{addon.name}</Text>
                                        <View style={styles.addonCardFooter}>
                                            <Text style={styles.addonCardPrice}>+₹{addon.price}</Text>
                                            {selectedEntry ? (
                                                <View style={styles.addonQtyStepper}>
                                                    <TouchableOpacity style={styles.addonQtyBtn} onPress={() => updateAddonQty(addon.id, -1)}>
                                                        <Minus size={12} color="#22973a" />
                                                    </TouchableOpacity>
                                                    <Text style={styles.addonQtyText}>{selectedEntry.qty}</Text>
                                                    <TouchableOpacity style={styles.addonQtyBtn} onPress={() => updateAddonQty(addon.id, 1)}>
                                                        <Plus size={12} color="#22973a" />
                                                    </TouchableOpacity>
                                                </View>
                                            ) : (
                                                <TouchableOpacity
                                                    style={styles.addonAddBtn}
                                                    onPress={() => addAddon(addon)}
                                                    activeOpacity={0.8}
                                                >
                                                    <Text style={styles.addonAddBtnText}>ADD</Text>
                                                </TouchableOpacity>
                                            )}
                                        </View>
                                    </View>
                                );
                            }}
                        />
                    </View>
                )}

                {/* Free Pizza Reward Redemption */}
                {rewardEnabled && rewardSlices >= slicesRequired && (
                    <View style={styles.rewardSection}>
                        <View style={styles.rewardHeaderRow}>
                            <Text style={styles.rewardTitle}>🍕 Free Pizza Reward</Text>
                            <View style={styles.rewardBadge}>
                                <Text style={styles.rewardBadgeText}>{slicesRequired}/{slicesRequired} Slices</Text>
                            </View>
                        </View>
                        <Text style={styles.rewardDesc}>
                            You have collected all {slicesRequired} slices! Redeem a free pizza worth ₹{freePizzaValue} on this order.
                        </Text>
                        <TouchableOpacity
                            style={[styles.rewardToggleBtn, rewardPizzaActive && styles.rewardToggleBtnActive]}
                            onPress={() => setRewardPizzaActive(prev => !prev)}
                            activeOpacity={0.85}
                        >
                            <Text style={[styles.rewardToggleBtnText, rewardPizzaActive && styles.rewardToggleBtnTextActive]}>
                                {rewardPizzaActive ? `✓  Free Pizza Applied  −₹${freePizzaValue}` : 'Tap to Redeem Free Pizza'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Apply Coupon */}
                <View style={styles.couponSection}>
                    <View style={styles.couponHeader}>
                        <TagIcon color="#00b050" size={18} />
                        <Text style={styles.couponTitle}>Apply Coupon</Text>
                    </View>
                    <View style={styles.couponInputRow}>
                        <TextInput
                            style={styles.couponInput}
                            placeholder="Enter coupon code"
                            placeholderTextColor="#94a3b8"
                            value={couponInput}
                            onChangeText={setCouponInput}
                            autoCapitalize="characters"
                            editable={!activeCoupon}
                        />
                        {activeCoupon ? (
                            <TouchableOpacity style={[styles.couponApplyBtn, { backgroundColor: '#ef4444' }]} onPress={removeCoupon}>
                                <Text style={styles.couponApplyBtnText}>REMOVE</Text>
                            </TouchableOpacity>
                        ) : (
                            <TouchableOpacity style={styles.couponApplyBtn} onPress={handleApplyCoupon} disabled={isApplyingCoupon}>
                                {isApplyingCoupon
                                    ? <ActivityIndicator size="small" color="#0f172a" />
                                    : <Text style={styles.couponApplyBtnText}>APPLY</Text>
                                }
                            </TouchableOpacity>
                        )}
                    </View>
                    {activeCoupon && (
                        <Text style={[styles.couponHint, { color: '#00b050', fontWeight: '700' }]}>
                            ✓ Coupon <Text style={{fontWeight:'900'}}>{activeCoupon}</Text> applied — you save ₹{discount}
                        </Text>
                    )}
                </View>

                {/* Bill Details */}
                <View style={styles.billSection}>
                    <Text style={styles.billTitle}>Bill Details</Text>
                    
                    <View style={styles.billRow}>
                        <Text style={styles.billLabel}>Subtotal</Text>
                        <Text style={styles.billValue}>₹{effectiveSubtotal}</Text>
                    </View>
                    {discount > 0 && (
                        <View style={styles.billRow}>
                            <Text style={[styles.billLabel, { color: '#00b050' }]}>Discount</Text>
                            <Text style={[styles.billValue, { color: '#00b050' }]}>-₹{discount}</Text>
                        </View>
                    )}
                    <View style={styles.billRow}>
                        <Text style={styles.billLabel}>GST (5%)</Text>
                        <Text style={styles.billValue}>₹{gst}</Text>
                    </View>
                    {codFee > 0 && (
                        <View style={styles.billRow}>
                            <Text style={styles.billLabel}>COD Handling Fee</Text>
                            <Text style={styles.billValue}>₹{codFee}</Text>
                        </View>
                    )}
                    {rewardDiscount > 0 && (
                        <View style={styles.billRow}>
                            <Text style={[styles.billLabel, { color: '#7c3aed' }]}>🍕 Free Pizza Reward</Text>
                            <Text style={[styles.billValue, { color: '#7c3aed' }]}>−₹{rewardDiscount}</Text>
                        </View>
                    )}

                    <View style={styles.divider} />

                    <View style={[styles.billRow, { marginTop: 12 }]}>
                        <Text style={styles.totalLabel}>Total</Text>
                        <Text style={styles.totalValue}>₹{finalTotal}</Text>
                    </View>
                </View>

                {/* Minimum Order Banner */}
                {minOrderAmount > 0 && effectiveSubtotal < minOrderAmount && (
                    <View style={[styles.minOrderBanner, styles.minOrderBannerWarn]}>
                        <Text style={[styles.minOrderBannerText, { color: '#92400e' }]}>
                            ⚠ Add ₹{minOrderAmount - effectiveSubtotal} more · Min. order ₹{minOrderAmount}
                        </Text>
                    </View>
                )}

                {/* Delivery Address Selector */}
                <View style={styles.addressSection}>
                    <View style={styles.addressHeaderRow}>
                        <Text style={styles.addressTitle}>Delivery Address</Text>
                        <TouchableOpacity onPress={() => navigation.navigate('SavedAddresses')}>
                            <Text style={styles.changeAddressText}>{activeAddress ? 'CHANGE' : 'ADD ADDRESS'}</Text>
                        </TouchableOpacity>
                    </View>

                    {activeAddress ? (
                        <View>
                            <View style={styles.addressCard}>
                                <View style={styles.addressIconBox}>
                                    <MapPin color="#22973a" size={20} />
                                </View>
                                <View style={styles.addressInfo}>
                                    <Text style={styles.addressName}>{activeAddress.title}</Text>
                                    <Text style={styles.addressText} numberOfLines={2}>{activeAddress.address}</Text>
                                </View>
                            </View>

                        </View>
                    ) : (
                        <TouchableOpacity style={styles.noAddressCard} onPress={() => navigation.navigate('SavedAddresses')}>
                            <MapPin color="#94a3b8" size={24} />
                            <Text style={styles.noAddressText}>No address selected. Tap to add.</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {/* Payment Method */}
                <View style={styles.paymentSection}>
                    <Text style={styles.paymentTitle}>Payment Method</Text>
                    <View style={styles.paymentToggle}>
                        <TouchableOpacity
                            style={[styles.paymentPill, paymentMethod === 'phonepe' && styles.paymentPillActive]}
                            onPress={() => setPaymentMethod('phonepe')}
                            activeOpacity={0.8}
                        >
                            <Smartphone size={18} color={paymentMethod === 'phonepe' ? '#fff' : '#64748b'} />
                            <Text style={[styles.paymentPillText, paymentMethod === 'phonepe' && styles.paymentPillTextActive]}>
                                Pay Online
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.paymentPill, paymentMethod === 'cash' && styles.paymentPillActive]}
                            onPress={() => setPaymentMethod('cash')}
                            activeOpacity={0.8}
                        >
                            <Banknote size={18} color={paymentMethod === 'cash' ? '#fff' : '#64748b'} />
                            <Text style={[styles.paymentPillText, paymentMethod === 'cash' && styles.paymentPillTextActive]}>
                                Cash on Delivery
                            </Text>
                        </TouchableOpacity>
                    </View>
                    {paymentMethod === 'cash' && codExtraCharge > 0 && (
                        <Text style={styles.codFeeNote}>+ ₹{codExtraCharge} handling fee applies for Cash on Delivery</Text>
                    )}
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>

            <View style={styles.checkoutFooter}>
                <TouchableOpacity
                    style={styles.checkoutBtn}
                    onPress={handleCheckout}
                    disabled={isCheckingOut}
                >
                    {isCheckingOut
                        ? <ActivityIndicator color="#fff" />
                        : <Text style={styles.checkoutBtnText}>
                            PROCEED TO CHECKOUT  ₹{finalTotal}
                          </Text>
                    }
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeContainer: { flex: 1, backgroundColor: '#f1f5f9' },
    header: {
        backgroundColor: '#22973a', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 20, height: 60,
    },
    backBtn: {
        width: 40, height: 40, justifyContent: 'center', alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20,
    },
    headerTitle: { fontSize: 22, fontWeight: '900', color: '#ffffff' },
    scrollContent: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40 },
    // Cart Cards
    cartCard: {
        flexDirection: 'row', backgroundColor: '#ffffff', borderRadius: 20, padding: 12, marginBottom: 16,
        shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
    },
    cartImgWrapper: {
        width: 100, height: 100, borderRadius: 16, backgroundColor: '#f3feb0', overflow: 'hidden',
    },
    cartImg: { width: '100%', height: '100%', resizeMode: 'cover' },
    cartInfo: { flex: 1, marginLeft: 14, justifyContent: 'space-between' },
    cartTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    cartItemName: { fontSize: 16, fontWeight: '900', color: '#0f172a' },
    cartItemSize: { fontSize: 12, color: '#64748b', marginTop: 4 },
    cartItemAddon: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
    cartBottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
    qtyContainer: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: '#f0fdf4', borderRadius: 24, padding: 3,
    },
    qtyBtn: {
        width: 28, height: 28, backgroundColor: '#ffffff', borderRadius: 14,
        justifyContent: 'center', alignItems: 'center',
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1,
    },
    qtyText: { fontSize: 14, fontWeight: '900', color: '#0f172a', paddingHorizontal: 12 },
    cartItemPrice: { fontSize: 18, fontWeight: '900', color: '#00b050' },
    // Coupon Section
    couponSection: {
        backgroundColor: '#ffffff', borderRadius: 20, padding: 20, marginBottom: 16,
        shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
    },
    couponHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    couponTitle: { fontSize: 16, fontWeight: '900', color: '#0f172a', marginLeft: 8 },
    couponInputRow: { flexDirection: 'row', alignItems: 'center' },
    couponInput: {
        flex: 1, height: 50, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12,
        paddingHorizontal: 16, fontSize: 14, color: '#0f172a', marginRight: 12,
    },
    couponApplyBtn: { backgroundColor: '#ffc000', height: 50, paddingHorizontal: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    couponApplyBtnText: { color: '#0f172a', fontWeight: '900', fontSize: 14, letterSpacing: 0.5 },
    couponHint: { fontSize: 12, color: '#64748b', marginTop: 10 },
    // Bill Details
    billSection: {
        backgroundColor: '#ffffff', borderRadius: 20, padding: 20,
        shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
    },
    billTitle: { fontSize: 16, fontWeight: '900', color: '#0f172a', marginBottom: 16 },
    billRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
    billLabel: { fontSize: 14, color: '#64748b' },
    billValue: { fontSize: 14, fontWeight: '800', color: '#0f172a' },
    divider: { height: 1, borderWidth: 1, borderColor: '#e2e8f0', borderStyle: 'dashed', marginVertical: 4 },
    totalLabel: { fontSize: 18, fontWeight: '900', color: '#0f172a' },
    totalValue: { fontSize: 22, fontWeight: '900', color: '#00b050' },
    // Footer
    checkoutFooter: { paddingHorizontal: 20, paddingVertical: 16, backgroundColor: '#f1f5f9' },
    checkoutBtn: {
        backgroundColor: '#00b050', height: 60, borderRadius: 20, justifyContent: 'center', alignItems: 'center',
        shadowColor: '#00b050', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
    },
    checkoutBtnText: { color: '#ffffff', fontWeight: '900', fontSize: 16, letterSpacing: 1 },
    // Empty State
    emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    emptyTitle: { fontSize: 22, fontWeight: '900', color: '#0f172a', marginTop: 16, marginBottom: 20 },
    browseBtn: { backgroundColor: '#22973a', paddingHorizontal: 30, paddingVertical: 14, borderRadius: 14 },
    browseBtnText: { color: '#ffffff', fontWeight: '900', fontSize: 14 },
    // Address Section
    addressSection: {
        backgroundColor: '#ffffff', borderRadius: 20, padding: 20, marginTop: 16,
        shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
    },
    addressHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    addressTitle: { fontSize: 16, fontWeight: '900', color: '#0f172a' },
    changeAddressText: { fontSize: 13, fontWeight: '800', color: '#00b050' },
    addressCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0' },
    addressIconBox: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#dcfce7', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    addressInfo: { flex: 1 },
    addressName: { fontSize: 14, fontWeight: '800', color: '#0f172a', marginBottom: 2 },
    addressText: { fontSize: 13, color: '#64748b' },
    relocateBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#dcfce7', borderRadius: 12, padding: 12, marginTop: 12, borderWidth: 1, borderColor: '#22973a', gap: 8 },
    relocateBtnText: { fontSize: 13, fontWeight: '800', color: '#22973a', letterSpacing: 0.5 },
    noAddressCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', borderStyle: 'dashed' },
    noAddressText: { fontSize: 14, fontWeight: '600', color: '#64748b', marginLeft: 12 },
    // Payment Method Section
    paymentSection: {
        backgroundColor: '#ffffff', borderRadius: 20, padding: 20, marginTop: 16,
        shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
    },
    paymentTitle: { fontSize: 16, fontWeight: '900', color: '#0f172a', marginBottom: 12 },
    paymentToggle: { flexDirection: 'row', gap: 10 },
    paymentPill: {
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: 8, paddingVertical: 14, borderRadius: 14,
        backgroundColor: '#f8fafc', borderWidth: 1.5, borderColor: '#e2e8f0',
    },
    paymentPillActive: { backgroundColor: '#22973a', borderColor: '#22973a' },
    paymentPillText: { fontSize: 13, fontWeight: '700', color: '#64748b' },
    paymentPillTextActive: { color: '#ffffff' },
    codFeeNote: { fontSize: 12, color: '#f97316', fontWeight: '600', marginTop: 8, textAlign: 'center' },
    minOrderBanner: { borderRadius: 14, paddingVertical: 12, paddingHorizontal: 16, marginTop: 12, alignItems: 'center' },
    minOrderBannerWarn: { backgroundColor: '#fef3c7', borderWidth: 1, borderColor: '#fcd34d' },
    minOrderBannerText: { fontSize: 13, fontWeight: '800' },
    // Sides & Drinks (Addons)
    addonSection: {
        backgroundColor: '#fff', borderRadius: 20, padding: 20, marginBottom: 16,
        shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
    },
    addonSectionTitle: { fontSize: 16, fontWeight: '900', color: '#0f172a', marginBottom: 4 },
    addonSectionSub: { fontSize: 12, color: '#64748b', fontWeight: '600', marginBottom: 14 },
    addonCard: {
        width: ADDON_CARD_W,
        backgroundColor: '#f8fafc',
        borderRadius: 16,
        overflow: 'hidden',
        marginRight: 12,
        borderWidth: 1.5, borderColor: '#e2e8f0',
    },
    addonImgWrap: { width: '100%', height: 90, backgroundColor: '#f3feb0', position: 'relative' },
    addonImg: { width: '100%', height: '100%', resizeMode: 'cover' },
    addonImgPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f3feb0' },
    vegMark: {
        position: 'absolute', top: 8, left: 8,
        width: 15, height: 15, borderRadius: 3, borderWidth: 1.5, backgroundColor: '#fff',
        justifyContent: 'center', alignItems: 'center',
    },
    vegMarkDot: { width: 7, height: 7, borderRadius: 3.5 },
    addonCardName: { fontSize: 13, fontWeight: '800', color: '#0f172a', marginHorizontal: 10, marginTop: 8 },
    addonCardFooter: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        marginHorizontal: 10, marginTop: 6, marginBottom: 10,
    },
    addonCardPrice: { fontSize: 13, fontWeight: '800', color: '#64748b' },
    addonAddBtn: {
        paddingHorizontal: 12, paddingVertical: 5, borderRadius: 10,
        backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#22973a',
    },
    addonAddBtnText: { fontSize: 11, fontWeight: '900', color: '#22973a', letterSpacing: 0.5 },
    addonQtyStepper: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: '#f0fdf4', borderRadius: 10, borderWidth: 1.5, borderColor: '#22973a',
        paddingHorizontal: 6, paddingVertical: 3,
    },
    addonQtyBtn: { padding: 2 },
    addonQtyText: { fontSize: 12, fontWeight: '900', color: '#0f172a', minWidth: 14, textAlign: 'center' },
    // Free Pizza Reward
    rewardSection: {
        backgroundColor: '#faf5ff', borderRadius: 20, padding: 18, marginBottom: 16,
        borderWidth: 1.5, borderColor: '#e9d5ff',
        shadowColor: '#7c3aed', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 2,
    },
    rewardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    rewardTitle: { fontSize: 16, fontWeight: '900', color: '#581c87' },
    rewardBadge: { backgroundColor: '#ede9fe', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
    rewardBadgeText: { fontSize: 12, fontWeight: '900', color: '#7c3aed' },
    rewardDesc: { fontSize: 13, color: '#6b21a8', fontWeight: '600', lineHeight: 18, marginBottom: 14 },
    rewardToggleBtn: {
        backgroundColor: '#fff', borderWidth: 2, borderColor: '#c4b5fd', borderRadius: 14,
        paddingVertical: 14, alignItems: 'center',
    },
    rewardToggleBtnActive: { backgroundColor: '#7c3aed', borderColor: '#7c3aed' },
    rewardToggleBtnText: { fontSize: 14, fontWeight: '900', color: '#7c3aed', letterSpacing: 0.3 },
    rewardToggleBtnTextActive: { color: '#fff' },
});
