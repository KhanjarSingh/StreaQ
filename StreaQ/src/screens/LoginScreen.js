
import React, { useState, useContext } from 'react';
import { View, StyleSheet, TouchableOpacity, Platform, KeyboardAvoidingView } from 'react-native';
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
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={{ flex: 1 }}
            >
                <View style={styles.topBar}>
                    <TouchableOpacity onPress={() => navigation.navigate('Landing')} style={styles.backButtonRow}>
                        <IconButton icon="arrow-left" iconColor="#58A6FF" size={20} style={{ margin: 0 }} />
                        <Text style={styles.backText}>cd ..</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.content}>
                    <View style={styles.header}>
                        <Text variant="headlineLarge" style={styles.title}>{'> ACCESS_CONTROL'}</Text>
                        <View style={styles.statusLine}>
                            <View style={styles.statusDot} />
                            <Text style={styles.subtitle}>System Online</Text>
                        </View>
                    </View>

                    <View style={styles.terminalWindow}>
                        <View style={styles.terminalHeader}>
                            <View style={styles.terminalButtons}>
                                <View style={[styles.tBtn, { backgroundColor: '#FF5F56' }]} />
                                <View style={[styles.tBtn, { backgroundColor: '#FFBD2E' }]} />
                                <View style={[styles.tBtn, { backgroundColor: '#27C93F' }]} />
                            </View>
                            <Text style={styles.terminalTitle}>usr_login.sh</Text>
                        </View>

                        <View style={styles.form}>
                            <View style={styles.inputGroup}>
                                <Text style={styles.prompt}>$ user.email</Text>
                                <TextInput
                                    value={email}
                                    onChangeText={setEmail}
                                    mode="outlined"
                                    style={styles.input}
                                    outlineStyle={styles.inputOutline}
                                    contentStyle={styles.inputContent}
                                    autoCapitalize="none"
                                    keyboardType="email-address"
                                    textColor="#C9D1D9"
                                    placeholder="enter email..."
                                    placeholderTextColor="#484F58"
                                    selectionColor="#58A6FF"
                                    theme={{ colors: { primary: '#58A6FF', background: '#0D1117' } }}
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.prompt}>$ user.password</Text>
                                <TextInput
                                    value={password}
                                    onChangeText={setPassword}
                                    mode="outlined"
                                    style={styles.input}
                                    outlineStyle={styles.inputOutline}
                                    contentStyle={styles.inputContent}
                                    secureTextEntry={secureTextEntry}
                                    right={<TextInput.Icon icon={secureTextEntry ? "eye" : "eye-off"} onPress={() => setSecureTextEntry(!secureTextEntry)} color="#484F58" />}
                                    textColor="#C9D1D9"
                                    placeholder="enter password..."
                                    placeholderTextColor="#484F58"
                                    selectionColor="#58A6FF"
                                    theme={{ colors: { primary: '#58A6FF', background: '#0D1117' } }}
                                />
                            </View>

                            {error ? (
                                <View style={styles.errorContainer}>
                                    <Text style={styles.errorPrefix}>[ERROR]</Text>
                                    <Text style={styles.errorText}>{error}</Text>
                                </View>
                            ) : null}

                            <Button
                                mode="contained"
                                onPress={handleLogin}
                                loading={loading}
                                disabled={loading}
                                style={styles.button}
                                contentStyle={styles.buttonContent}
                                labelStyle={styles.buttonLabel}
                            >
                                {loading ? 'AUTHENTICATING...' : './EXECUTE_LOGIN'}
                            </Button>

                            <View style={styles.dividerContainer}>
                                <View style={styles.divider} />
                                <Text style={styles.dividerText}>OR_AUTH_PROVIDER</Text>
                                <View style={styles.divider} />
                            </View>

                            <GitHubAuthButton onError={setError} />
                        </View>
                    </View>

                    <TouchableOpacity onPress={() => navigation.navigate('Register')} style={styles.linkContainer}>
                        <Text style={styles.linkText}>{'< New User? Run_Init />'}</Text>
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0D1117', // GitHub Dark Dimmed content bg
        padding: 20,
    },
    topBar: {
        marginBottom: 20,
    },
    backButtonRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginLeft: -10,
    },
    backText: {
        color: '#58A6FF',
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
        fontSize: 14,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
    },
    header: {
        marginBottom: 24,
    },
    title: {
        color: '#C9D1D9',
        fontWeight: 'bold',
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
        fontSize: 28,
        letterSpacing: -1,
    },
    statusLine: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 8,
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#238636',
        marginRight: 8,
        shadowColor: '#238636',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 4,
    },
    subtitle: {
        color: '#8B949E',
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
        fontSize: 12,
    },
    terminalWindow: {
        backgroundColor: '#161B22',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#30363D',
        overflow: 'hidden',
    },
    terminalHeader: {
        height: 36,
        backgroundColor: '#21262D',
        borderBottomWidth: 1,
        borderBottomColor: '#30363D',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 12,
        position: 'relative',
    },
    terminalButtons: {
        flexDirection: 'row',
        gap: 6,
        position: 'absolute',
        left: 12,
    },
    tBtn: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    terminalTitle: {
        color: '#8B949E',
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
        fontSize: 12,
    },
    form: {
        padding: 24,
        gap: 16,
    },
    inputGroup: {
        gap: 8,
    },
    prompt: {
        color: '#58A6FF',
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
        fontSize: 12,
        marginBottom: 4,
    },
    input: {
        backgroundColor: '#0D1117',
        fontSize: 14,
        height: 48,
    },
    inputOutline: {
        borderColor: '#30363D',
        borderRadius: 4,
    },
    inputContent: {
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
        color: '#C9D1D9',
    },
    errorContainer: {
        flexDirection: 'row',
        backgroundColor: 'rgba(248, 81, 73, 0.1)',
        padding: 12,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: '#F85149',
        alignItems: 'center',
    },
    errorPrefix: {
        color: '#F85149',
        fontWeight: 'bold',
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
        marginRight: 8,
        fontSize: 12,
    },
    errorText: {
        color: '#FF7B72',
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
        fontSize: 12,
        flex: 1,
    },
    button: {
        borderRadius: 4,
        marginTop: 8,
        backgroundColor: '#238636', // GitHub Green
        borderColor: 'transparent',
    },
    buttonContent: {
        height: 48,
    },
    buttonLabel: {
        fontSize: 16,
        fontWeight: 'bold',
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
        color: '#FFFFFF',
    },
    dividerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 12,
    },
    divider: {
        flex: 1,
        height: 1,
        backgroundColor: '#30363D',
    },
    dividerText: {
        color: '#484F58',
        paddingHorizontal: 12,
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
        fontSize: 10,
    },
    linkContainer: {
        alignItems: 'center',
        marginTop: 24,
    },
    linkText: {
        color: '#8B949E',
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
        fontSize: 14,
    },
});

export default LoginScreen;
