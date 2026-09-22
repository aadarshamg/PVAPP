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
import DebugOverlay from './src/components/DebugOverlay';
import { pvLog } from './src/utils/debugLog';

function Root() {
    const { user, session, loading, recoveryMode } = useAuth();

    if (loading) { pvLog('Root: auth loading'); return null; }
    if (recoveryMode) { pvLog('Root -> ResetPasswordScreen'); return <ResetPasswordScreen />; }
    if (!session) { pvLog('Root -> AuthNavigator (no session)'); return <AuthNavigator />; }
    if (!user?.user_metadata?.name) { pvLog('Root -> SetNameScreen (no name)'); return <SetNameScreen />; }
    pvLog('Root -> AppNavigator');
    return <AppNavigator />;
}

export default function App() {
    return (
        <SafeAreaProvider>
            <DebugOverlay />
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
