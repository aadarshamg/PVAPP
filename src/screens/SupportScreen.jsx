import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, StatusBar, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, PhoneCall, Mail, HelpCircle } from 'lucide-react-native';

export default function SupportScreen({ navigation }) {
    const handleContact = (type) => {
        if (type === 'phone') Linking.openURL('tel:+917087041010');
        if (type === 'email') Linking.openURL('mailto:info@pizzavirus.com');
    };

    return (
        <SafeAreaView style={styles.safe}>
            <StatusBar barStyle="light-content" backgroundColor="#22973a" />
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <ArrowLeft color="#fff" size={24} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Help & Support</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.heroSection}>
                    <HelpCircle size={64} color="#22973a" />
                    <Text style={styles.heroTitle}>How can we help you?</Text>
                    <Text style={styles.heroSubtitle}>Choose an option below to connect with our support team.</Text>
                </View>

                <TouchableOpacity style={styles.contactCard} onPress={() => handleContact('phone')} activeOpacity={0.8}>
                    <View style={[styles.iconBox, { backgroundColor: '#e0e7ff' }]}>
                        <PhoneCall size={24} color="#4f46e5" />
                    </View>
                    <View style={styles.contactInfo}>
                        <Text style={styles.contactTitle}>Call Us</Text>
                        <Text style={styles.contactSub}>+91 70870 41010</Text>
                    </View>
                </TouchableOpacity>

                <TouchableOpacity style={styles.contactCard} onPress={() => handleContact('email')} activeOpacity={0.8}>
                    <View style={[styles.iconBox, { backgroundColor: '#fce7f3' }]}>
                        <Mail size={24} color="#db2777" />
                    </View>
                    <View style={styles.contactInfo}>
                        <Text style={styles.contactTitle}>Email Us</Text>
                        <Text style={styles.contactSub}>info@pizzavirus.com</Text>
                    </View>
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: '#f8fafc' },
    header: {
        backgroundColor: '#22973a', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 20, height: 60,
    },
    backBtn: {
        width: 40, height: 40, justifyContent: 'center', alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20,
    },
    headerTitle: { fontSize: 20, fontWeight: '900', color: '#ffffff' },
    content: { padding: 20 },
    heroSection: { alignItems: 'center', marginVertical: 30 },
    heroTitle: { fontSize: 22, fontWeight: '900', color: '#0f172a', marginTop: 16 },
    heroSubtitle: { fontSize: 14, color: '#64748b', textAlign: 'center', marginTop: 8, paddingHorizontal: 20 },
    contactCard: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', borderRadius: 16, padding: 16, marginBottom: 16,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
    },
    iconBox: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
    contactInfo: { flex: 1 },
    contactTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
    contactSub: { fontSize: 13, color: '#64748b', marginTop: 2 }
});
