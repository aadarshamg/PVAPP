import React, { useState, useRef } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    ScrollView, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft } from 'lucide-react-native';

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

// ─── Section content ───────────────────────────────────────────────────────────

function TermsContent() {
    return (
        <>
            <SectionHeading number="1.1" title="Acceptance of Terms" />
            <BodyText>By accessing or using the Pizza Virus mobile application ("App") or visiting www.pizzavirus.com ("Website"), you acknowledge that you have read, understood, and agree to be bound by these Terms & Conditions. If you do not agree, you must discontinue use of our services immediately.</BodyText>

            <Divider />
            <SectionHeading number="1.2" title="User Rights & Responsibilities" />
            <SubHeading text="Your Rights as a User" />
            <BulletList items={[
                'Access and use the Pizza Virus App to browse menus, place orders, and track deliveries.',
                'Receive accurate information about products, pricing, and estimated delivery times.',
                'Contact our customer support team for assistance with orders and complaints.',
                'Request deletion of your personal account and associated data at any time.',
                'Receive timely refunds in accordance with our Refund Policy.',
            ]} />
            <SubHeading text="Your Responsibilities" />
            <BulletList items={[
                'Provide accurate, current, and complete information when creating an account or placing an order.',
                'Maintain the confidentiality of your login credentials and notify us immediately of any unauthorized access.',
                'Use the App only for lawful purposes and in accordance with these Terms.',
                'Not attempt to reverse engineer, hack, or disrupt the App or its infrastructure.',
                'Ensure you are of legal age (18+) to enter into contracts in your jurisdiction.',
            ]} />

            <Divider />
            <SectionHeading number="1.3" title="Acceptable Use Policy" />
            <BodyText>Users of the Pizza Virus App are prohibited from:</BodyText>
            <BulletList items={[
                'Using the App for any fraudulent, illegal, or unauthorized purpose.',
                'Submitting false orders, fake reviews, or misleading information.',
                'Attempting to gain unauthorized access to other user accounts or our systems.',
                'Transmitting viruses, malware, or any harmful or disruptive code via the App.',
                'Scraping, copying, or reproducing App content without prior written permission.',
                'Harassing, threatening, or abusing our staff, delivery personnel, or other users.',
                'Using automated bots or scripts to place orders or interact with the App.',
            ]} />
            <InfoCard>Violation of this Acceptable Use Policy may result in immediate account suspension or termination without prior notice.</InfoCard>

            <Divider />
            <SectionHeading number="1.4" title="Intellectual Property Rights" />
            <BodyText>All content within the Pizza Virus App and Website — including logos, graphics, text, images, UI design, software code, trademarks, and the "Pizza Virus" brand name — is the exclusive intellectual property of Pizza Virus and its licensors.</BodyText>
            <BulletList items={[
                'You may not reproduce, distribute, modify, or create derivative works from our content without explicit written consent.',
                'The Pizza Virus name, logo, and taglines are registered trademarks and may not be used without authorization.',
                'User-generated content (reviews, photos) remains your property; however, by submitting it, you grant Pizza Virus a worldwide, royalty-free license to use, display, and distribute it.',
                'Any feedback or suggestions provided to us may be used freely without any obligation to compensate you.',
            ]} />

            <Divider />
            <SectionHeading number="1.5" title="Limitation of Liability" />
            <BodyText>To the maximum extent permitted by applicable law, Pizza Virus shall not be liable for:</BodyText>
            <BulletList items={[
                'Indirect, incidental, special, consequential, or punitive damages arising from your use of the App.',
                'Loss of data, revenue, or profits resulting from service interruptions or technical failures.',
                'Inaccuracies in menu items, pricing, or allergen information provided by restaurant partners.',
                'Delays or failures in delivery caused by third-party delivery partners, weather, or unforeseen circumstances.',
                'Any unauthorized access to your account due to your failure to maintain password security.',
            ]} />
            <InfoCard>Our total liability to you shall not exceed the amount paid by you for the specific order in question.</InfoCard>

            <Divider />
            <SectionHeading number="1.6" title="Termination Clauses" />
            <SubHeading text="Termination by You" />
            <BodyText>You may terminate your account at any time by contacting info@pizzavirus.com or using the Delete Account option in App Settings. Pending orders will be fulfilled before termination takes effect.</BodyText>
            <SubHeading text="Termination by Pizza Virus" />
            <BodyText>We reserve the right to suspend or permanently terminate your account without prior notice if:</BodyText>
            <BulletList items={[
                'You violate these Terms & Conditions or the Acceptable Use Policy.',
                'We detect fraudulent activity associated with your account.',
                'You engage in abusive or threatening behaviour toward our team or delivery partners.',
                'We are required to do so by law or court order.',
            ]} />
            <SubHeading text="Effect of Termination" />
            <BulletList items={[
                'Access to the App and all associated data will be revoked immediately.',
                'Unused wallet credits or loyalty points will be forfeited unless otherwise required by law.',
                'Pending refunds for cancelled orders will be processed within the standard refund timeline.',
            ]} />

            <Divider />
            <SectionHeading number="1.7" title="Governing Law & Jurisdiction" />
            <BodyText>These Terms & Conditions are governed by the laws of India, specifically the Information Technology Act, 2000 and the Consumer Protection Act, 2019.</BodyText>
            <BodyText>Any disputes shall be subject to the exclusive jurisdiction of the courts located in Pune, Maharashtra, India.</BodyText>
            <InfoCard>For legal notices: info@pizzavirus.com</InfoCard>
        </>
    );
}

function PrivacyContent() {
    return (
        <>
            <SectionHeading number="2.1" title="Introduction" />
            <BodyText>Pizza Virus is committed to protecting your personal information. This Privacy Policy explains how we collect, use, store, and share your data. This policy complies with:</BodyText>
            <BulletList items={[
                'DPDP Act, 2023 — India\'s Digital Personal Data Protection Act',
                'GDPR — General Data Protection Regulation (EU)',
                'CCPA — California Consumer Privacy Act (USA)',
            ]} />

            <Divider />
            <SectionHeading number="2.2" title="Data We Collect & Why" />
            <LegalTable
                headers={['Data Type', 'What We Collect', 'Why']}
                rows={[
                    ['Personal', 'Name, email, phone number', 'Account creation & order communication'],
                    ['Date of Birth', 'Age verification', 'Personalised birthday offers'],
                    ['Order Data', 'Delivery address, order history', 'Order fulfilment'],
                    ['Payment', 'Payment method type (not card numbers)', 'Transaction processing'],
                    ['Device', 'IP address, OS, App version', 'Security & bug resolution'],
                    ['Location', 'GPS coordinates (with permission)', 'Delivery estimates & nearby restaurants'],
                    ['Usage', 'Browsing history within App', 'Improve recommendations'],
                ]}
            />

            <Divider />
            <SectionHeading number="2.3" title="How We Store & Protect Your Data" />
            <BodyText>Your data is stored on secure, encrypted servers in India, compliant with RBI data localisation requirements. Security measures include:</BodyText>
            <BulletList items={[
                'AES-256 encryption for all stored personal data.',
                'TLS/SSL encryption for all data in transit.',
                'Two-factor authentication (2FA) available for all user accounts.',
                'Regular third-party security audits and penetration testing.',
                'Strict role-based access controls — only authorised personnel can access user data.',
            ]} />
            <BodyText>We retain your personal data for as long as your account is active, or as required by law (typically 5 years for financial records under Indian tax law).</BodyText>

            <Divider />
            <SectionHeading number="2.4" title="Third-Party Data Sharing" />
            <BodyText>We do not sell your personal data. We share limited data with trusted third parties solely to operate our services:</BodyText>
            <LegalTable
                headers={['Third Party', 'Data Shared', 'Purpose']}
                rows={[
                    ['Razorpay / Stripe', 'Transaction details', 'Payment processing'],
                    ['Delivery Partners', 'Name, phone, address', 'Order fulfilment'],
                    ['AWS / Google Cloud', 'Encrypted user data', 'Hosting & infrastructure'],
                    ['Firebase / Analytics', 'Anonymised usage data', 'App improvement'],
                    ['Marketing Platforms', 'Email (with consent only)', 'Promotional communications'],
                ]}
            />
            <BodyText>All partners are bound by data processing agreements and are prohibited from using your data for any other purpose.</BodyText>

            <Divider />
            <SectionHeading number="2.5" title="Your Rights (GDPR & CCPA)" />
            <LegalTable
                headers={['Right', 'Description']}
                rows={[
                    ['Right to Access', 'Request a copy of all personal data we hold about you'],
                    ['Right to Rectification', 'Request correction of inaccurate or incomplete data'],
                    ['Right to Erasure', 'Request deletion of your personal data'],
                    ['Data Portability', 'Receive your data in a machine-readable format'],
                    ['Restrict Processing', 'Pause processing of your data in certain circumstances'],
                    ['Right to Object', 'Opt out of marketing communications at any time'],
                    ['Non-Discrimination', 'We will not discriminate for exercising privacy rights'],
                ]}
            />
            <InfoCard>To exercise any of these rights, email info@pizzavirus.com. We will respond within 30 days.</InfoCard>

            <Divider />
            <SectionHeading number="2.6" title="Cookie Policy" />
            <BodyText>Our Website (www.pizzavirus.com) uses the following types of cookies:</BodyText>
            <LegalTable
                headers={['Cookie Type', 'Purpose', 'Can Be Disabled?']}
                rows={[
                    ['Essential', 'Session management, authentication', 'No'],
                    ['Functional', 'Saved preferences, language settings', 'Yes'],
                    ['Analytics', 'Anonymous usage tracking', 'Yes (consent required)'],
                    ['Marketing', 'Personalised advertisements', 'Yes (consent required)'],
                ]}
            />
            <BodyText>You can manage cookie preferences via the Cookie Settings option in the Website footer or through your browser settings.</BodyText>
        </>
    );
}

function RefundContent() {
    return (
        <>
            <SectionHeading number="3.1" title="Accepted Payment Methods" />
            <LegalTable
                headers={['Method', 'Details']}
                rows={[
                    ['UPI', 'PhonePe, Google Pay, Paytm, BHIM, and all UPI apps'],
                    ['Credit Cards', 'Visa, Mastercard, American Express, RuPay'],
                    ['Debit Cards', 'All major Indian bank debit cards'],
                    ['Net Banking', 'All major Indian banks supported'],
                    ['Pizza Virus Wallet', 'Prepaid wallet loaded via any above method'],
                    ['Cash on Delivery', 'Available in select areas, subject to order value limits'],
                ]}
            />
            <BodyText>All online transactions are processed through Razorpay (PCI-DSS Level 1 certified). Pizza Virus does not store your full card or bank account details.</BodyText>

            <Divider />
            <SectionHeading number="3.2" title="Subscription & Billing Terms" />
            <SubHeading text="Pizza Virus Pro Plans" />
            <LegalTable
                headers={['Plan', 'Price', 'Auto-Renewal']}
                rows={[
                    ['Monthly', '₹149/month', 'Renews monthly on the same date'],
                    ['Annual', '₹999/year', 'Renews annually (saves ₹789 vs monthly)'],
                ]}
            />
            <SubHeading text="Benefits" />
            <BulletList items={[
                'Free delivery on all orders',
                '10% cashback on every order',
                'Priority customer support',
                'Exclusive member deals and early access',
            ]} />
            <SubHeading text="Auto-Renewal" />
            <BulletList items={[
                'Subscriptions auto-renew unless cancelled at least 24 hours before the renewal date.',
                'A reminder email is sent 7 days before your renewal date.',
                'Renewal charges apply to your original payment method on file.',
                'Subscription benefits activate immediately and remain active until end of the current billing period, even after cancellation.',
            ]} />

            <Divider />
            <SectionHeading number="3.3" title="Refund Eligibility & Process" />
            <SubHeading text="✅  Full Refund Eligible" />
            <BulletList items={[
                'Order was cancelled by Pizza Virus or the restaurant before preparation began.',
                'Wrong items were delivered (not matching your order).',
                'Food quality was significantly compromised (spoiled, contaminated, or incorrect).',
                'Order was never delivered but marked as delivered in error.',
                'Technical error caused a duplicate charge on your account.',
            ]} />
            <SubHeading text="⚠️  Partial Refund May Apply" />
            <BulletList items={[
                'One or more items from a multi-item order were missing.',
                'Items were delivered in damaged packaging affecting food quality.',
            ]} />
            <SubHeading text="❌  Refunds Not Applicable" />
            <BulletList items={[
                'Change of mind after the order has been accepted and preparation has begun.',
                'Delays caused by an incorrect delivery address provided by the customer.',
                'Mild taste dissatisfaction that does not constitute a quality defect.',
                'Orders delivered successfully where the customer was unavailable to receive them.',
            ]} />
            <SubHeading text="Refund Process" />
            <BulletList items={[
                'Raise a refund request within 24 hours of delivery via the App (Order History → Report Issue) or email info@pizzavirus.com.',
                'Our team reviews the request within 48 hours and may request photos or additional information.',
                'Approved refunds are processed within 5–7 business days to the original payment method.',
                'You will receive an email confirmation once the refund has been initiated.',
            ]} />

            <Divider />
            <SectionHeading number="3.4" title="Cancellation Policy" />
            <LegalTable
                headers={['Scenario', 'Policy']}
                rows={[
                    ['Within 2 minutes of placing', 'Free cancellation — full refund, no questions asked'],
                    ['After 2 minutes (order accepted)', 'Cancellation may not be possible; partial fee may apply'],
                    ['Restaurant-initiated cancellation', 'Automatic full refund within 5–7 business days'],
                    ['Subscription cancellation', 'Access continues until end of billing period; no partial refunds'],
                ]}
            />

            <Divider />
            <SectionHeading number="3.5" title="Currency & Taxes" />
            <BulletList items={[
                'All prices are displayed in Indian Rupees (INR).',
                'GST is included in all displayed prices. A GST-compliant invoice is available for every order within the App.',
                'International payment cards may incur foreign transaction fees from your bank; Pizza Virus is not responsible for such charges.',
                'Pizza Virus is GST-registered. GSTIN available on request for B2B invoicing.',
            ]} />
        </>
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
    { key: 'terms',   label: 'Terms' },
    { key: 'privacy', label: 'Privacy' },
    { key: 'refund',  label: 'Refund' },
    { key: 'contact', label: 'Contact' },
];

export default function LegalScreen({ navigation, route }) {
    const [activeTab, setActiveTab] = useState(route.params?.section || 'terms');
    const scrollRef = useRef(null);

    const handleTabChange = (key) => {
        setActiveTab(key);
        scrollRef.current?.scrollTo({ y: 0, animated: false });
    };

    return (
        <SafeAreaView style={s.safe}>
            <StatusBar barStyle="light-content" backgroundColor="#22973a" />

            {/* Header */}
            <View style={s.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
                    <ArrowLeft color="#fff" size={24} />
                </TouchableOpacity>
                <Text style={s.headerTitle}>Legal & Policies</Text>
                <View style={{ width: 40 }} />
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
                {activeTab === 'terms'   && <TermsContent />}
                {activeTab === 'privacy' && <PrivacyContent />}
                {activeTab === 'refund'  && <RefundContent />}
                {activeTab === 'contact' && <ContactContent />}
                <View style={{ height: 40 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
    safe: { flex: 1, backgroundColor: '#f8fafc' },

    header: {
        backgroundColor: '#22973a', flexDirection: 'row', alignItems: 'center',
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
