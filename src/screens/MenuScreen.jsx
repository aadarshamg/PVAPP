import React, { useEffect, useState } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    Image, ActivityIndicator, StatusBar, ScrollView, Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { ArrowLeft, Filter, ArrowUpDown } from 'lucide-react-native';
import { useStore } from '../contexts/StoreContext';

const { width } = Dimensions.get('window');
const TILE_W      = (width - 48) / 2;   // half-width tile
const TILE_FULL_W = width - 36;          // full-width tile
const TILE_H      = TILE_W * 1.2;
const TILE_H_LG   = TILE_H * 1.35;

// Solid color per category (cycles)
const TILE_COLORS = [
    '#22973a', // green
    '#f97316', // orange
    '#7c3aed', // violet
    '#0ea5e9', // sky
    '#e11d48', // rose
    '#f59e0b', // amber
    '#06b6d4', // cyan
    '#8b5cf6', // purple
    '#10b981', // emerald
    '#f43f5e', // pink
];

const TILE_EMOJIS = ['🍕', '🧀', '🌶️', '🍗', '🥩', '🫓', '🥤', '🌿', '⭐', '🏆'];

export default function MenuScreen({ navigation, route }) {
    // Menu is opened both as the "MenuTab" bottom-tab (tab bar visible, already
    // reserves its own bottom safe-area space) and as a standalone pushed screen
    // from Home (no tab bar — needs its own safe-area padding). Only add the extra
    // bottom inset in the latter case, or it double-counts on the former.
    const bottomEdges = navigation.getParent() ? [] : ['bottom'];
    const { selectedStore } = useStore();

    const [products, setProducts]               = useState([]);
    const [categories, setCategories]           = useState([]);
    const [selectedCategory, setSelectedCategory] = useState(
        route.params?.categoryId ? { id: route.params.categoryId } : null
    );
    const [dietType, setDietType]   = useState('All');
    const [sortOrder, setSortOrder] = useState('asc'); // default: Low to High price
    const [loading, setLoading]     = useState(true);
    const [error, setError]         = useState(null);
    const [productCounts, setProductCounts] = useState({});

    useEffect(() => { if (selectedStore?.id) fetchCategories(); }, [selectedStore?.id]);

    useEffect(() => {
        if (selectedCategory) fetchProducts();
        // Keyed on the id (not the object) — fetchCategories later replaces the
        // placeholder { id } with the full category row, which would otherwise
        // retrigger this effect a second time for the exact same category.
    }, [selectedCategory?.id, dietType, sortOrder]);

    const fetchCategories = async () => {
        setLoading(true);
        setError(null);
        try {
            const [catRes, prodRes] = await Promise.all([
                supabase.from('categories').select('*').eq('store_id', selectedStore.id).order('sort_order', { ascending: true }),
                supabase.from('products').select('category_id').eq('store_id', selectedStore.id).eq('is_available', true),
            ]);
            if (catRes.error) throw catRes.error;
            if (catRes.data) setCategories(catRes.data);
            // Build count map
            if (prodRes.data) {
                const counts = {};
                prodRes.data.forEach(p => {
                    if (p.category_id) counts[p.category_id] = (counts[p.category_id] || 0) + 1;
                });
                setProductCounts(counts);
            }
            // If came from Home with a specific category, fetch products for it
            if (route.params?.categoryId) {
                const matched = catRes.data?.find(c => c.id === route.params.categoryId);
                if (matched) setSelectedCategory(matched);
            }
        } catch (e) {
            console.warn('fetchCategories failed:', e.message);
            setError('Could not load the menu. Check your connection and try again.');
        } finally {
            setLoading(false);
        }
    };

    const fetchProducts = async () => {
        setLoading(true);
        setError(null);
        try {
            const { data, error: fetchError } = await supabase.from('products')
                .select('*, category:categories(name)')
                .eq('store_id', selectedStore.id)
                .eq('is_available', true)
                .eq('category_id', selectedCategory.id)
                .order('created_at', { ascending: false });
            if (fetchError) throw fetchError;
            if (data) {
                let filtered = data;
                if (dietType === 'Veg')    filtered = filtered.filter(p =>  p.is_veg);
                if (dietType === 'NonVeg') filtered = filtered.filter(p => !p.is_veg);
                if (sortOrder === 'asc')   filtered.sort((a, b) => a.base_price_small - b.base_price_small);
                if (sortOrder === 'desc')  filtered.sort((a, b) => b.base_price_small - a.base_price_small);
                setProducts(filtered);
            }
        } catch (e) {
            console.warn('fetchProducts failed:', e.message);
            setError('Could not load products. Check your connection and try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleRetry = () => {
        if (selectedCategory) fetchProducts();
        else fetchCategories();
    };

    const handleBack = () => {
        if (selectedCategory) {
            setSelectedCategory(null);
            setDietType('All');
            setSortOrder('asc');
            setProducts([]);
        } else {
            navigation.goBack();
        }
    };

    const cycleDietType = () => setDietType(prev => prev === 'All' ? 'Veg' : prev === 'Veg' ? 'NonVeg' : 'All');
    const cycleSort     = () => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    const dietLabel  = dietType === 'All' ? 'All' : dietType === 'Veg' ? '🌿 Veg' : '🍗 Non-Veg';
    const sortLabel  = sortOrder === 'asc' ? 'Low–High' : 'High–Low';

    // ── Single tile renderer ──
    const renderOneTile = (cat, colorIdx, large = false) => {
        const color = TILE_COLORS[colorIdx % TILE_COLORS.length];
        const emoji = TILE_EMOJIS[colorIdx % TILE_EMOJIS.length];
        const count = productCounts[cat.id] || 0;
        const tW = large ? TILE_FULL_W : TILE_W;
        const tH = large ? TILE_H_LG   : TILE_H;
        return (
            <TouchableOpacity
                key={cat.id}
                style={[styles.tile, { width: tW, height: tH }]}
                onPress={() => setSelectedCategory(cat)}
                activeOpacity={0.88}
            >
                {cat.image_url
                    ? <Image source={{ uri: cat.image_url }} style={styles.tileImage} resizeMode="cover" />
                    : <View style={[styles.tileImagePlaceholder, { backgroundColor: color }]}>
                          <Text style={[styles.tileEmoji, large && { fontSize: 72 }]}>{emoji}</Text>
                      </View>
                }
                <View style={[styles.tileOverlay, large && { paddingTop: 44, paddingBottom: 16 }]}>
                    <Text style={[styles.tileName, large && { fontSize: 20 }]} numberOfLines={2}>{cat.name}</Text>
                    <Text style={[styles.tileCount, large && { fontSize: 13 }]}>{count} {count === 1 ? 'item' : 'items'}</Text>
                </View>
            </TouchableOpacity>
        );
    };

    // ── Category Tile Grid — handles mixed large/small tiles ──
    const renderCategoryGrid = () => {
        // Build rows: large tile → own full-width row; small tiles → paired 2-col rows
        const rows = [];
        let i = 0;
        while (i < categories.length) {
            const cat = categories[i];
            if (cat.tile_size === 'large') {
                rows.push({ type: 'large', cat, idx: i });
                i++;
            } else {
                const next = categories[i + 1];
                if (next && next.tile_size !== 'large') {
                    rows.push({ type: 'pair', cats: [cat, next], indices: [i, i + 1] });
                    i += 2;
                } else {
                    rows.push({ type: 'solo', cat, idx: i });
                    i++;
                }
            }
        }

        return (
            <ScrollView contentContainerStyle={styles.tileGrid} showsVerticalScrollIndicator={false}>
                {rows.map((row, rowIdx) => {
                    if (row.type === 'large') {
                        return renderOneTile(row.cat, row.idx, true);
                    }
                    if (row.type === 'pair') {
                        return (
                            <View key={rowIdx} style={{ flexDirection: 'row', gap: 12 }}>
                                {renderOneTile(row.cats[0], row.indices[0], false)}
                                {renderOneTile(row.cats[1], row.indices[1], false)}
                            </View>
                        );
                    }
                    return (
                        <View key={rowIdx} style={{ flexDirection: 'row' }}>
                            {renderOneTile(row.cat, row.idx, false)}
                        </View>
                    );
                })}
            </ScrollView>
        );
    };

    const getLowestPizzaPrice = (item) => Math.min(
        item.base_price_small || Infinity,
        item.base_price_medium || Infinity,
        item.base_price_large || Infinity,
        item.base_price_xlarge || Infinity
    );

    // ── Product Card ──
    const renderProduct = ({ item }) => (
        <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('ProductDetail', { product: item })}
            activeOpacity={0.88}
        >
            <View style={styles.cardImgBox}>
                {item.image_url
                    ? <Image source={{ uri: item.image_url }} style={styles.cardImg} />
                    : <Text style={{ fontSize: 52 }}>🍽️</Text>}
                <View style={[styles.vegIcon, { borderColor: item.is_veg ? '#22973a' : '#EF4444' }]}>
                    <View style={[styles.vegDot, { backgroundColor: item.is_veg ? '#22973a' : '#EF4444' }]} />
                </View>
            </View>
            <View style={styles.cardInfo}>
                <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
                {!selectedCategory && <Text style={styles.cardCat}>{item.category?.name}</Text>}
                <Text style={styles.cardDesc} numberOfLines={2}>{item.description || 'Delicious freshly baked pizza'}</Text>
                <View style={styles.cardFooter}>
                    <Text style={styles.cardPrice}>₹{getLowestPizzaPrice(item)}</Text>
                    <TouchableOpacity
                        style={styles.addBtn}
                        onPress={() => navigation.navigate('ProductDetail', { product: item })}
                        activeOpacity={0.85}
                    >
                        <Text style={styles.addBtnText}>ADD  +</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.safe} edges={[...bottomEdges, 'left', 'right']}>
            <StatusBar barStyle="light-content" />

            {/* Header */}
            <View style={styles.header}>
                <SafeAreaView edges={['top']}>
                    <View style={styles.headerRow}>
                        <TouchableOpacity onPress={handleBack} style={styles.navBtn}>
                            <ArrowLeft color="#fff" size={22} />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>
                            {selectedCategory ? selectedCategory.name : 'Menu'}
                        </Text>
                        <View style={{ width: 40 }} />
                    </View>
                </SafeAreaView>
            </View>

            {loading ? (
                <View style={styles.loadingBox}>
                    <ActivityIndicator size="large" color="#22973a" />
                </View>
            ) : error ? (
                <View style={styles.loadingBox}>
                    <Text style={{ fontSize: 40, marginBottom: 12 }}>⚠️</Text>
                    <Text style={styles.emptyText}>{error}</Text>
                    <TouchableOpacity onPress={handleRetry} style={styles.retryBtn}>
                        <Text style={styles.retryBtnText}>Retry</Text>
                    </TouchableOpacity>
                </View>
            ) : !selectedCategory ? (
                /* ── Category Tile Grid ── */
                <>
                    <View style={styles.gridHeader}>
                        <Text style={styles.gridHeaderText}>What are you craving?</Text>
                        <Text style={styles.gridHeaderSub}>{categories.length} categories available</Text>
                    </View>
                    {renderCategoryGrid()}
                </>
            ) : (
                /* ── Product List ── */
                <>
                    {/* Filter row */}
                    <View style={styles.filterRow}>
                        <TouchableOpacity
                            style={[styles.filterBtn, dietType !== 'All' && styles.filterBtnActive]}
                            onPress={cycleDietType}
                        >
                            <Filter size={14} color={dietType !== 'All' ? '#16a34a' : '#64748b'} />
                            <Text style={[styles.filterBtnText, dietType !== 'All' && styles.filterBtnTextActive]}>{dietLabel}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.filterBtn, styles.filterBtnActive]}
                            onPress={cycleSort}
                        >
                            <ArrowUpDown size={14} color="#16a34a" />
                            <Text style={[styles.filterBtnText, styles.filterBtnTextActive]}>{sortLabel}</Text>
                        </TouchableOpacity>
                        <View style={{ flex: 1 }} />
                        <Text style={styles.resultsText}>{products.length} items</Text>
                    </View>

                    <FlatList
                        key="product-list"
                        data={products}
                        keyExtractor={item => item.id}
                        contentContainerStyle={styles.list}
                        renderItem={renderProduct}
                        showsVerticalScrollIndicator={false}
                        ListEmptyComponent={
                            <View style={styles.emptyBox}>
                                <Text style={{ fontSize: 56, marginBottom: 12 }}>🍽️</Text>
                                <Text style={styles.emptyText}>No items in this category yet.</Text>
                            </View>
                        }
                    />
                </>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: '#F7F8FA' },

    // Header
    header: {
        backgroundColor: '#22973a',
    },
    headerRow: {
        flexDirection: 'row', alignItems: 'center',
        justifyContent: 'space-between', paddingHorizontal: 20, height: 60,
    },
    navBtn: {
        width: 40, height: 40, justifyContent: 'center', alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20,
    },
    headerTitle: { fontSize: 20, fontWeight: '900', color: '#fff', flex: 1, textAlign: 'center', marginHorizontal: 8 },

    loadingBox: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
    retryBtn: { marginTop: 16, backgroundColor: '#22973a', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
    retryBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },

    // Category Grid
    gridHeader: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 4 },
    gridHeaderText: { fontSize: 20, fontWeight: '900', color: '#111827' },
    gridHeaderSub: { fontSize: 13, color: '#94a3b8', marginTop: 2, fontWeight: '600' },

    tileGrid: { padding: 18, gap: 12 },

    tile: {
        borderRadius: 18,
        overflow: 'hidden',
        position: 'relative',
        backgroundColor: '#e2e8f0',
        shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.12, shadowRadius: 12, elevation: 5,
    },
    tileImage: {
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        width: '100%', height: '100%',
    },
    tileImagePlaceholder: {
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        justifyContent: 'center', alignItems: 'center',
    },
    tileEmoji: { fontSize: 56 },
    tileOverlay: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        paddingHorizontal: 12, paddingTop: 28, paddingBottom: 12,
        backgroundColor: 'rgba(0,0,0,0.52)',
    },
    tileName: { fontSize: 14, fontWeight: '900', color: '#ffffff', lineHeight: 19 },
    tileCount: { fontSize: 11, color: 'rgba(255,255,255,0.72)', fontWeight: '600', marginTop: 3 },

    // Filters
    filterRow: {
        flexDirection: 'row', alignItems: 'center', gap: 10,
        paddingHorizontal: 20, paddingVertical: 12,
        backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
    },
    filterBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
        backgroundColor: '#f1f5f9', borderWidth: 1.5, borderColor: '#e2e8f0',
    },
    filterBtnActive: { backgroundColor: '#f0fdf4', borderColor: '#22973a' },
    filterBtnText: { fontSize: 13, fontWeight: '700', color: '#475569' },
    filterBtnTextActive: { color: '#16a34a' },
    resultsText: { fontSize: 12, color: '#94a3b8', fontWeight: '600' },

    list: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24 },

    // Product card
    card: {
        flexDirection: 'row', backgroundColor: '#fff', borderRadius: 20, marginBottom: 16, padding: 12,
        shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 3,
    },
    cardImgBox: {
        width: 110, height: 110, borderRadius: 16, backgroundColor: '#f3feb0',
        justifyContent: 'center', alignItems: 'center', overflow: 'hidden', position: 'relative',
    },
    cardImg: { width: '100%', height: '100%', resizeMode: 'cover' },
    vegIcon: {
        position: 'absolute', top: 6, right: 6,
        width: 18, height: 18, borderWidth: 2, borderRadius: 4, backgroundColor: '#fff',
        justifyContent: 'center', alignItems: 'center',
    },
    vegDot: { width: 8, height: 8, borderRadius: 4 },
    cardInfo: { flex: 1, marginLeft: 14, justifyContent: 'space-between' },
    cardName: { fontSize: 16, fontWeight: '900', color: '#111827' },
    cardCat:  { fontSize: 12, fontWeight: '600', color: '#94a3b8', marginTop: 2 },
    cardDesc: { fontSize: 12, color: '#6b7280', lineHeight: 18, marginTop: 4 },
    cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
    cardPrice: { fontSize: 20, fontWeight: '900', color: '#22973a' },
    addBtn: { backgroundColor: '#22973a', paddingHorizontal: 18, paddingVertical: 9, borderRadius: 10 },
    addBtnText: { color: '#fff', fontSize: 14, fontWeight: '900', letterSpacing: 0.5 },

    emptyBox: { alignItems: 'center', paddingTop: 60 },
    emptyText: { fontSize: 15, color: '#94a3b8', fontWeight: '600' },
});
