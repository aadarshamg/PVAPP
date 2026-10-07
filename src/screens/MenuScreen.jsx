import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, TextInput,
    ScrollView, ActivityIndicator, StatusBar, Modal,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Search, X, List } from 'lucide-react-native';
import { supabase } from '../lib/supabase';
import { useStore } from '../contexts/StoreContext';
import { getLowestPrice, getSizes } from '../utils/pricing';

// One-page menu: every category on a single scrolling page, with category chips that
// track the section in view while scrolling — matches customer-website's Menu page
// (src/pages/Menu.jsx) as closely as React Native allows. Web's true CSS "sticky" and
// scroll-spy (getBoundingClientRect) don't exist here, so the search/filter/chip bar is
// a fixed header above the ScrollView (same visual effect), and the active section is
// tracked via onLayout-measured offsets + onScroll instead.

const DIETS = [
    { key: 'veg', label: 'Veg' },
    { key: 'nonveg', label: 'Non-veg' },
];
const SPY_OFFSET = 24;

export default function MenuScreen({ navigation, route }) {
    const bottomEdges = navigation.getParent() ? [] : ['bottom'];
    const { selectedStore } = useStore();

    const [categories, setCategories] = useState([]);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [query, setQuery] = useState('');
    const [diet, setDiet] = useState(null); // null | 'veg' | 'nonveg'
    const [activeSectionId, setActiveSectionId] = useState(null);
    const [sheetOpen, setSheetOpen] = useState(false);

    const scrollViewRef = useRef(null);
    const chipScrollRef = useRef(null);
    const sectionOffsets = useRef({});
    const chipOffsets = useRef({});
    const jumpedToDeepLink = useRef(false);
    const [reloadKey, setReloadKey] = useState(0);
    const retry = () => setReloadKey(k => k + 1);

    useEffect(() => {
        if (!selectedStore?.id) return;
        setLoading(true);
        setError(null);
        Promise.all([
            supabase.from('categories').select('*').eq('store_id', selectedStore.id).order('sort_order', { ascending: true }),
            supabase.from('products').select('*').eq('store_id', selectedStore.id).eq('is_available', true).order('created_at', { ascending: true }),
        ]).then(([catRes, prodRes]) => {
            if (catRes.error || prodRes.error) throw catRes.error || prodRes.error;
            setCategories(catRes.data || []);
            setProducts(prodRes.data || []);
        }).catch(() => setError('Could not load the menu. Check your connection and try again.'))
            .finally(() => setLoading(false));
    }, [selectedStore?.id, reloadKey]);

    // Group -> filter (search + veg) -> drop empty categories. Cheapest first inside a category.
    const sections = useMemo(() => {
        const q = query.trim().toLowerCase();
        return categories.map(cat => {
            const catMatches = q && cat.name.toLowerCase().includes(q);
            const items = products
                .filter(p => p.category_id === cat.id)
                .filter(p => (diet === 'veg' ? p.is_veg : diet === 'nonveg' ? !p.is_veg : true))
                .filter(p => !q || catMatches || p.name.toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q))
                .sort((a, b) => getLowestPrice(a) - getLowestPrice(b));
            return { ...cat, items };
        }).filter(s => s.items.length > 0);
    }, [categories, products, query, diet]);

    // Default the first section as active immediately on load/filter change, rather than
    // leaving every chip unhighlighted until the user's first scroll event.
    useEffect(() => {
        if (!sections.length) { setActiveSectionId(null); return; }
        if (!sections.some(s => s.id === activeSectionId)) setActiveSectionId(sections[0].id);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sections]);

    const totalItems = sections.reduce((n, s) => n + s.items.length, 0);
    const filtersOn = !!query.trim() || !!diet;
    const clearFilters = () => { setQuery(''); setDiet(null); };

    const jumpTo = (id) => {
        setSheetOpen(false);
        const y = sectionOffsets.current[id];
        if (y != null && scrollViewRef.current) {
            scrollViewRef.current.scrollTo({ y: Math.max(0, y - 8), animated: true });
        }
        setActiveSectionId(id);
    };

    const handleScroll = (e) => {
        const y = e.nativeEvent.contentOffset.y;
        let current = sections[0]?.id ?? null;
        for (const s of sections) {
            const top = sectionOffsets.current[s.id];
            if (top != null && top <= y + SPY_OFFSET) current = s.id;
        }
        if (current !== activeSectionId) setActiveSectionId(current);
    };

    // Keep the active chip visible in the chip bar.
    useEffect(() => {
        if (activeSectionId == null) return;
        const x = chipOffsets.current[activeSectionId];
        if (x != null && chipScrollRef.current) {
            chipScrollRef.current.scrollTo({ x: Math.max(0, x - 16), animated: true });
        }
    }, [activeSectionId]);

    // Deep link from Home ("See All" on a category): jump once, after sections have
    // rendered and measured. A short delay lets onLayout fire for everything above it.
    useEffect(() => {
        if (jumpedToDeepLink.current || !route.params?.categoryId || !sections.length) return;
        jumpedToDeepLink.current = true;
        const id = route.params.categoryId;
        const timer = setTimeout(() => jumpTo(id), 200);
        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sections]);

    return (
        <SafeAreaView style={styles.safe} edges={[...bottomEdges, 'left', 'right']}>
            <StatusBar barStyle="light-content" />

            {/* Header */}
            <View style={styles.header}>
                <SafeAreaView edges={['top']}>
                    <View style={styles.headerRow}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.navBtn}>
                            <ArrowLeft color="#fff" size={22} />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>Our Menu</Text>
                        <View style={{ width: 40 }} />
                    </View>
                    {!!selectedStore?.name && (
                        <Text style={styles.headerSub}>Delivering from {selectedStore.name}</Text>
                    )}
                </SafeAreaView>
            </View>

            {loading ? (
                <View style={styles.loadingBox}>
                    <ActivityIndicator size="large" color="#22973a" />
                </View>
            ) : error ? (
                <View style={styles.loadingBox}>
                    <Text style={{ fontSize: 40, marginBottom: 12 }}>📡</Text>
                    <Text style={styles.emptyText}>{error}</Text>
                    <TouchableOpacity onPress={retry} style={styles.retryBtn}>
                        <Text style={styles.retryBtnText}>Retry</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <>
                    {/* Fixed search + filters + category chips (the "sticky" bar) */}
                    <View style={styles.stickyBar}>
                        <View style={styles.searchRow}>
                            <View style={styles.searchBox}>
                                <Search size={18} color="#94a3b8" />
                                <TextInput
                                    value={query}
                                    onChangeText={setQuery}
                                    placeholder="Search pizzas, burgers, momos..."
                                    placeholderTextColor="#94a3b8"
                                    style={styles.searchInput}
                                />
                                {!!query && (
                                    <TouchableOpacity onPress={() => setQuery('')}>
                                        <X size={16} color="#94a3b8" />
                                    </TouchableOpacity>
                                )}
                            </View>
                        </View>
                        <View style={styles.dietRow}>
                            {DIETS.map(d => {
                                const active = diet === d.key;
                                return (
                                    <TouchableOpacity key={d.key}
                                        onPress={() => setDiet(v => (v === d.key ? null : d.key))}
                                        style={[styles.dietPill, active && (d.key === 'veg' ? styles.dietPillVegActive : styles.dietPillNonVegActive)]}>
                                        <View style={[styles.dietBox, { borderColor: d.key === 'veg' ? '#22973a' : '#ef4444' }]}>
                                            <View style={[styles.dietDot, { backgroundColor: d.key === 'veg' ? '#22973a' : '#ef4444' }]} />
                                        </View>
                                        <Text style={[styles.dietLabel, active && styles.dietLabelActive]}>{d.label}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                            <View style={{ flex: 1 }} />
                            <Text style={styles.itemsCount}>{totalItems} items</Text>
                        </View>
                        {sections.length > 0 && (
                            <ScrollView ref={chipScrollRef} horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll} contentContainerStyle={styles.chipScrollContent}>
                                {sections.map(s => {
                                    const active = s.id === activeSectionId;
                                    return (
                                        <TouchableOpacity key={s.id}
                                            onLayout={(e) => { chipOffsets.current[s.id] = e.nativeEvent.layout.x; }}
                                            onPress={() => jumpTo(s.id)}
                                            style={[styles.chip, active && styles.chipActive]}>
                                            <Text style={[styles.chipText, active && styles.chipTextActive]}>{s.name}</Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </ScrollView>
                        )}
                    </View>

                    {sections.length === 0 ? (
                        <View style={styles.emptyBox}>
                            <Text style={{ fontSize: 56, marginBottom: 12 }}>🔍</Text>
                            <Text style={styles.emptyTitle}>{query ? `No items match "${query}"` : 'No items found'}</Text>
                            <Text style={styles.emptyText}>Try a different word or clear the filters.</Text>
                            {filtersOn && (
                                <TouchableOpacity onPress={clearFilters} style={styles.retryBtn}>
                                    <Text style={styles.retryBtnText}>Clear search</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    ) : (
                        <ScrollView
                            ref={scrollViewRef}
                            onScroll={handleScroll}
                            scrollEventThrottle={32}
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={styles.scrollContent}
                        >
                            {sections.map(s => (
                                <View key={s.id} onLayout={(e) => { sectionOffsets.current[s.id] = e.nativeEvent.layout.y; }}>
                                    <View style={styles.sectionHeader}>
                                        {s.image_url
                                            ? <Image source={{ uri: s.image_url }} style={styles.sectionAvatar} contentFit="cover" cachePolicy="memory-disk" />
                                            : null}
                                        <Text style={styles.sectionTitle} numberOfLines={1}>{s.name}</Text>
                                        <Text style={styles.sectionCount}>({s.items.length})</Text>
                                    </View>
                                    {s.items.map(item => {
                                        const price = getLowestPrice(item);
                                        const customisable = getSizes(item).length > 1;
                                        return (
                                            <TouchableOpacity
                                                key={item.id}
                                                style={styles.row}
                                                activeOpacity={0.85}
                                                onPress={() => navigation.navigate('ProductDetail', { product: item })}
                                            >
                                                <View style={styles.rowInfo}>
                                                    <View style={[styles.vegIcon, { borderColor: item.is_veg ? '#22973a' : '#ef4444' }]}>
                                                        <View style={[styles.vegDot, { backgroundColor: item.is_veg ? '#22973a' : '#ef4444' }]} />
                                                    </View>
                                                    <Text style={styles.rowName} numberOfLines={2}>{item.name}</Text>
                                                    {Number.isFinite(price) && (
                                                        <Text style={styles.rowPrice}>
                                                            ₹{price}
                                                            {customisable && <Text style={styles.rowOnwards}>  onwards</Text>}
                                                        </Text>
                                                    )}
                                                    {!!item.description && (
                                                        <Text style={styles.rowDesc} numberOfLines={2}>{item.description}</Text>
                                                    )}
                                                </View>
                                                <View style={styles.rowImageWrap}>
                                                    <View style={styles.rowImageBox}>
                                                        {item.image_url
                                                            ? <Image source={{ uri: item.image_url }} style={styles.rowImage} contentFit="cover" cachePolicy="memory-disk" />
                                                            : <Text style={{ fontSize: 36 }}>🍽️</Text>}
                                                    </View>
                                                    <View style={styles.addPill}>
                                                        <Text style={styles.addPillText}>ADD</Text>
                                                    </View>
                                                    {customisable && <Text style={styles.customisableText}>Customisable</Text>}
                                                </View>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            ))}
                            {filtersOn && (
                                <View style={styles.footerNote}>
                                    <Text style={styles.footerNoteText}>Showing {totalItems} matching items.</Text>
                                    <TouchableOpacity onPress={clearFilters}>
                                        <Text style={styles.footerNoteLink}>Show full menu</Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                        </ScrollView>
                    )}

                    {/* Floating "Menu" pill + category bottom sheet */}
                    {sections.length > 1 && (
                        <TouchableOpacity onPress={() => setSheetOpen(true)} style={styles.fab} activeOpacity={0.85}>
                            <List size={18} color="#fff" />
                            <Text style={styles.fabText}>Menu</Text>
                        </TouchableOpacity>
                    )}
                    <Modal visible={sheetOpen} transparent animationType="fade" onRequestClose={() => setSheetOpen(false)}>
                        <TouchableOpacity style={styles.sheetBackdrop} activeOpacity={1} onPress={() => setSheetOpen(false)}>
                            <TouchableOpacity activeOpacity={1} style={styles.sheet} onPress={() => {}}>
                                <View style={styles.sheetHeader}>
                                    <Text style={styles.sheetTitle}>Browse menu</Text>
                                    <TouchableOpacity onPress={() => setSheetOpen(false)} style={styles.sheetCloseBtn}>
                                        <X size={18} color="#475569" />
                                    </TouchableOpacity>
                                </View>
                                <ScrollView contentContainerStyle={{ paddingBottom: 12 }}>
                                    {sections.map(s => {
                                        const active = s.id === activeSectionId;
                                        return (
                                            <TouchableOpacity key={s.id} onPress={() => jumpTo(s.id)}
                                                style={[styles.sheetRow, active && styles.sheetRowActive]}>
                                                <Text style={[styles.sheetRowText, active && styles.sheetRowTextActive]}>{s.name}</Text>
                                                <Text style={styles.sheetRowCount}>{s.items.length}</Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </ScrollView>
                            </TouchableOpacity>
                        </TouchableOpacity>
                    </Modal>
                </>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: '#F7F8FA' },

    // Header
    header: { backgroundColor: '#22973a' },
    headerRow: {
        flexDirection: 'row', alignItems: 'center',
        justifyContent: 'space-between', paddingHorizontal: 20, height: 60,
    },
    navBtn: {
        width: 40, height: 40, justifyContent: 'center', alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20,
    },
    headerTitle: { fontSize: 20, fontWeight: '900', color: '#fff', flex: 1, textAlign: 'center', marginHorizontal: 8 },
    headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.85)', fontWeight: '600', textAlign: 'center', paddingBottom: 12 },

    loadingBox: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
    retryBtn: { marginTop: 16, backgroundColor: '#22973a', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
    retryBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },

    // Sticky bar
    stickyBar: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eef1f5', paddingTop: 12, paddingBottom: 4 },
    searchRow: { paddingHorizontal: 16 },
    searchBox: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        backgroundColor: '#f8fafc', borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 16,
        paddingHorizontal: 14, paddingVertical: 10,
    },
    searchInput: { flex: 1, fontSize: 14, fontWeight: '600', color: '#0f172a', padding: 0 },

    dietRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingTop: 10 },
    dietPill: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        paddingHorizontal: 12, paddingVertical: 7, borderRadius: 14,
        borderWidth: 1.5, borderColor: '#e2e8f0', backgroundColor: '#fff',
    },
    dietPillVegActive: { backgroundColor: '#f0fdf4', borderColor: '#22973a' },
    dietPillNonVegActive: { backgroundColor: '#fef2f2', borderColor: '#ef4444' },
    dietBox: { width: 14, height: 14, borderRadius: 3, borderWidth: 1.5, justifyContent: 'center', alignItems: 'center' },
    dietDot: { width: 6, height: 6, borderRadius: 3 },
    dietLabel: { fontSize: 13, fontWeight: '800', color: '#64748b' },
    dietLabelActive: { color: '#0f172a' },
    itemsCount: { fontSize: 11, fontWeight: '700', color: '#94a3b8' },

    chipScroll: { marginTop: 10 },
    chipScrollContent: { paddingHorizontal: 16, gap: 8, paddingBottom: 10 },
    chip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0' },
    chipActive: { backgroundColor: '#0f172a', borderColor: '#0f172a' },
    chipText: { fontSize: 13, fontWeight: '700', color: '#64748b' },
    chipTextActive: { color: '#fff' },

    scrollContent: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 100 },

    sectionHeader: {
        flexDirection: 'row', alignItems: 'center', gap: 10,
        paddingBottom: 10, marginTop: 20, borderBottomWidth: 2, borderBottomColor: '#e2e8f0',
    },
    sectionAvatar: { width: 36, height: 36, borderRadius: 18 },
    sectionTitle: { fontSize: 19, fontWeight: '900', color: '#0f172a', flexShrink: 1 },
    sectionCount: { fontSize: 13, fontWeight: '700', color: '#94a3b8' },

    row: {
        flexDirection: 'row', gap: 14,
        paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#eef1f5',
    },
    rowInfo: { flex: 1 },
    vegIcon: { width: 16, height: 16, borderWidth: 2, borderRadius: 4, justifyContent: 'center', alignItems: 'center', marginBottom: 6 },
    vegDot: { width: 6, height: 6, borderRadius: 3 },
    rowName: { fontSize: 15, fontWeight: '900', color: '#0f172a', lineHeight: 20 },
    rowPrice: { fontSize: 14, fontWeight: '900', color: '#0f172a', marginTop: 4 },
    rowOnwards: { fontSize: 11, fontWeight: '700', color: '#94a3b8' },
    rowDesc: { fontSize: 12, color: '#64748b', lineHeight: 17, marginTop: 6 },

    rowImageWrap: { width: 108, alignItems: 'center' },
    rowImageBox: {
        width: 108, height: 100, borderRadius: 16, overflow: 'hidden',
        backgroundColor: '#f3feb0', justifyContent: 'center', alignItems: 'center',
        shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
    },
    rowImage: { width: '100%', height: '100%' },
    addPill: {
        marginTop: -12, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0',
        borderRadius: 10, paddingHorizontal: 20, paddingVertical: 6,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3,
    },
    addPillText: { fontSize: 13, fontWeight: '900', color: '#22973a', letterSpacing: 0.5 },
    customisableText: { fontSize: 10, fontWeight: '600', color: '#94a3b8', marginTop: 6 },

    footerNote: { alignItems: 'center', marginTop: 24, gap: 2 },
    footerNoteText: { fontSize: 13, color: '#94a3b8', fontWeight: '600' },
    footerNoteLink: { fontSize: 13, color: '#22973a', fontWeight: '900', textDecorationLine: 'underline' },

    emptyBox: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
    emptyTitle: { fontSize: 16, fontWeight: '900', color: '#0f172a', textAlign: 'center' },
    emptyText: { fontSize: 14, color: '#94a3b8', fontWeight: '600', textAlign: 'center', marginTop: 6 },

    fab: {
        position: 'absolute', bottom: 24, alignSelf: 'center',
        flexDirection: 'row', alignItems: 'center', gap: 8,
        backgroundColor: '#0f172a', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 24,
        shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25, shadowRadius: 12, elevation: 8,
    },
    fabText: { color: '#fff', fontSize: 14, fontWeight: '900' },

    sheetBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
    sheet: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '75%', paddingBottom: 12 },
    sheetHeader: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
    },
    sheetTitle: { fontSize: 18, fontWeight: '900', color: '#0f172a' },
    sheetCloseBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center' },
    sheetRow: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 20, paddingVertical: 14,
    },
    sheetRowActive: { backgroundColor: '#f0fdf4' },
    sheetRowText: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
    sheetRowTextActive: { color: '#22973a', fontWeight: '900' },
    sheetRowCount: { fontSize: 13, fontWeight: '700', color: '#94a3b8' },
});
