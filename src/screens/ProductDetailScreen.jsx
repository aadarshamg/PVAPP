import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    Image, Animated, TextInput
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { useCart } from '../contexts/CartContext';
import { useStore } from '../contexts/StoreContext';
import { ArrowLeft, Minus, Plus, ShoppingCart } from 'lucide-react-native';

const sortByVegThenPrice = (a, b) => (b.is_veg - a.is_veg) || (Number(a.price || 0) - Number(b.price || 0));

export default function ProductDetailScreen({ route, navigation }) {
    const { product } = route.params;
    const { addToCart, addFeastCombo } = useCart();
    const { selectedStore } = useStore();
    const insets = useSafeAreaInsets();

    const [selectedSize, setSelectedSize] = useState(() => {
        const hasPrice = (price) => price !== null && price !== undefined;
        if (hasPrice(product.base_price_small))  return 'small';
        if (hasPrice(product.base_price_medium)) return 'medium';
        if (hasPrice(product.base_price_large))  return 'large';
        if (hasPrice(product.base_price_xlarge)) return 'xlarge';
        return null;
    });
    const [crusts, setCrusts] = useState([]);
    const [selectedCrust, setSelectedCrust] = useState(null);
    const [toppings, setToppings] = useState([]);
    const [selectedToppings, setSelectedToppings] = useState([]);
    const [cheeses, setCheeses] = useState([]);
    const [selectedCheese, setSelectedCheese] = useState(null);
    const [bases, setBases] = useState([]);
    const [selectedBase, setSelectedBase] = useState(null);
    const [dips, setDips] = useState([]);
    const [selectedDips, setSelectedDips] = useState([]);
    const [addons, setAddons] = useState([]);
    const [selectedAddons, setSelectedAddons] = useState([]);
    const [feastCombos, setFeastCombos] = useState([]);
    const [selectedFeastCombos, setSelectedFeastCombos] = useState([]);
    const [sizeLabels, setSizeLabels] = useState({
        small: '6 Inch', medium: '8 Inch', large: '10 Inch', xlarge: '12 Inch',
    });
    const [instructions, setInstructions] = useState('');
    const [quantity, setQuantity] = useState(1);
    const [descriptionExpanded, setDescriptionExpanded] = useState(false);

    // Toast
    const [toastVisible, setToastVisible] = useState(false);
    const [toastLabel, setToastLabel] = useState('');
    const toastY = useRef(new Animated.Value(-120)).current;
    const toastOpacity = useRef(new Animated.Value(0)).current;
    const toastTimer = useRef(null);

    const fetchCustomizations = useCallback(async () => {
        const [crustRes, dipRes, feastRes, sizeLabelRes, productAddonRes] = await Promise.all([
            supabase.from('crusts').select('*').eq('product_id', product.id),
            supabase.from('product_dip_options').select('topping:toppings(*)').eq('product_id', product.id),
            supabase.from('feast_combos').select('*').eq('store_id', selectedStore?.id).eq('is_available', true).order('sort_order', { ascending: true }),
            supabase.from('store_settings').select('key, value')
                .in('key', ['size_label_small', 'size_label_medium', 'size_label_large', 'size_label_xlarge']),
            // Add-ons (sides/drinks) don't vary by size — fetch once, not on every size tap.
            supabase.from('product_addons').select('addon:addons(*)').eq('product_id', product.id),
        ]);
        if (crustRes.data) {
            setCrusts(crustRes.data);
            if (crustRes.data.length > 0) setSelectedCrust(crustRes.data[0]);
        }
        if (dipRes.data) setDips(dipRes.data.map(r => r.topping).filter(Boolean).sort(sortByVegThenPrice));
        if (productAddonRes.data) setAddons(productAddonRes.data.map(r => r.addon).filter(Boolean).sort(sortByVegThenPrice));
        if (sizeLabelRes.data?.length > 0) {
            const m = {};
            sizeLabelRes.data.forEach(r => { m[r.key] = r.value; });
            setSizeLabels(prev => ({
                small:  m.size_label_small  || prev.small,
                medium: m.size_label_medium || prev.medium,
                large:  m.size_label_large  || prev.large,
                xlarge: m.size_label_xlarge || prev.xlarge,
            }));
        }
        if (feastRes.data) setFeastCombos(feastRes.data);
    }, [product.id]);

    useEffect(() => {
        fetchCustomizations();
    }, [fetchCustomizations]);

    useEffect(() => {
        if (!selectedSize || !product?.id) return;

        Promise.all([
            supabase
                .from('product_size_addons')
                .select('topping:toppings(*)')
                .eq('product_id', product.id)
                .eq('size', selectedSize),
            supabase
                .from('product_cheese_options')
                .select('topping:toppings(*)')
                .eq('product_id', product.id)
                .eq('size', selectedSize),
            supabase
                .from('product_base_options')
                .select('topping:toppings(*)')
                .eq('product_id', product.id)
                .eq('size', selectedSize),
        ]).then(([addonRes, cheeseRes, baseRes]) => {
            const priceKey = `price_${selectedSize}`;
            const nextToppings = (addonRes.data || []).map(r => r.topping).filter(Boolean).map(t => ({ ...t, price: t[priceKey] }));
            const nextCheeses = (cheeseRes.data || []).map(r => r.topping).filter(Boolean).map(c => ({ ...c, price: c[priceKey] })).sort(sortByVegThenPrice);
            const nextBases = (baseRes.data || []).map(r => r.topping).filter(Boolean).map(b => ({ ...b, price: b[priceKey] })).sort(sortByVegThenPrice);

            setToppings(nextToppings);
            setSelectedToppings([]);

            setCheeses(nextCheeses);
            setSelectedCheese(null);

            setBases(nextBases);
            setSelectedBase(null);
        });
    }, [selectedSize, product?.id]);

    const hasSizePrice = (price) => price !== null && price !== undefined;
    const sizes = useMemo(() => {
        const productType = product.product_type || 'pizza';

        // Single price — no real "size" concept, so no size label is shown anywhere downstream.
        if (productType === 'simple') {
            return hasSizePrice(product.base_price_small)
                ? [{ key: 'small', label: '', price: product.base_price_small, size: '' }]
                : [];
        }

        // Half & Full — a fixed two-way choice, unrelated to the shop's pizza size names.
        if (productType === 'half_full') {
            return [
                hasSizePrice(product.base_price_small)  && { key: 'small',  label: 'Half', price: product.base_price_small,  size: '' },
                hasSizePrice(product.base_price_medium) && { key: 'medium', label: 'Full', price: product.base_price_medium, size: '' },
            ].filter(Boolean);
        }

        // Pizza — the shop's configured 4-size names.
        return [
            hasSizePrice(product.base_price_small)  && { key: 'small',  label: sizeLabels.small,  price: product.base_price_small,  size: '6"' },
            hasSizePrice(product.base_price_medium) && { key: 'medium', label: sizeLabels.medium, price: product.base_price_medium, size: '8"' },
            hasSizePrice(product.base_price_large)  && { key: 'large',  label: sizeLabels.large,  price: product.base_price_large,  size: '10"' },
            hasSizePrice(product.base_price_xlarge) && { key: 'xlarge', label: sizeLabels.xlarge, price: product.base_price_xlarge, size: '12"' },
        ].filter(Boolean);
    }, [product, sizeLabels]);

    // Shared font size for all size buttons, sized down together if any label has a long word —
    // keeps every button's text visually consistent instead of each shrinking independently.
    const sizeLabelFontSize = useMemo(() => {
        const longestWord = Math.max(0, ...sizes.flatMap(s => s.label.split(' ').map(w => w.length)));
        return longestWord > 9 ? 12 : longestWord > 7 ? 13.5 : 15;
    }, [sizes]);

    useEffect(() => {
        if (sizes.length > 0 && !sizes.find(s => s.key === selectedSize)) {
            setSelectedSize(sizes[0].key);
        }
    }, [sizes]);

    const toggleTopping = useCallback((topping) => {
        setSelectedToppings(prev =>
            prev.find(t => t.id === topping.id)
                ? prev.filter(t => t.id !== topping.id)
                : [...prev, topping]
        );
    }, []);

    const toggleDip = (dip) => {
        setSelectedDips(prev =>
            prev.find(d => d.id === dip.id)
                ? prev.filter(d => d.id !== dip.id)
                : [...prev, dip]
        );
    };

    const toggleAddon = (addon) => {
        setSelectedAddons(prev =>
            prev.find(a => a.id === addon.id)
                ? prev.filter(a => a.id !== addon.id)
                : [...prev, addon]
        );
    };

    const toggleFeastCombo = (combo) => {
        setSelectedFeastCombos(prev =>
            prev.find(c => c.id === combo.id)
                ? prev.filter(c => c.id !== combo.id)
                : [...prev, combo]
        );
    };

    const getBasePrice = () => Number(sizes.find(s => s.key === selectedSize)?.price || 0);

    const getTotalPrice = () => {
        let total = getBasePrice();
        if (selectedCrust)  total += Number(selectedCrust.price  || 0);
        if (selectedCheese) total += Number(selectedCheese.price || 0);
        if (selectedBase)   total += Number(selectedBase.price   || 0);
        selectedToppings.forEach(t => { total += Number(t.price || 0); });
        selectedDips.forEach(d => { total += Number(d.price || 0); });
        selectedAddons.forEach(a => { total += Number(a.price || 0); });
        return total * quantity;
    };

    const showToast = (label) => {
        if (toastTimer.current) clearTimeout(toastTimer.current);
        setToastLabel(label);
        setToastVisible(true);
        toastY.setValue(-120);
        toastOpacity.setValue(0);
        Animated.parallel([
            Animated.spring(toastY, { toValue: 0, friction: 7, tension: 70, useNativeDriver: true }),
            Animated.timing(toastOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        ]).start();
        toastTimer.current = setTimeout(() => {
            Animated.parallel([
                Animated.timing(toastY, { toValue: -120, duration: 250, useNativeDriver: true }),
                Animated.timing(toastOpacity, { toValue: 0, duration: 250, useNativeDriver: true }),
            ]).start(() => setToastVisible(false));
        }, 2200);
    };

    const handleAddToCart = () => {
        const sizeObj = sizes.find(s => s.key === selectedSize);
        if (!sizeObj) return;
        addToCart(product, sizeObj, selectedCrust, selectedToppings, quantity, getTotalPrice(), selectedCheese, selectedDips, instructions, selectedAddons, selectedBase);
        selectedFeastCombos.forEach(combo => addFeastCombo(combo));
        showToast(`${quantity}x ${product.name} — ₹${getTotalPrice()}`);
    };

    const vegToppings    = useMemo(() => toppings.filter(t =>  t.is_veg).sort((a, b) => a.price - b.price), [toppings]);
    const nonVegToppings = useMemo(() => toppings.filter(t => !t.is_veg).sort((a, b) => a.price - b.price), [toppings]);

    return (
        <SafeAreaView style={styles.safe}>
            <ScrollView style={styles.container} showsVerticalScrollIndicator={false} bounces={false}>
                {/* Product Image */}
                <View style={styles.imageContainer}>
                    {product.image_url
                        ? <Image source={{ uri: product.image_url }} style={styles.image} />
                        : <View style={styles.imagePlaceholder}><Text style={{ fontSize: 80 }}>🍽️</Text></View>}
                    <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                        <ArrowLeft color="#111827" size={24} />
                    </TouchableOpacity>
                    <View style={[styles.typeIconIndicator, { borderColor: product.is_veg ? '#48d23c' : '#EF4444' }]}>
                        <View style={[styles.typeIconDot, { backgroundColor: product.is_veg ? '#48d23c' : '#EF4444' }]} />
                    </View>
                </View>

                <View style={styles.content}>
                    <Text style={styles.name}>{product.name}</Text>
                    {sizes.length === 1 && (
                        <Text style={styles.singlePrice}>₹{sizes[0].price}</Text>
                    )}
                    <Text style={styles.category}>{product.category?.name}</Text>
                    <TouchableOpacity activeOpacity={0.7} onPress={() => setDescriptionExpanded(prev => !prev)}>
                        <Text style={styles.description} numberOfLines={descriptionExpanded ? undefined : 1}>
                            {product.description || 'Delicious freshly baked pizza with extra cheese and Italian herbs.'}
                        </Text>
                        <Text style={styles.descriptionToggle}>{descriptionExpanded ? 'Show less' : 'Show more'}</Text>
                    </TouchableOpacity>

                    {/* Size — hidden entirely for single-size products (e.g. Garlic Bread) */}
                    {sizes.length > 1 && (
                        <>
                            <Text style={styles.optionTitle}>Choose Size</Text>
                            <View style={styles.sizeRow}>
                                {sizes.map(size => {
                                    const isActive = selectedSize === size.key;
                                    return (
                                        <TouchableOpacity key={size.key}
                                            style={[styles.sizeCard, isActive && styles.sizeCardActive]}
                                            onPress={() => setSelectedSize(size.key)}>
                                            <Text style={[styles.sizeLabel, { fontSize: sizeLabelFontSize }, isActive && styles.sizeLabelActive]}
                                                numberOfLines={2}>
                                                {size.label}
                                            </Text>
                                            <Text style={[styles.sizePrice, isActive && styles.sizeLabelActive]}>₹{size.price}</Text>
                                        </TouchableOpacity>
                                    );
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
                                        <TouchableOpacity key={crust.id}
                                            style={[styles.chip, isActive && styles.chipActive]}
                                            onPress={() => setSelectedCrust(crust)}>
                                            <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                                                {crust.name}{crust.price > 0 ? ` (+₹${crust.price})` : ''}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </>
                    )}

                    {/* Base */}
                    {bases.length > 0 && (
                        <>
                            <Text style={styles.optionTitle}>Choose Base</Text>
                            <View style={styles.toppingList}>
                                {bases.map(base => {
                                    const isActive = selectedBase?.id === base.id;
                                    return (
                                        <TouchableOpacity key={base.id}
                                            style={[styles.toppingRow, isActive && styles.baseRowActive]}
                                            onPress={() => setSelectedBase(isActive ? null : base)}
                                            activeOpacity={0.7}>
                                            <Text style={[styles.toppingName, isActive && { color: '#0f766e' }]} numberOfLines={2}>
                                                {base.name}
                                            </Text>
                                            <Text style={[styles.toppingPrice, isActive && { color: '#0f766e' }]}>
                                                {base.price > 0 ? `+₹${base.price}` : 'Free'}
                                            </Text>
                                            <View style={[styles.radioOuter, isActive && styles.baseRadioActive]}>
                                                {isActive && <View style={[styles.radioInner, { backgroundColor: '#0f766e' }]} />}
                                            </View>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </>
                    )}

                    {/* ── Make it a FEAST? ── */}
                    {feastCombos.length > 0 && (
                        <>
                            <Text style={styles.optionTitle}>Make it a FEAST?</Text>
                            <View style={styles.toppingList}>
                                {feastCombos.map(combo => {
                                    const isActive = !!selectedFeastCombos.find(c => c.id === combo.id);
                                    return (
                                        <TouchableOpacity key={combo.id}
                                            style={[styles.toppingRow, isActive && styles.feastRowActive]}
                                            onPress={() => toggleFeastCombo(combo)}
                                            activeOpacity={0.7}>
                                            {combo.image_url
                                                ? <Image source={{ uri: combo.image_url }} style={styles.feastImage} />
                                                : <Text style={{ fontSize: 20, marginRight: 10 }}>🎉</Text>}
                                            <Text style={[styles.toppingName, isActive && { color: '#b45309' }]} numberOfLines={2}>
                                                {combo.name}
                                            </Text>
                                            <View style={styles.feastPriceBox}>
                                                <Text style={styles.feastOriginalPrice}>₹{combo.original_price}</Text>
                                                <Text style={[styles.feastDiscountedPrice, isActive && { color: '#b45309' }]}>₹{combo.discounted_price}</Text>
                                            </View>
                                            <View style={[styles.toppingCheck, isActive && styles.feastCheckActive]}>
                                                {isActive && <Text style={styles.checkMark}>✓</Text>}
                                            </View>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </>
                    )}

                    {/* Cheese */}
                    {cheeses.length > 0 && (
                        <>
                            <Text style={styles.optionTitle}>Choose Cheese</Text>
                            <View style={styles.toppingList}>
                                {cheeses.map(cheese => {
                                    const isActive = selectedCheese?.id === cheese.id;
                                    return (
                                        <TouchableOpacity key={cheese.id}
                                            style={[styles.toppingRow, isActive && styles.cheeseRowActive]}
                                            onPress={() => setSelectedCheese(isActive ? null : cheese)}
                                            activeOpacity={0.7}>
                                            <Text style={[styles.toppingName, isActive && { color: '#92400e' }]} numberOfLines={2}>
                                                {cheese.name}
                                            </Text>
                                            <Text style={[styles.toppingPrice, isActive && { color: '#92400e' }]}>
                                                {cheese.price > 0 ? `+₹${cheese.price}` : 'Free'}
                                            </Text>
                                            <View style={[styles.radioOuter, isActive && styles.radioOuterActive]}>
                                                {isActive && <View style={styles.radioInner} />}
                                            </View>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </>
                    )}

                    {/* ── Extra Toppings — Veg / Non-Veg ── */}
                    {toppings.length > 0 && (
                        <>
                            <Text style={styles.optionTitle}>Extra Toppings</Text>

                            {vegToppings.length > 0 && (
                                <>
                                    <View style={styles.subHeader}>
                                        <View style={styles.vegDot} />
                                        <Text style={[styles.subHeaderText, { color: '#15803d' }]}>Veg</Text>
                                        <Text style={styles.subHeaderCount}>{vegToppings.length} options</Text>
                                    </View>
                                    <View style={styles.toppingList}>
                                        {vegToppings.map(topping => {
                                            const isActive = !!selectedToppings.find(t => t.id === topping.id);
                                            return <ToppingRow key={topping.id} topping={topping} isActive={isActive} onToggle={toggleTopping} />;
                                        })}
                                    </View>
                                </>
                            )}

                            {nonVegToppings.length > 0 && (
                                <>
                                    <View style={[styles.subHeader, { marginTop: vegToppings.length > 0 ? 18 : 0 }]}>
                                        <View style={styles.nonVegDot} />
                                        <Text style={[styles.subHeaderText, { color: '#b91c1c' }]}>Non-Veg</Text>
                                        <Text style={styles.subHeaderCount}>{nonVegToppings.length} options</Text>
                                    </View>
                                    <View style={styles.toppingList}>
                                        {nonVegToppings.map(topping => {
                                            const isActive = !!selectedToppings.find(t => t.id === topping.id);
                                            return <ToppingRow key={topping.id} topping={topping} isActive={isActive} onToggle={toggleTopping} />;
                                        })}
                                    </View>
                                </>
                            )}
                        </>
                    )}

                    {/* ── Dip ── */}
                    {dips.length > 0 && (
                        <>
                            <Text style={styles.optionTitle}>Dip</Text>
                            <View style={styles.toppingList}>
                                {dips.map(dip => {
                                    const isActive = !!selectedDips.find(d => d.id === dip.id);
                                    return (
                                        <TouchableOpacity key={dip.id}
                                            style={[styles.toppingRow, isActive && styles.dipRowActive]}
                                            onPress={() => toggleDip(dip)}
                                            activeOpacity={0.7}>
                                            {dip.image_url && <Image source={{ uri: dip.image_url }} style={styles.dipImage} />}
                                            <Text style={[styles.toppingName, isActive && { color: '#1d4ed8' }]} numberOfLines={1}>
                                                {dip.name}
                                            </Text>
                                            <Text style={[styles.toppingPrice, isActive && { color: '#1d4ed8' }]}>
                                                {dip.price > 0 ? `+₹${dip.price}` : 'Free'}
                                            </Text>
                                            <View style={[styles.toppingCheck, isActive && styles.dipCheckActive]}>
                                                {isActive && <Text style={styles.checkMark}>✓</Text>}
                                            </View>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </>
                    )}

                    {/* ── Add-ons ── */}
                    {addons.length > 0 && (
                        <>
                            <Text style={styles.optionTitle}>Add-ons</Text>
                            <View style={styles.toppingList}>
                                {addons.map(addon => {
                                    const isActive = !!selectedAddons.find(a => a.id === addon.id);
                                    return (
                                        <TouchableOpacity key={addon.id}
                                            style={[styles.toppingRow, isActive && styles.toppingRowActive]}
                                            onPress={() => toggleAddon(addon)}
                                            activeOpacity={0.7}>
                                            <Text style={{ fontSize: 20, marginRight: 10 }}>🥤</Text>
                                            <Text style={[styles.toppingName, isActive && styles.toppingNameActive]} numberOfLines={1}>
                                                {addon.name}
                                            </Text>
                                            <Text style={[styles.toppingPrice, isActive && styles.toppingPriceActive]}>+₹{addon.price}</Text>
                                            <View style={[styles.toppingCheck, isActive && styles.toppingCheckActive]}>
                                                {isActive && <Text style={styles.checkMark}>✓</Text>}
                                            </View>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </>
                    )}

                    {/* ── Special Instructions ── */}
                    <Text style={styles.optionTitle}>Special Instructions</Text>
                    <TextInput
                        style={styles.instructionsInput}
                        placeholder="Any special requests? (e.g. extra sauce, less spicy, no onion...)"
                        placeholderTextColor="#94a3b8"
                        value={instructions}
                        onChangeText={setInstructions}
                        multiline
                        numberOfLines={3}
                        textAlignVertical="top"
                    />

                    <View style={{ height: 120 }} />
                </View>
            </ScrollView>

            {/* Toast popup */}
            {toastVisible && (
                <Animated.View style={[styles.toast, { transform: [{ translateY: toastY }], opacity: toastOpacity }]}>
                    <View style={styles.toastIconBox}>
                        <ShoppingCart size={20} color="#fff" />
                    </View>
                    <View style={styles.toastTextBox}>
                        <Text style={styles.toastTitle}>Added to Cart!</Text>
                        <Text style={styles.toastSub} numberOfLines={1}>{toastLabel}</Text>
                    </View>
                    <TouchableOpacity
                        style={styles.toastCartBtn}
                        onPress={() => {
                            if (toastTimer.current) clearTimeout(toastTimer.current);
                            setToastVisible(false);
                            navigation.navigate('Cart');
                        }}
                        activeOpacity={0.85}>
                        <Text style={styles.toastCartBtnText}>View Cart</Text>
                    </TouchableOpacity>
                </Animated.View>
            )}

            {/* Bottom Bar */}
            <View style={[styles.bottomBar, { paddingBottom: 16 + insets.bottom }]}>
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

const ToppingRow = React.memo(function ToppingRow({ topping, isActive, onToggle }) {
    return (
        <TouchableOpacity
            style={[styles.toppingRow, isActive && styles.toppingRowActive]}
            onPress={() => onToggle(topping)}
            activeOpacity={0.7}>
            <View style={[styles.vegMark, { borderColor: topping.is_veg ? '#22973a' : '#EF4444' }]}>
                <View style={[styles.vegMarkDot, { backgroundColor: topping.is_veg ? '#22973a' : '#EF4444' }]} />
            </View>
            <Text style={[styles.toppingName, isActive && styles.toppingNameActive]} numberOfLines={1}>
                {topping.name}
            </Text>
            <Text style={[styles.toppingPrice, isActive && styles.toppingPriceActive]}>+₹{topping.price}</Text>
            <View style={[styles.toppingCheck, isActive && styles.toppingCheckActive]}>
                {isActive && <Text style={styles.checkMark}>✓</Text>}
            </View>
        </TouchableOpacity>
    );
});

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
    },
    typeIconDot: { width: 8, height: 8, borderRadius: 4 },
    content: { paddingHorizontal: 20, paddingTop: 24 },
    name: { fontSize: 26, fontWeight: '900', color: '#0f172a' },
    singlePrice: { fontSize: 26, fontWeight: '900', color: '#22973a', marginTop: 4 },
    category: { fontSize: 14, color: '#64748b', marginTop: 4, fontWeight: '600' },
    description: { fontSize: 15, color: '#475569', lineHeight: 22, marginTop: 12 },
    descriptionToggle: { fontSize: 13, fontWeight: '700', color: '#22973a', marginTop: 4 },
    optionTitle: { fontSize: 18, fontWeight: '900', color: '#0f172a', marginTop: 28, marginBottom: 16 },

    // Size
    sizeRow: { flexDirection: 'row', gap: 12 },
    sizeCard: { flex: 1, paddingVertical: 16, paddingHorizontal: 6, borderRadius: 16, backgroundColor: '#f8fafc', alignItems: 'center' },
    sizeCardActive: { backgroundColor: '#48d23c', shadowColor: '#48d23c', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 3 },
    sizeLabel: { fontSize: 15, fontWeight: '800', color: '#334155', textAlign: 'center' },
    sizeInfo:  { fontSize: 13, color: '#94a3b8', marginTop: 4 },
    sizePrice: { fontSize: 16, fontWeight: '900', color: '#0f172a', marginTop: 8 },
    sizeLabelActive: { color: '#ffffff' },

    // Crust / Cheese chips
    crustList: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    chip: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 14, backgroundColor: '#f8fafc' },
    chipActive: { backgroundColor: '#f3feb0', borderWidth: 1, borderColor: '#48d23c' },
    chipText: { fontSize: 14, color: '#334155', fontWeight: '700' },
    chipTextActive: { color: '#22973a' },

    // Cheese chip variant

    // Sub-headers for Veg/Non-Veg
    subHeader: {
        flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12,
        backgroundColor: '#f8fafc', borderRadius: 12,
        paddingHorizontal: 14, paddingVertical: 10,
        borderWidth: 1, borderColor: '#e2e8f0',
    },
    vegDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#22973a' },
    nonVegDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#ef4444' },
    subHeaderText: { fontSize: 13, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.8, flex: 1 },
    subHeaderCount: { fontSize: 11, fontWeight: '700', color: '#94a3b8' },

    // Topping rows
    toppingList: { gap: 10 },
    toppingRow: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#f8fafc', borderRadius: 16,
        paddingHorizontal: 16, paddingVertical: 16,
        borderWidth: 1.5, borderColor: 'transparent',
    },
    toppingRowActive: { backgroundColor: '#f0fdf4', borderColor: '#48d23c' },
    dipRowActive: { backgroundColor: '#eff6ff', borderColor: '#3b82f6' },
    dipImage: { width: 28, height: 28, borderRadius: 8, marginRight: 10 },
    cheeseRowActive: { backgroundColor: '#fffbeb', borderColor: '#d97706' },
    baseRowActive: { backgroundColor: '#f0fdfa', borderColor: '#0f766e' },
    baseRadioActive: { borderColor: '#0f766e' },
    radioOuter: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: '#cbd5e1', justifyContent: 'center', alignItems: 'center' },
    radioOuterActive: { borderColor: '#d97706' },
    radioInner: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#d97706' },
    feastRowActive: { backgroundColor: '#fffbeb', borderColor: '#f59e0b' },
    feastImage: { width: 36, height: 36, borderRadius: 8, marginRight: 12 },
    feastPriceBox: { alignItems: 'flex-end', marginRight: 12 },
    feastOriginalPrice: { fontSize: 12, fontWeight: '700', color: '#94a3b8', textDecorationLine: 'line-through' },
    feastDiscountedPrice: { fontSize: 15, fontWeight: '900', color: '#0f172a' },
    feastCheckActive: { backgroundColor: '#f59e0b', borderColor: '#f59e0b' },
    vegMark: { width: 15, height: 15, borderRadius: 3, borderWidth: 1.5, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    vegMarkDot: { width: 7, height: 7, borderRadius: 3.5 },
    toppingName: { flex: 1, fontSize: 15, fontWeight: '700', color: '#334155' },
    toppingNameActive: { color: '#166534' },
    toppingPrice: { fontSize: 14, fontWeight: '800', color: '#94a3b8', marginRight: 12 },
    toppingPriceActive: { color: '#22973a' },
    toppingCheck: { width: 26, height: 26, borderRadius: 7, borderWidth: 2, borderColor: '#cbd5e1', justifyContent: 'center', alignItems: 'center' },
    toppingCheckActive: { backgroundColor: '#48d23c', borderColor: '#48d23c' },
    dipCheckActive: { backgroundColor: '#3b82f6', borderColor: '#3b82f6' },
    checkMark: { color: '#fff', fontSize: 13, fontWeight: '900' },

    // Instructions
    instructionsInput: {
        backgroundColor: '#f8fafc', borderRadius: 16, borderWidth: 1.5, borderColor: '#e2e8f0',
        paddingHorizontal: 16, paddingVertical: 14,
        fontSize: 14, color: '#0f172a', lineHeight: 20,
        minHeight: 90,
    },

    // Toast
    toast: {
        position: 'absolute', top: 56, left: 16, right: 16,
        backgroundColor: '#0f172a', borderRadius: 20,
        flexDirection: 'row', alignItems: 'center',
        paddingVertical: 14, paddingHorizontal: 14, gap: 12,
        shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 20, elevation: 18, zIndex: 999,
    },
    toastIconBox: { width: 40, height: 40, borderRadius: 14, backgroundColor: '#22973a', justifyContent: 'center', alignItems: 'center' },
    toastTextBox: { flex: 1 },
    toastTitle: { fontSize: 14, fontWeight: '900', color: '#fff' },
    toastSub: { fontSize: 12, color: '#94a3b8', marginTop: 2, fontWeight: '600' },
    toastCartBtn: { backgroundColor: '#22973a', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12 },
    toastCartBtnText: { fontSize: 13, fontWeight: '900', color: '#fff' },

    // Bottom Bar
    bottomBar: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        backgroundColor: '#ffffff', paddingHorizontal: 20, paddingTop: 16,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        shadowColor: '#000', shadowOffset: { width: 0, height: -10 }, shadowOpacity: 0.05, shadowRadius: 15, elevation: 20,
    },
    qtyContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: 24, paddingHorizontal: 6, paddingVertical: 6 },
    qtyBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#ffffff', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
    qtyText: { fontSize: 18, fontWeight: '900', color: '#0f172a', paddingHorizontal: 16 },
    addToCartBtn: { flex: 1, marginLeft: 16, backgroundColor: '#00b050', paddingVertical: 18, borderRadius: 16, alignItems: 'center', shadowColor: '#00b050', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
    addToCartText: { color: '#ffffff', fontSize: 16, fontWeight: '900', letterSpacing: 0.5 },
});
