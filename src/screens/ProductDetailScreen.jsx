import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    Image, SafeAreaView, Alert
} from 'react-native';
import { supabase } from '../lib/supabase';
import { useCart } from '../contexts/CartContext';
import { ArrowLeft, Minus, Plus } from 'lucide-react-native';

export default function ProductDetailScreen({ route, navigation }) {
    const { product } = route.params;
    const { addToCart } = useCart();

    // Default size is first available, we'll try medium first.
    const [selectedSize, setSelectedSize] = useState('medium');
    const [crusts, setCrusts] = useState([]);
    const [selectedCrust, setSelectedCrust] = useState(null);
    const [toppings, setToppings] = useState([]);
    const [selectedToppings, setSelectedToppings] = useState([]);
    const [quantity, setQuantity] = useState(1);

    useEffect(() => {
        fetchCustomizations();
    }, []);

    const fetchCustomizations = async () => {
        const [crustRes, toppingRes] = await Promise.all([
            supabase.from('crusts').select('*').eq('product_id', product.id),
            supabase.from('toppings').select('*').eq('is_available', true),
        ]);
        if (crustRes.data) {
            setCrusts(crustRes.data);
            if (crustRes.data.length > 0) setSelectedCrust(crustRes.data[0]);
        }
        if (toppingRes.data) setToppings(toppingRes.data);
    };

    // Filter available sizes safely based on null base prices
    const sizes = [
        product.base_price_small && { key: 'small', label: 'Small', price: product.base_price_small, size: '7"' },
        product.base_price_medium && { key: 'medium', label: 'Medium', price: product.base_price_medium, size: '10"' },
        product.base_price_large && { key: 'large', label: 'Large', price: product.base_price_large, size: '13"' },
    ].filter(Boolean);

    useEffect(() => {
        // Fallback default size if medium isn't present
        if (sizes.length > 0 && !sizes.find(s => s.key === selectedSize)) {
            setSelectedSize(sizes[0].key);
        }
    }, [sizes]);

    const toggleTopping = (topping) => {
        setSelectedToppings(prev => {
            const exists = prev.find(t => t.id === topping.id);
            if (exists) return prev.filter(t => t.id !== topping.id);
            return [...prev, topping];
        });
    };

    const getBasePrice = () => {
        const size = sizes.find(s => s.key === selectedSize);
        return Number(size?.price || 0);
    };

    const getTotalPrice = () => {
        let total = getBasePrice();
        if (selectedCrust) total += Number(selectedCrust.price || 0);
        selectedToppings.forEach(t => { total += Number(t.price || 0); });
        return total * quantity;
    };

    const handleAddToCart = () => {
        const sizeObj = sizes.find(s => s.key === selectedSize);
        if (!sizeObj) return;

        addToCart(product, sizeObj, selectedCrust, selectedToppings, quantity, getTotalPrice());

        Alert.alert('Added to Cart!', `${quantity}x ${product.name} (₹${getTotalPrice()})`, [
            { text: 'Keep Browsing', onPress: () => navigation.goBack() },
            { text: 'Go to Cart', onPress: () => navigation.navigate('Cart') },
        ]);
    };

    const activeSizeObj = sizes.find(s => s.key === selectedSize);

    return (
        <SafeAreaView style={styles.safe}>
            <ScrollView style={styles.container} showsVerticalScrollIndicator={false} bounces={false}>
                {/* Product Image */}
                <View style={styles.imageContainer}>
                    {product.image_url ? (
                        <Image source={{ uri: product.image_url }} style={styles.image} />
                    ) : (
                        <View style={styles.imagePlaceholder}>
                            <Text style={{ fontSize: 80 }}>🍕</Text>
                        </View>
                    )}

                    <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                        <ArrowLeft color="#111827" size={24} />
                    </TouchableOpacity>

                    <View style={[styles.typeIconIndicator, { borderColor: product.is_veg ? '#48d23c' : '#EF4444' }]}>
                        <View style={[styles.typeIconDot, { backgroundColor: product.is_veg ? '#48d23c' : '#EF4444' }]} />
                    </View>
                </View>

                <View style={styles.content}>
                    {/* Title & Description */}
                    <Text style={styles.name}>{product.name}</Text>
                    <Text style={styles.category}>{product.category?.name}</Text>
                    <Text style={styles.description}>
                        {product.description || 'Delicious freshly baked pizza with extra cheese and Italian herbs.'}
                    </Text>

                    {/* Size Selection */}
                    {sizes.length > 0 && (
                        <>
                            <Text style={styles.optionTitle}>Choose Size</Text>
                            <View style={styles.sizeRow}>
                                {sizes.map(size => {
                                    const isActive = selectedSize === size.key;
                                    return (
                                        <TouchableOpacity
                                            key={size.key}
                                            style={[styles.sizeCard, isActive && styles.sizeCardActive]}
                                            onPress={() => setSelectedSize(size.key)}
                                        >
                                            <Text style={[styles.sizeLabel, isActive && styles.sizeLabelActive]}>{size.label}</Text>
                                            <Text style={[styles.sizeInfo, isActive && styles.sizeLabelActive]}>{size.size}</Text>
                                            <Text style={[styles.sizePrice, isActive && styles.sizeLabelActive]}>₹{size.price}</Text>
                                        </TouchableOpacity>
                                    )
                                })}
                            </View>
                        </>
                    )}

                    {/* Crust */}
                    {crusts.length > 0 && (
                        <>
                            <Text style={styles.optionTitle}>Choose Crust</Text>
                            <View style={styles.crustList}>
                                {crusts.map(crust => {
                                    const isActive = selectedCrust?.id === crust.id;
                                    return (
                                        <TouchableOpacity
                                            key={crust.id}
                                            style={[styles.chip, isActive && styles.chipActive]}
                                            onPress={() => setSelectedCrust(crust)}
                                        >
                                            <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                                                {crust.name} {crust.price > 0 ? `(+₹${crust.price})` : ''}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </>
                    )}

                    {/* Toppings */}
                    {toppings.length > 0 && (
                        <>
                            <Text style={styles.optionTitle}>Extra Toppings</Text>
                            <View style={styles.toppingGrid}>
                                {toppings.map(topping => {
                                    const isActive = !!selectedToppings.find(t => t.id === topping.id);
                                    return (
                                        <TouchableOpacity
                                            key={topping.id}
                                            style={[styles.chip, isActive && styles.chipActive]}
                                            onPress={() => toggleTopping(topping)}
                                        >
                                            <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                                                {topping.name}
                                            </Text>
                                            <Text style={[styles.chipPrice, isActive && styles.chipTextActive]}>
                                                +₹{topping.price}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </>
                    )}

                    <View style={{ height: 120 }} />
                </View>
            </ScrollView>

            {/* Bottom Bar */}
            <View style={styles.bottomBar}>
                <View style={styles.qtyContainer}>
                    <TouchableOpacity style={styles.qtyBtn} onPress={() => quantity > 1 && setQuantity(q => q - 1)}>
                        <Minus size={20} color="#94a3b8" />
                    </TouchableOpacity>
                    <Text style={styles.qtyText}>{quantity}</Text>
                    <TouchableOpacity style={styles.qtyBtn} onPress={() => setQuantity(q => q + 1)}>
                        <Plus size={20} color="#94a3b8" />
                    </TouchableOpacity>
                </View>
                <TouchableOpacity style={styles.addToCartBtn} onPress={handleAddToCart} activeOpacity={0.8}>
                    <Text style={styles.addToCartText}>Add to Cart • ₹{getTotalPrice()}</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: '#ffffff' },
    container: { flex: 1 },
    imageContainer: { height: 280, backgroundColor: '#f3feb0', position: 'relative' },
    image: { width: '100%', height: '100%', resizeMode: 'cover' },
    imagePlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    backBtn: {
        position: 'absolute', top: 40, left: 16,
        width: 44, height: 44, borderRadius: 22, backgroundColor: '#ffffff',
        justifyContent: 'center', alignItems: 'center',
        shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4,
    },
    typeIconIndicator: {
        position: 'absolute', bottom: 16, right: 16,
        width: 20, height: 20, borderWidth: 2, borderRadius: 4, backgroundColor: '#fff',
        justifyContent: 'center', alignItems: 'center',
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3,
    },
    typeIconDot: { width: 8, height: 8, borderRadius: 4 },
    content: { paddingHorizontal: 20, paddingTop: 24 },
    name: { fontSize: 26, fontWeight: '900', color: '#0f172a' },
    category: { fontSize: 14, color: '#64748b', marginTop: 4, fontWeight: '600' },
    description: { fontSize: 15, color: '#475569', lineHeight: 22, marginTop: 12 },
    optionTitle: { fontSize: 18, fontWeight: '900', color: '#0f172a', marginTop: 28, marginBottom: 16 },
    sizeRow: { flexDirection: 'row', gap: 12 },
    sizeCard: {
        flex: 1, paddingVertical: 16, borderRadius: 16,
        backgroundColor: '#f8fafc', alignItems: 'center',
    },
    sizeCardActive: {
        backgroundColor: '#48d23c', shadowColor: '#48d23c', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 3,
    },
    sizeLabel: { fontSize: 15, fontWeight: '800', color: '#334155' },
    sizeInfo: { fontSize: 13, color: '#94a3b8', marginTop: 4 },
    sizePrice: { fontSize: 16, fontWeight: '900', color: '#0f172a', marginTop: 8 },
    sizeLabelActive: { color: '#ffffff' },

    crustList: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    toppingGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },

    chip: {
        paddingHorizontal: 16, paddingVertical: 12, borderRadius: 14,
        backgroundColor: '#f8fafc',
    },
    chipActive: {
        backgroundColor: '#f3feb0',
        borderWidth: 1,
        borderColor: '#48d23c',
    },
    chipText: { fontSize: 14, color: '#334155', fontWeight: '700' },
    chipTextActive: { color: '#22973a' },
    chipPrice: { fontSize: 12, color: '#94a3b8', marginTop: 4, fontWeight: '600' },

    // Bottom Bar
    bottomBar: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        backgroundColor: '#ffffff',
        paddingHorizontal: 20, paddingTop: 16, paddingBottom: 30,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        shadowColor: '#000', shadowOffset: { width: 0, height: -10 }, shadowOpacity: 0.05, shadowRadius: 15, elevation: 20,
    },
    qtyContainer: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#f8fafc', borderRadius: 24,
        paddingHorizontal: 6, paddingVertical: 6,
    },
    qtyBtn: {
        width: 40, height: 40, borderRadius: 20, backgroundColor: '#ffffff',
        justifyContent: 'center', alignItems: 'center',
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
    },
    qtyText: { fontSize: 18, fontWeight: '900', color: '#0f172a', paddingHorizontal: 16 },
    addToCartBtn: {
        flex: 1, marginLeft: 16, backgroundColor: '#00b050',
        paddingVertical: 18, borderRadius: 16,
        alignItems: 'center',
        shadowColor: '#00b050', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
    },
    addToCartText: { color: '#ffffff', fontSize: 16, fontWeight: '900', letterSpacing: 0.5 },
});
