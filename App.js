import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { CartProvider } from './src/contexts/CartContext';
import AuthNavigator from './src/navigation/AuthNavigator';
import AppNavigator from './src/navigation/AppNavigator';
import SetNameScreen from './src/screens/SetNameScreen';

function Root() {
    const { user, session, loading } = useAuth();

    if (loading) return null;
    if (!session) return <AuthNavigator />;
    if (!user?.user_metadata?.name) return <SetNameScreen />;
    return <AppNavigator />;
}

export default function App() {
    return (
        <SafeAreaProvider>
            <AuthProvider>
                <CartProvider>
                    <NavigationContainer>
                        <Root />
                        <StatusBar style="auto" />
                    </NavigationContainer>
                </CartProvider>
            </AuthProvider>
        </SafeAreaProvider>
    );
}
