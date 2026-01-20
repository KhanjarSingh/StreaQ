import React, { useState, useContext, useEffect } from 'react';
import { StyleSheet, Platform } from 'react-native';
import { Button } from 'react-native-paper';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { AuthContext } from '../context/AuthContext';
import client from '../api/client';


WebBrowser.maybeCompleteAuthSession();

const GitHubAuthButton = ({ style, contentStyle, labelStyle, onError }) => {
    const { externalLogin } = useContext(AuthContext);
    const [loading, setLoading] = useState(false);

    const handleRedirect = async (url) => {
        if (!url) return;
        try {
            const parsed = Linking.parse(url);
            if (parsed.queryParams?.token) {
                const token = parsed.queryParams.token;

                client.defaults.headers.common['Authorization'] = `Bearer ${token}`;

                const userRes = await client.get('/api/users/me');
                const user = userRes.data;

                await externalLogin(token, user);
            } else if (parsed.queryParams?.error) {
                const err = 'GitHub Login Failed: ' + parsed.queryParams.error;
                if (onError) onError(err);
                setLoading(false);
            }
        } catch (e) {
            console.error("Deep link error", e);
            if (onError) onError('GitHub Login Failed');
            setLoading(false);
        }
    };

    const handleDeepLink = (event) => {
        handleRedirect(event.url);
    };

    useEffect(() => {
        const subscription = Linking.addEventListener('url', handleDeepLink);
        return () => subscription.remove();
    }, []);

    const signInWithGitHub = async () => {
        setLoading(true);
        if (onError) onError(''); 
        try {
            const redirectUrl = Linking.createURL('auth-callback');
            const authUrl = `${client.defaults.baseURL}/api/auth/github?redirect_uri=${encodeURIComponent(redirectUrl)}`;

            const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUrl);

            if (result.type === 'cancel' || result.type === 'dismiss') {
                setLoading(false);
            } else if (result.type === 'success' && result.url) {
                await handleRedirect(result.url);
            }
        } catch (e) {
            if (onError) onError("Failed to open GitHub login");
            setLoading(false);
        }
    };

    return (
        <Button
            mode="outlined"
            onPress={signInWithGitHub}
            loading={loading}
            disabled={loading}
            icon="github"
            style={[styles.githubButton, style]}
            contentStyle={[styles.buttonContent, contentStyle]}
            labelStyle={[styles.githubButtonLabel, labelStyle]}
            textColor="#FFFFFF"
        >
            {loading ? 'CONNECTING...' : 'INIT_GITHUB_OAUTH'}
        </Button>
    );
};

const styles = StyleSheet.create({
    githubButton: {
        borderRadius: 0,
        borderWidth: 1,
        borderColor: '#444',
        backgroundColor: '#111',
    },
    buttonContent: {
        height: 56,
    },
    githubButtonLabel: {
        fontSize: 16,
        fontWeight: 'bold',
        letterSpacing: 1,
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
        color: '#FFFFFF',
    },
});

export default GitHubAuthButton;
