import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import HomeScreen from '../screens/HomeScreen';
import MenuScreen from '../screens/MenuScreen';
import CartScreen from '../screens/CartScreen';
import ProfileScreen from '../screens/ProfileScreen';
import ProductDetailScreen from '../screens/ProductDetailScreen';
import OrderHistoryScreen from '../screens/OrderHistoryScreen';
import SavedAddressesScreen from '../screens/SavedAddressesScreen';
import MapPickerScreen from '../screens/MapPickerScreen';
import PaymentMethodsScreen from '../screens/PaymentMethodsScreen';
import OffersScreen from '../screens/OffersScreen';
import SupportScreen from '../screens/SupportScreen';
import AboutScreen from '../screens/AboutScreen';
import LegalScreen from '../screens/LegalScreen';
import OrderSuccessScreen from '../screens/OrderSuccessScreen';
import OrderDetailScreen from '../screens/OrderDetailScreen';
import DeliveryZoneCheckScreen from '../screens/DeliveryZoneCheckScreen';
import StoreSelectScreen from '../screens/StoreSelectScreen';
const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

import { Home, ClipboardList, ShoppingCart, User } from 'lucide-react-native';
import { useCart } from '../contexts/CartContext';

function TabIcon({ label, focused }) {
    const { cartCount } = useCart();
    const iconColor = focused ? '#48d23c' : '#9CA3AF';
    const iconSize = 24;

    const getIcon = () => {
        switch (label) {
            case 'Home': return <Home color={iconColor} size={iconSize} />;
            case 'Menu': return <ClipboardList color={iconColor} size={iconSize} />;
            case 'Cart': return <ShoppingCart color={iconColor} size={iconSize} />;
            case 'Profile': return <User color={iconColor} size={iconSize} />;
            default: return null;
        }
    };

    return (
        <View style={styles.tabIconContainer}>
            <View style={styles.tabIconWrap}>
                {getIcon()}
                {label === 'Cart' && cartCount > 0 && (
                    <View style={styles.tabCartBadge}>
                        <Text style={styles.tabCartBadgeText}>{cartCount}</Text>
                    </View>
                )}
            </View>
            <Text style={[styles.tabLabel, focused && styles.tabLabelActive]} numberOfLines={1}>{label}</Text>
        </View>
    );
}

function HomeTabs() {
    const insets = useSafeAreaInsets();
    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                headerShown: false,
                tabBarShowLabel: false,
                tabBarStyle: [styles.tabBar, {
                    height: 70 + insets.bottom,
                    paddingBottom: 8 + insets.bottom,
                }],
                tabBarIcon: ({ focused }) => <TabIcon label={route.name.replace('Tab', '')} focused={focused} />,
            })}
        >
            <Tab.Screen name="HomeTab" component={HomeScreen} />
            <Tab.Screen name="MenuTab" component={MenuScreen} />
            <Tab.Screen name="CartTab" component={CartScreen} />
            <Tab.Screen name="ProfileTab" component={ProfileScreen} />
        </Tab.Navigator>
    );
}

export default function AppNavigator() {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="StoreSelect" component={StoreSelectScreen} />
            <Stack.Screen name="ZoneCheck" component={DeliveryZoneCheckScreen} />
            <Stack.Screen name="MainTabs" component={HomeTabs} />
            <Stack.Screen name="Menu" component={MenuScreen} />
            <Stack.Screen name="ProductDetail" component={ProductDetailScreen} />
            <Stack.Screen name="Cart" component={CartScreen} />
            <Stack.Screen name="OrderHistory" component={OrderHistoryScreen} />
            <Stack.Screen name="SavedAddresses" component={SavedAddressesScreen} />
            <Stack.Screen name="MapPicker" component={MapPickerScreen} />
            <Stack.Screen name="PaymentMethods" component={PaymentMethodsScreen} />
            <Stack.Screen name="Offers" component={OffersScreen} />
            <Stack.Screen name="Support" component={SupportScreen} />
            <Stack.Screen name="About" component={AboutScreen} />
            <Stack.Screen name="Legal" component={LegalScreen} />
            <Stack.Screen name="OrderSuccess" component={OrderSuccessScreen} options={{ gestureEnabled: false }} />
            <Stack.Screen name="OrderDetail" component={OrderDetailScreen} />
        </Stack.Navigator>
    );
}

const styles = StyleSheet.create({
    tabBar: {
        height: 70,
        backgroundColor: '#fff',
        borderTopWidth: 0,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.08,
        shadowRadius: 16,
        elevation: 12,
        paddingBottom: 8,
        paddingTop: 8,
    },
    tabIconContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 8,
        width: 70,
    },
    tabIconWrap: {
        position: 'relative',
    },
    tabCartBadge: {
        position: 'absolute', top: -4, right: -8,
        backgroundColor: '#ef4444', minWidth: 18, height: 18, borderRadius: 9,
        justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff',
        paddingHorizontal: 2,
    },
    tabCartBadgeText: { color: '#fff', fontSize: 9, fontWeight: '900' },
    tabLabel: {
        fontSize: 11,
        fontWeight: '600',
        color: '#9CA3AF',
        marginTop: 2,
        textAlign: 'center',
    },
    tabLabelActive: {
        color: '#48d23c',
        fontWeight: '700',
    },
});
