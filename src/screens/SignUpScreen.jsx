import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { UserPlus } from 'lucide-react-native';
import { useAuth } from '../contexts/AuthContext';
import AuthSubScreen, { authSubStyles } from '../components/AuthSubScreen';
import { isValidPassword, PASSWORD_HINT } from '../utils/passwordValidation';

export default function SignUpScreen({ navigation }) {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const { signUp } = useAuth();

    const handleSignUp = async () => {
        if (!name || !email || !password) {
            Alert.alert('Error', 'Please fill in all fields');
            return;
        }
        if (!isValidPassword(password)) {
            Alert.alert('Error', `Password must be ${PASSWORD_HINT.toLowerCase()}`);
            return;
        }
        setLoading(true);
        try {
            await signUp(email, password, name);
            navigation.navigate('VerifyOtp', { email });
        } catch (error) {
            Alert.alert('Sign Up Failed', error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthSubScreen
            onBack={() => navigation.navigate('Login')}
            icon={<UserPlus size={48} color="#22973a" strokeWidth={1.5} style={{ marginBottom: 12 }} />}
            title="Create Account"
            subtitle="Join Pizza Virus for delicious deals"
        >
            <View style={authSubStyles.card}>
                <View style={authSubStyles.inputGroup}>
                    <Text style={authSubStyles.label}>Full Name</Text>
                    <TextInput
                        style={authSubStyles.input}
                        placeholder="Your full name"
                        placeholderTextColor="#9CA3AF"
                        value={name}
                        onChangeText={setName}
                        autoFocus
                    />
                </View>

                <View style={authSubStyles.inputGroup}>
                    <Text style={authSubStyles.label}>Email</Text>
                    <TextInput
                        style={authSubStyles.input}
                        placeholder="you@example.com"
                        placeholderTextColor="#9CA3AF"
                        value={email}
                        onChangeText={setEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                    />
                </View>

                <View style={authSubStyles.inputGroup}>
                    <Text style={authSubStyles.label}>Password</Text>
                    <TextInput
                        style={authSubStyles.input}
                        placeholder={PASSWORD_HINT}
                        placeholderTextColor="#9CA3AF"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                    />
                </View>

                <TouchableOpacity
                    style={[authSubStyles.primaryBtn, loading && authSubStyles.btnDisabled]}
                    onPress={handleSignUp}
                    disabled={loading}
                    activeOpacity={0.85}
                >
                    {loading
                        ? <ActivityIndicator color="#fff" />
                        : <Text style={authSubStyles.primaryBtnText}>Create Account</Text>
                    }
                </TouchableOpacity>

                <TouchableOpacity style={authSubStyles.linkBtn} onPress={() => navigation.navigate('Login')}>
                    <Text style={authSubStyles.linkText}>
                        Already have an account? <Text style={authSubStyles.linkBold}>Sign In</Text>
                    </Text>
                </TouchableOpacity>
            </View>
        </AuthSubScreen>
    );
}
