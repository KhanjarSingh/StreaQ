import React, { useState, useContext } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { TextInput, Button, Text, HelperText, IconButton } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthContext } from '../context/AuthContext';
import GitHubAuthButton from '../components/GitHubAuthButton';

const RegisterScreen = ({ navigation }) => {
    const { register } = useContext(AuthContext);

    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [secureTextEntry, setSecureTextEntry] = useState(true);
    const [confirmSecureTextEntry, setConfirmSecureTextEntry] = useState(true);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const validate = () => {
        if (!username || !email || !password || !confirmPassword) {
            setError('Missing required fields.');
            return false;
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            return false;
        }

        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
        if (!emailPattern.test(email.trim())) {
            setError('Invalid format: usr_email.');
            return false;
        }

        if (password.length < 8) {
            setError('Password complexity error: min length 8.');
            return false;
        }
        if (!/[A-Z]/.test(password)) {
            setError('Password complexity error: missing UPPERCASE.');
            return false;
        }
        if (!/[a-z]/.test(password)) {
            setError('Password complexity error: missing lowercase.');
            return false;
        }
        if (!/\d/.test(password)) {
            setError('Password complexity error: missing digit.');
            return false;
        }
        if (!/[@$!%*?&]/.test(password)) {
            setError('Password complexity error: missing special char.');
            return false;
        }

        return true;
    };

    const handleRegister = async () => {
        if (!validate()) return;

        setError('');
        setLoading(true);
        try {
            await register(username, email, password);
        } catch (e) {
            let msg = 'Registration failed.';
            if (e.message === 'Network Error' || !e.response) {
                msg = 'Server Unreachable. Is it running?';
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
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.topBar}>
                    <TouchableOpacity onPress={() => navigation.navigate('Landing')} style={styles.backButtonRow}>
                        <IconButton icon="arrow-left" iconColor="#FFFFFF" size={24} style={{ margin: 0 }} />
                        <Text style={styles.backText}>Back to Landing</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.header}>
                    <Text variant="headlineLarge" style={styles.title}>{'> JOIN_PROTOCOL'}</Text>
                    <Text variant="bodyLarge" style={styles.subtitle}>// Initialize new user profile</Text>
                </View>

                <View style={styles.form}>
                    <TextInput
                        label="var username"
                        value={username}
                        onChangeText={setUsername}
                        mode="flat"
                        style={styles.input}
                        autoCapitalize="none"
                        textColor="#FFFFFF"
                        theme={{ colors: { onSurfaceVariant: '#666666' } }}
                    />

                    <TextInput
                        label="var email"
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
                        label="var password"
                        value={password}
                        onChangeText={setPassword}
                        mode="flat"
                        style={styles.input}
                        secureTextEntry={secureTextEntry}
                        right={<TextInput.Icon icon={secureTextEntry ? "eye" : "eye-off"} onPress={() => setSecureTextEntry(!secureTextEntry)} color="#666666" />}
                        textColor="#FFFFFF"
                        theme={{ colors: { onSurfaceVariant: '#666666' } }}
                    />

                    <TextInput
                        label="var confirm_password"
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        mode="flat"
                        style={styles.input}
                        secureTextEntry={confirmSecureTextEntry}
                        right={<TextInput.Icon icon={confirmSecureTextEntry ? "eye" : "eye-off"} onPress={() => setConfirmSecureTextEntry(!confirmSecureTextEntry)} color="#666666" />}
                        textColor="#FFFFFF"
                        theme={{ colors: { onSurfaceVariant: '#666666' } }}
                    />

                    {error ? <HelperText type="error" visible={!!error} style={styles.mono}>{`>> ERROR: ${error}`}</HelperText> : null}

                    <Button
                        mode="contained"
                        onPress={handleRegister}
                        loading={loading}
                        disabled={loading}
                        style={styles.button}
                        contentStyle={styles.buttonContent}
                        labelStyle={styles.buttonLabel}
                    >
                        {loading ? 'DEPLOYING...' : 'DEPLOY_USER'}
                    </Button>

                    <View style={styles.dividerContainer}>
                        <View style={styles.divider} />
                        <Text style={styles.dividerText}>OR</Text>
                        <View style={styles.divider} />
                    </View>

                    <GitHubAuthButton onError={setError} />

                    <TouchableOpacity onPress={() => navigation.navigate('Login')} style={styles.linkContainer}>
                        <Text style={styles.linkText}>{'< User Exists? Go_Back />'}</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000000',
    },
    scrollContent: {
        padding: 24,
        flexGrow: 1,
    },
    topBar: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        marginTop: 0,
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
    linkContainer: {
        alignItems: 'center',
        marginTop: 24,
    },
    linkText: {
        color: '#888888',
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    },
});

export default RegisterScreen;
