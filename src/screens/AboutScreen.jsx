import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, StatusBar, Image, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, ShieldCheck, FileText, RefreshCw, Truck, Mail } from 'lucide-react-native';

const LOGO = require('../../assets/images/logo.png');

export default function AboutScreen({ navigation }) {
    return (
        <SafeAreaView style={styles.safe} edges={['bottom', 'left', 'right']}>
            <StatusBar barStyle="light-content" />
            <View style={styles.header}>
                <SafeAreaView edges={['top']}>
                    <View style={styles.headerRow}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                            <ArrowLeft color="#fff" size={24} />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>About</Text>
                        <View style={{ width: 40 }} />
                    </View>
                </SafeAreaView>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.logoSection}>
                    <View style={styles.logoBox}>
                        <Image source={LOGO} style={styles.logoImg} />
                    </View>
                    <Text style={styles.appName}>Pizza Virus</Text>
                    <Text style={styles.version}>Version 2.0.1</Text>
                    <TouchableOpacity onPress={() => Linking.openURL('https://www.falqonstudio.com')}>
                        <Text style={styles.devBy}>Developed by <Text style={styles.devByLink}>Falqon Studio</Text></Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.linksContainer}>
                    <TouchableOpacity style={styles.linkItem} onPress={() => navigation.navigate('Legal', { section: 'terms' })}>
                        <View style={styles.linkLeft}>
                            <FileText size={20} color="#475569" />
                            <Text style={styles.linkText}>Terms & Conditions</Text>
                        </View>
                        <Text style={styles.linkArrow}>›</Text>
                    </TouchableOpacity>

                    <View style={styles.divider} />

                    <TouchableOpacity style={styles.linkItem} onPress={() => navigation.navigate('Legal', { section: 'privacy' })}>
                        <View style={styles.linkLeft}>
                            <ShieldCheck size={20} color="#475569" />
                            <Text style={styles.linkText}>Privacy Policy</Text>
                        </View>
                        <Text style={styles.linkArrow}>›</Text>
                    </TouchableOpacity>

                    <View style={styles.divider} />

                    <TouchableOpacity style={styles.linkItem} onPress={() => navigation.navigate('Legal', { section: 'refund' })}>
                        <View style={styles.linkLeft}>
                            <RefreshCw size={20} color="#475569" />
                            <Text style={styles.linkText}>Refund Policy</Text>
                        </View>
                        <Text style={styles.linkArrow}>›</Text>
                    </TouchableOpacity>

                    <View style={styles.divider} />

                    <TouchableOpacity style={styles.linkItem} onPress={() => navigation.navigate('Legal', { section: 'shipping' })}>
                        <View style={styles.linkLeft}>
                            <Truck size={20} color="#475569" />
                            <Text style={styles.linkText}>Shipping Policy</Text>
                        </View>
                        <Text style={styles.linkArrow}>›</Text>
                    </TouchableOpacity>

                    <View style={styles.divider} />

                    <TouchableOpacity style={styles.linkItem} onPress={() => navigation.navigate('Legal', { section: 'contact' })}>
                        <View style={styles.linkLeft}>
                            <Mail size={20} color="#475569" />
                            <Text style={styles.linkText}>Contact Us</Text>
                        </View>
                        <Text style={styles.linkArrow}>›</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.footerInfo}>
                    <Text style={styles.footerTagline}>Hunger is a Deadly Virus</Text>
                    <Text style={styles.footerCopy}>© 2025 CLOUD PAKASALA PRIVATE LIMITED. All Rights Reserved.</Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: '#f8fafc' },
    header: {
        backgroundColor: '#22973a',
    },
    headerRow: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 20, height: 60,
    },
    backBtn: {
        width: 40, height: 40, justifyContent: 'center', alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20,
    },
    headerTitle: { fontSize: 20, fontWeight: '900', color: '#ffffff' },
    content: { padding: 20 },
    logoSection: { alignItems: 'center', marginVertical: 40 },
    logoBox: { width: 110, height: 110, borderRadius: 30, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 10, elevation: 5 },
    logoImg: { width: '100%', height: '100%', resizeMode: 'cover' },
    appName: { fontSize: 24, fontWeight: '900', color: '#0f172a', marginTop: 20 },
    version: { fontSize: 14, color: '#64748b', marginTop: 6 },
    devBy: { fontSize: 13, color: '#94a3b8', textAlign: 'center', marginTop: 6 },
    devByLink: { color: '#22973a', fontWeight: '700', textDecorationLine: 'underline' },
    linksContainer: {
        backgroundColor: '#ffffff', borderRadius: 16, padding: 8,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
    },
    linkItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
    linkLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    linkText: { fontSize: 16, fontWeight: '600', color: '#334155' },
    linkArrow: { fontSize: 24, color: '#cbd5e1', fontWeight: '500' },
    divider: { height: 1, backgroundColor: '#f1f5f9', marginHorizontal: 16 },
    footerInfo: { alignItems: 'center', marginTop: 40 },
    footerTagline: { fontSize: 16, fontWeight: '800', color: '#22973a', fontStyle: 'italic' },
    footerCopy: { fontSize: 12, color: '#94a3b8', marginTop: 8 },
});
