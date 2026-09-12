import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { CartProvider } from './src/contexts/CartContext';
import { StoreProvider } from './src/contexts/StoreContext';
import AuthNavigator from './src/navigation/AuthNavigator';
import AppNavigator from './src/navigation/AppNavigator';
import SetNameScreen from './src/screens/SetNameScreen';
import ResetPasswordScreen from './src/screens/ResetPasswordScreen';

function Root() {
    const { user, session, loading, recoveryMode } = useAuth();

    if (loading) return null;
    if (recoveryMode) return <ResetPasswordScreen />;
    if (!session) return <AuthNavigator />;
    if (!user?.user_metadata?.name) return <SetNameScreen />;
    return <AppNavigator />;
}

export default function App() {
    return (
        <SafeAreaProvider>
            <AuthProvider>
                <StoreProvider>
                    <CartProvider>
                        <NavigationContainer>
                            <Root />
                            <StatusBar style="auto" />
                        </NavigationContainer>
                    </CartProvider>
                </StoreProvider>
            </AuthProvider>
        </SafeAreaProvider>
    );
}
