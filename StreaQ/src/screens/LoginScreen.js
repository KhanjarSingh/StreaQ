
import React, { useState, useContext, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { TextInput, Button, Text, HelperText, IconButton } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthContext } from '../context/AuthContext';
import GitHubAuthButton from '../components/GitHubAuthButton';

const LoginScreen = ({ navigation }) => {
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
                <TouchableOpacity onPress={() => navigation.navigate('Landing')} style={styles.backButtonRow}>
                    <IconButton icon="arrow-left" iconColor="#FFFFFF" size={24} style={{ margin: 0 }} />
                    <Text style={styles.backText}>Back to Landing</Text>
                </TouchableOpacity>
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
                    theme={{ colors: { onSurfaceVariant: '#666666' } }}
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

                {error ? <HelperText type="error" visible={!!error} style={styles.mono}>{`>> ERROR: ${error} `}</HelperText> : null}

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

                <View style={styles.dividerContainer}>
                    <View style={styles.divider} />
                    <Text style={styles.dividerText}>OR</Text>
                    <View style={styles.divider} />
                </View>

                <GitHubAuthButton onError={setError} />

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
        marginBottom: 16,
    },
    backButtonRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginLeft: -4,
    },
    backText: {
        color: '#FFFFFF',
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
        marginLeft: 4,
        fontSize: 16,
    },
    header: {
        marginBottom: 32,
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
    },
    mono: {
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    },
    button: {
        borderRadius: 0,
        marginTop: 8,
        borderWidth: 1,
        borderColor: '#333',
        backgroundColor: '#FFFFFF',
    },
    buttonContent: {
        height: 56,
    },
    buttonLabel: {
        fontSize: 16,
        fontWeight: 'bold',
        letterSpacing: 1,
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
        color: '#000000',
    },
    dividerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 16,
    },
    divider: {
        flex: 1,
        height: 1,
        backgroundColor: '#333',
    },
    dividerText: {
        color: '#666',
        paddingHorizontal: 16,
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
        fontSize: 12,
    },
    githubButton: {
        borderRadius: 0,
        borderWidth: 1,
        borderColor: '#444',
        backgroundColor: '#111',
    },
    githubButtonLabel: {
        fontSize: 16,
        fontWeight: 'bold',
        letterSpacing: 1,
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
        color: '#FFFFFF',
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
