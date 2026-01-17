import React, { useState, useContext } from 'react';
import { View, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { TextInput, Button, Text, HelperText, IconButton } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthContext } from '../context/AuthContext';

const LoginScreen = ({ navigation }) => {
    // ... context and state ...
    const { login } = useContext(AuthContext);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [secureTextEntry, setSecureTextEntry] = useState(true);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleLogin = async () => {
        if (!email || !password) {
            setError('Missing input parameters.');
            return;
        }
        setError('');
        setLoading(true);
        try {
            await login(email, password);
        } catch (e) {
            let msg = 'Access Denied.';
            if (e.message === 'Network Error' || !e.response) {
                msg = 'Server Unreachable. Check connection.';
            } else if (e.response?.data?.message) {
                msg = e.response.data.message;
            }
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.topBar}>
                <IconButton
                    icon="arrow-left"
                    iconColor="#FFFFFF"
                    size={28}
                    onPress={() => navigation.goBack()}
                    style={styles.backButton}
                />
            </View>

            <View style={styles.header}>
                <Text variant="headlineLarge" style={styles.title}>{'> ACCESS_CONTROL'}</Text>
                <Text variant="bodyLarge" style={styles.subtitle}>// Enter credentials to proceed</Text>
            </View>

            <View style={styles.form}>
                <TextInput
                    label="usr_email"
                    value={email}
                    onChangeText={setEmail}
                    mode="flat"
                    style={styles.input}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    textColor="#FFFFFF"
                    theme={{ colors: { onSurfaceVariant: '#666666' } }} // Label color
                />

                <TextInput
                    label="pass_key"
                    value={password}
                    onChangeText={setPassword}
                    mode="flat"
                    style={styles.input}
                    secureTextEntry={secureTextEntry}
                    right={<TextInput.Icon icon={secureTextEntry ? "eye" : "eye-off"} onPress={() => setSecureTextEntry(!secureTextEntry)} color="#666666" />}
                    textColor="#FFFFFF"
                    theme={{ colors: { onSurfaceVariant: '#666666' } }}
                />

                {error ? <HelperText type="error" visible={!!error} style={styles.mono}>{`>> ERROR: ${error}`}</HelperText> : null}

                <Button
                    mode="contained"
                    onPress={handleLogin}
                    loading={loading}
                    disabled={loading}
                    style={styles.button}
                    contentStyle={styles.buttonContent}
                    labelStyle={styles.buttonLabel}
                >
                    {loading ? 'AUTHENTICATING...' : 'AUTHENTICATE'}
                </Button>

                <TouchableOpacity onPress={() => navigation.navigate('Register')} style={styles.linkContainer}>
                    <Text style={styles.linkText}>{'< New User? Run_Init />'}</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000000',
        padding: 24,
    },
    topBar: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    backButton: {
        margin: 0,
        marginLeft: -12, // Align with the edge padding visually
    },
    header: {
        marginBottom: 48,
    },
    title: {
        color: '#FFFFFF',
        fontWeight: 'bold',
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
        letterSpacing: -1,
    },
    subtitle: {
        color: '#888888',
        marginTop: 8,
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    },
    form: {
        gap: 16,
    },
    input: {
        backgroundColor: '#121212',
        // fontFamily support for input varies, but we can try
    },
    mono: {
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    },
    button: {
        borderRadius: 0,
        marginTop: 16,
        borderWidth: 1,
        borderColor: '#333',
    },
    buttonContent: {
        height: 56,
    },
    buttonLabel: {
        fontSize: 16,
        fontWeight: 'bold',
        letterSpacing: 1,
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    },
    linkContainer: {
        alignItems: 'center',
        marginTop: 24,
    },
    linkText: {
        color: '#888888',
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    },
});

export default LoginScreen;
