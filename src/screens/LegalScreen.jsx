import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    ScrollView, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft } from 'lucide-react-native';
import { supabase } from '../lib/supabase';

// ─── Shared content primitives ─────────────────────────────────────────────────

function SectionHeading({ number, title }) {
    return (
        <View style={s.sectionHeadingRow}>
            <View style={s.sectionAccent} />
            <View>
                <Text style={s.sectionNumber}>{number}</Text>
                <Text style={s.sectionTitle}>{title}</Text>
            </View>
        </View>
    );
}

function SubHeading({ text }) {
    return <Text style={s.subHeading}>{text}</Text>;
}

function BodyText({ children }) {
    return <Text style={s.bodyText}>{children}</Text>;
}

function BulletList({ items }) {
    return (
        <View style={s.bulletList}>
            {items.map((item, i) => (
                <View key={i} style={s.bulletRow}>
                    <Text style={s.bullet}>•</Text>
                    <Text style={s.bulletText}>{item}</Text>
                </View>
            ))}
        </View>
    );
}

function InfoCard({ children }) {
    return (
        <View style={s.infoCard}>
            <Text style={s.infoCardText}>{children}</Text>
        </View>
    );
}

function LegalTable({ headers, rows }) {
    return (
        <View style={s.table}>
            {/* Header row */}
            <View style={[s.tableRow, s.tableHeader]}>
                {headers.map((h, i) => (
                    <Text key={i} style={[s.tableCell, s.tableHeaderCell, { flex: i === 0 ? 1.2 : 1 }]}>{h}</Text>
                ))}
            </View>
            {rows.map((row, ri) => (
                <View key={ri} style={[s.tableRow, ri % 2 === 1 && s.tableRowAlt]}>
                    {row.map((cell, ci) => (
                        <Text key={ci} style={[s.tableCell, ci === 0 && s.tableCellBold, { flex: ci === 0 ? 1.2 : 1 }]}>{cell}</Text>
                    ))}
                </View>
            ))}
        </View>
    );
}

function Divider() {
    return <View style={s.divider} />;
}

function PolicyCard({ title, content, placeholder }) {
    return (
        <View style={s.policyCard}>
            {title ? <Text style={s.policyTitle}>{title}</Text> : null}
            <Text style={s.policyText}>{content || placeholder}</Text>
        </View>
    );
}

// ─── Section content ───────────────────────────────────────────────────────────

function TermsContent({ content }) {
    return (
        <PolicyCard
            title="Updated Terms & Conditions"
            content={content}
            placeholder="No terms and conditions content has been added yet."
        />
    );
}

function PrivacyContent({ content }) {
    return (
        <PolicyCard
            title="Updated Privacy Policy"
            content={content}
            placeholder="No privacy policy content has been added yet."
        />
    );
}

function RefundContent({ content }) {
    return (
        <PolicyCard
            title="Updated Refund & Cancellation Policy"
            content={content}
            placeholder="No refund and cancellation policy content has been added yet."
        />
    );
}

function ShippingContent({ content }) {
    return (
        <PolicyCard
            title="Updated Delivery Policy"
            content={content}
            placeholder="No delivery policy content has been added yet."
        />
    );
}

function ContactContent() {
    return (
        <>
            <View style={s.contactHero}>
                <Text style={s.contactEmoji}>📬</Text>
                <Text style={s.contactHeroTitle}>Get in Touch</Text>
                <Text style={s.contactHeroSub}>We're here to help. Reach out anytime.</Text>
            </View>

            <LegalTable
                headers={['Purpose', 'Contact']}
                rows={[
                    ['General Support', 'info@pizzavirus.com'],
                    ['Privacy Enquiries', 'info@pizzavirus.com'],
                    ['Legal Notices', 'info@pizzavirus.com'],
                    ['Website', 'www.pizzavirus.com'],
                ]}
            />

            <View style={s.addressCard}>
                <Text style={s.addressLabel}>Registered Office</Text>
                <Text style={s.addressText}>
                    CLOUD PAKASALA PRIVATE LIMITED{'\n'}
                    Plot 356, Simar Enclave, Extension Maheru,{'\n'}
                    Maheru, Kapurthala, Phagwara,{'\n'}
                    Punjab, India — 144411
                </Text>
            </View>

            <View style={s.contactFooter}>
                <Text style={s.contactFooterText}>
                    © 2025 CLOUD PAKASALA PRIVATE LIMITED{'\n'}All Rights Reserved.
                </Text>
                <Text style={s.contactFooterSub}>
                    These policies are subject to change. Continued use of the App after any updates constitutes acceptance of the revised policies.
                </Text>
            </View>
        </>
    );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

const TABS = [
    { key: 'terms',    label: 'Terms' },
    { key: 'privacy',  label: 'Privacy' },
    { key: 'refund',   label: 'Refund' },
    { key: 'shipping', label: 'Shipping' },
    { key: 'contact',  label: 'Contact' },
];

export default function LegalScreen({ navigation, route }) {
    const [activeTab, setActiveTab] = useState(route.params?.section || 'terms');
    const [policyContent, setPolicyContent] = useState({
        terms: '',
        privacy: '',
        refund: '',
        delivery: '',
    });
    const scrollRef = useRef(null);

    useEffect(() => {
        let isMounted = true;

        const loadPolicies = async () => {
            const { data, error } = await supabase.from('store_settings').select('key, value');

            if (!isMounted) return;

            if (!error && data) {
                const nextContent = {
                    terms: '',
                    privacy: '',
                    refund: '',
                    delivery: '',
                };

                data.forEach((item) => {
                    if (item.key === 'terms_conditions_text') nextContent.terms = item.value;
                    if (item.key === 'privacy_policy_text') nextContent.privacy = item.value;
                    if (item.key === 'refund_cancellation_text') nextContent.refund = item.value;
                    if (item.key === 'delivery_policy_text') nextContent.delivery = item.value;
                });

                setPolicyContent(nextContent);
            }
        };

        loadPolicies();

        const channel = supabase.channel('legal-policy-updates')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'store_settings' }, () => {
                loadPolicies();
            })
            .subscribe();

        return () => {
            isMounted = false;
            supabase.removeChannel(channel);
        };
    }, []);

    const handleTabChange = (key) => {
        setActiveTab(key);
        scrollRef.current?.scrollTo({ y: 0, animated: false });
    };

    return (
        <SafeAreaView style={s.safe} edges={['bottom', 'left', 'right']}>
            <StatusBar barStyle="light-content" />

            {/* Header */}
            <View style={s.header}>
                <SafeAreaView edges={['top']}>
                    <View style={s.headerRow}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
                            <ArrowLeft color="#fff" size={24} />
                        </TouchableOpacity>
                        <Text style={s.headerTitle}>Legal & Policies</Text>
                        <View style={{ width: 40 }} />
                    </View>
                </SafeAreaView>
            </View>

            {/* Tab bar */}
            <View style={s.tabBar}>
                {TABS.map(tab => {
                    const active = activeTab === tab.key;
                    return (
                        <TouchableOpacity
                            key={tab.key}
                            style={s.tabBtn}
                            onPress={() => handleTabChange(tab.key)}
                            activeOpacity={0.7}
                        >
                            <Text style={[s.tabLabel, active && s.tabLabelActive]}>
                                {tab.label}
                            </Text>
                            {active && <View style={s.tabUnderline} />}
                        </TouchableOpacity>
                    );
                })}
            </View>

            {/* Content */}
            <ScrollView
                ref={scrollRef}
                contentContainerStyle={s.content}
                showsVerticalScrollIndicator={false}
            >
                {activeTab === 'terms'    && <TermsContent content={policyContent.terms} />}
                {activeTab === 'privacy'  && <PrivacyContent content={policyContent.privacy} />}
                {activeTab === 'refund'   && <RefundContent content={policyContent.refund} />}
                {activeTab === 'shipping' && <ShippingContent content={policyContent.delivery} />}
                {activeTab === 'contact'  && <ContactContent />}
                <View style={{ height: 40 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
    safe: { flex: 1, backgroundColor: '#f8fafc' },

    header: {
        backgroundColor: '#22973a',
    },
    headerRow: {
        flexDirection: 'row', alignItems: 'center',
        justifyContent: 'space-between', paddingHorizontal: 20, height: 60,
    },
    backBtn: {
        width: 40, height: 40, justifyContent: 'center', alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20,
    },
    headerTitle: { fontSize: 20, fontWeight: '900', color: '#fff' },

    // Tab bar
    tabBar: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        borderBottomWidth: 2,
        borderBottomColor: '#f1f5f9',
    },
    tabBtn: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 14,
        position: 'relative',
    },
    tabLabel: { fontSize: 13, fontWeight: '700', color: '#94a3b8' },
    tabLabelActive: { color: '#22973a', fontWeight: '900' },
    tabUnderline: {
        position: 'absolute',
        bottom: -2,
        left: '15%',
        right: '15%',
        height: 3,
        backgroundColor: '#22973a',
        borderRadius: 2,
    },

    content: { padding: 20 },

    // Section headings
    sectionHeadingRow: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 8, marginBottom: 12 },
    sectionAccent: { width: 4, backgroundColor: '#22973a', borderRadius: 2, marginRight: 12, marginTop: 2, alignSelf: 'stretch', minHeight: 36 },
    sectionNumber: { fontSize: 11, fontWeight: '800', color: '#22973a', textTransform: 'uppercase', letterSpacing: 0.5 },
    sectionTitle: { fontSize: 17, fontWeight: '900', color: '#0f172a', marginTop: 2 },

    subHeading: { fontSize: 14, fontWeight: '800', color: '#334155', marginTop: 14, marginBottom: 6 },

    bodyText: { fontSize: 14, color: '#475569', lineHeight: 22, marginBottom: 10 },

    // Bullet list
    bulletList: { marginBottom: 10 },
    bulletRow: { flexDirection: 'row', marginBottom: 6, paddingRight: 8 },
    bullet: { fontSize: 14, color: '#22973a', fontWeight: '800', marginRight: 8, lineHeight: 22 },
    bulletText: { flex: 1, fontSize: 14, color: '#475569', lineHeight: 22 },

    // Info card
    infoCard: {
        backgroundColor: '#f0fdf4', borderLeftWidth: 3, borderLeftColor: '#22973a',
        borderRadius: 10, padding: 14, marginVertical: 12,
    },
    infoCardText: { fontSize: 13, color: '#166534', lineHeight: 20, fontStyle: 'italic' },

    policyCard: {
        backgroundColor: '#fff', borderRadius: 14, padding: 16,
        borderWidth: 1, borderColor: '#e2e8f0',
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
    },
    policyTitle: { fontSize: 15, fontWeight: '800', color: '#0f172a', marginBottom: 10 },
    policyText: { fontSize: 14, color: '#475569', lineHeight: 22 },

    // Table
    table: {
        borderRadius: 12, overflow: 'hidden', marginVertical: 12,
        borderWidth: 1, borderColor: '#e2e8f0',
    },
    tableRow: { flexDirection: 'row', backgroundColor: '#fff' },
    tableRowAlt: { backgroundColor: '#f8fafc' },
    tableHeader: { backgroundColor: '#f1f5f9' },
    tableCell: { flex: 1, padding: 10, fontSize: 12, color: '#475569', lineHeight: 18 },
    tableHeaderCell: { fontSize: 11, fontWeight: '800', color: '#374151', textTransform: 'uppercase', letterSpacing: 0.3 },
    tableCellBold: { fontWeight: '700', color: '#1e293b' },

    divider: { height: 1, backgroundColor: '#e2e8f0', marginVertical: 20 },

    // Contact section
    contactHero: { alignItems: 'center', paddingVertical: 28 },
    contactEmoji: { fontSize: 48 },
    contactHeroTitle: { fontSize: 22, fontWeight: '900', color: '#0f172a', marginTop: 12 },
    contactHeroSub: { fontSize: 14, color: '#64748b', marginTop: 4 },

    addressCard: {
        backgroundColor: '#fff', borderRadius: 14, padding: 16, marginVertical: 12,
        borderWidth: 1, borderColor: '#e2e8f0',
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
    },
    addressLabel: { fontSize: 11, fontWeight: '800', color: '#22973a', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 },
    addressText: { fontSize: 14, color: '#334155', lineHeight: 22 },

    contactFooter: { alignItems: 'center', marginTop: 32, paddingTop: 20, borderTopWidth: 1, borderTopColor: '#e2e8f0' },
    contactFooterText: { fontSize: 13, color: '#64748b', textAlign: 'center', lineHeight: 20, fontWeight: '600' },
    contactFooterSub: { fontSize: 11, color: '#94a3b8', textAlign: 'center', lineHeight: 18, marginTop: 10 },
});
