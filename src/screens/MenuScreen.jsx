import React, { useEffect, useState } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    Image, ActivityIndicator, StatusBar, ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { ArrowLeft, ShoppingCart, Filter, ArrowUpDown } from 'lucide-react-native';

export default function MenuScreen({ navigation, route }) {
    const [products, setProducts]               = useState([]);
    const [categories, setCategories]           = useState([]);
    const [selectedCategory, setSelectedCategory] = useState(route.params?.categoryId || null);
    const [dietType, setDietType]               = useState('All');
    const [sortOrder, setSortOrder]             = useState('default');
    const [loading, setLoading]                 = useState(true);

    useEffect(() => { fetchCategories(); }, []);
    useEffect(() => { fetchProducts(); }, [selectedCategory, dietType, sortOrder]);

    const fetchCategories = async () => {
        const { data } = await supabase.from('categories').select('*').order('sort_order', { ascending: true });
        if (data) setCategories([{ id: null, name: 'All' }, ...data]);
    };

    const fetchProducts = async () => {
        setLoading(true);
        let query = supabase.from('products').select('*, category:categories(name)').eq('is_available', true).order('created_at', { ascending: false });
        if (selectedCategory) query = query.eq('category_id', selectedCategory);
        const { data } = await query;
        if (data) {
            let filtered = data;
            if (dietType === 'Veg')    filtered = filtered.filter(p => p.is_veg === true);
            if (dietType === 'NonVeg') filtered = filtered.filter(p => p.is_veg === false);
            if (sortOrder === 'asc')  filtered.sort((a, b) => a.base_price_small - b.base_price_small);
            if (sortOrder === 'desc') filtered.sort((a, b) => b.base_price_small - a.base_price_small);
            setProducts(filtered);
        }
        setLoading(false);
    };

    const cycleDietType = () => setDietType(prev => prev === 'All' ? 'Veg' : prev === 'Veg' ? 'NonVeg' : 'All');
    const cycleSort     = () => setSortOrder(prev => prev === 'default' ? 'asc' : prev === 'asc' ? 'desc' : 'default');

    const dietLabel = dietType === 'All' ? 'All' : dietType === 'Veg' ? 'Veg' : 'Non-Veg';
    const sortLabel = sortOrder === 'default' ? 'Price' : sortOrder === 'asc' ? 'Low–High' : 'High–Low';

    const renderProduct = ({ item }) => (
        <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('ProductDetail', { product: item })}
            activeOpacity={0.88}
        >
            <View style={styles.cardImgBox}>
                {item.image_url
                    ? <Image source={{ uri: item.image_url }} style={styles.cardImg} />
                    : <Text style={{ fontSize: 52 }}>🍕</Text>
                }
                <View style={[styles.vegIcon, { borderColor: item.is_veg ? '#22973a' : '#EF4444' }]}>
                    <View style={[styles.vegDot, { backgroundColor: item.is_veg ? '#22973a' : '#EF4444' }]} />
                </View>
            </View>
            <View style={styles.cardInfo}>
                <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.cardCat}>{item.category?.name}</Text>
                <Text style={styles.cardDesc} numberOfLines={2}>{item.description || 'Delicious freshly baked pizza'}</Text>
                <View style={styles.cardFooter}>
                    <Text style={styles.cardPrice}>₹{item.base_price_small}</Text>
                    <TouchableOpacity
                        style={styles.addBtn}
                        onPress={() => navigation.navigate('ProductDetail', { product: item })}
                        activeOpacity={0.85}
                    >
                        <Text style={styles.addBtnText}>CUSTOMIZE & ADD</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.safe}>
            <StatusBar barStyle="light-content" backgroundColor="#22973a" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.navBtn}>
                    <ArrowLeft color="#fff" size={22} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Menu</Text>
                <TouchableOpacity style={styles.cartNavBtn} onPress={() => navigation.navigate('Cart')}>
                    <ShoppingCart color="#22973a" size={20} strokeWidth={2.5} />
                </TouchableOpacity>
            </View>

            {/* Filter row 1: Diet + Sort */}
            <View style={styles.filterRow}>
                <TouchableOpacity
                    style={[styles.filterBtn, dietType !== 'All' && styles.filterBtnActive]}
                    onPress={cycleDietType}
                >
                    <Filter size={14} color={dietType !== 'All' ? '#16a34a' : '#64748b'} />
                    <Text style={[styles.filterBtnText, dietType !== 'All' && styles.filterBtnTextActive]}>{dietLabel}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.filterBtn, sortOrder !== 'default' && styles.filterBtnActive]}
                    onPress={cycleSort}
                >
                    <ArrowUpDown size={14} color={sortOrder !== 'default' ? '#16a34a' : '#64748b'} />
                    <Text style={[styles.filterBtnText, sortOrder !== 'default' && styles.filterBtnTextActive]}>{sortLabel}</Text>
                </TouchableOpacity>
                <View style={{ flex: 1 }} />
                <Text style={styles.resultsText}>{products.length} items</Text>
            </View>

            {/* Filter row 2: Categories */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catBar} contentContainerStyle={styles.catScroll}>
                {categories.map(cat => {
                    const active = selectedCategory === cat.id;
                    return (
                        <TouchableOpacity
                            key={String(cat.id)}
                            style={[styles.catChip, active && styles.catChipActive]}
                            onPress={() => setSelectedCategory(cat.id)}
                        >
                            <Text style={[styles.catChipText, active && styles.catChipTextActive]}>{cat.name}</Text>
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>

            {loading ? (
                <View style={styles.loadingBox}>
                    <ActivityIndicator size="large" color="#22973a" />
                </View>
            ) : (
                <FlatList
                    data={products}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.list}
                    renderItem={renderProduct}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        <View style={styles.emptyBox}>
                            <Text style={{ fontSize: 56, marginBottom: 12 }}>🍕</Text>
                            <Text style={styles.emptyText}>No pizzas match your filters.</Text>
                            <TouchableOpacity onPress={() => { setDietType('All'); setSelectedCategory(null); setSortOrder('default'); }}>
                                <Text style={styles.emptyReset}>Reset filters</Text>
                            </TouchableOpacity>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: '#F7F8FA' },

    // Header
    header: {
        backgroundColor: '#22973a', flexDirection: 'row', alignItems: 'center',
        justifyContent: 'space-between', paddingHorizontal: 20, height: 60,
    },
    navBtn: {
        width: 40, height: 40, justifyContent: 'center', alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20,
    },
    headerTitle: { fontSize: 20, fontWeight: '900', color: '#fff' },
    cartNavBtn: {
        width: 40, height: 40, backgroundColor: '#fff', borderRadius: 20,
        justifyContent: 'center', alignItems: 'center',
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3,
    },

    // Filter row
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

    // Category bar
    catBar: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9', maxHeight: 52 },
    catScroll: { paddingHorizontal: 20, paddingVertical: 8, gap: 8, alignItems: 'center' },
    catChip: {
        paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20,
        backgroundColor: '#f1f5f9', borderWidth: 1.5, borderColor: '#e2e8f0',
    },
    catChipActive: { backgroundColor: '#22973a', borderColor: '#22973a' },
    catChipText: { fontSize: 13, fontWeight: '700', color: '#475569' },
    catChipTextActive: { color: '#fff' },

    loadingBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    list: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 },

    // Product card (row layout)
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
    cardCat: { fontSize: 12, fontWeight: '600', color: '#94a3b8', marginTop: 2 },
    cardDesc: { fontSize: 12, color: '#6b7280', lineHeight: 18, marginTop: 4 },
    cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
    cardPrice: { fontSize: 18, fontWeight: '900', color: '#22973a' },
    addBtn: { backgroundColor: '#22973a', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
    addBtnText: { color: '#fff', fontSize: 11, fontWeight: '900' },

    // Empty
    emptyBox: { alignItems: 'center', paddingTop: 60 },
    emptyText: { fontSize: 15, color: '#94a3b8', fontWeight: '600' },
    emptyReset: { fontSize: 14, color: '#22973a', fontWeight: '800', marginTop: 12 },
});
