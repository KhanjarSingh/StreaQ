import React, { useContext } from 'react';
import { View, StyleSheet } from 'react-native';
import { Button, Text, Surface, Avatar } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthContext } from '../context/AuthContext';

const HomeScreen = () => {
    const { logout, userInfo } = useContext(AuthContext);

    const displayName = userInfo?.username || userInfo?.email?.split('@')[0] || 'User';

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <View>
                    <Text variant="headlineMedium" style={styles.greeting}>Welcome,</Text>
                    <Text variant="headlineLarge" style={styles.username}>{displayName}</Text>
                </View>
                <Avatar.Icon size={50} icon="account" style={{ backgroundColor: '#333' }} />
            </View>

            <Surface style={styles.card} elevation={1}>
                <Text variant="titleLarge" style={styles.cardTitle}>Current Streak</Text>
                <View style={styles.streakContainer}>
                    <Text variant="displayLarge" style={styles.streakCount}>0</Text>
                    <Text variant="bodyLarge" style={styles.streakLabel}>DAYS</Text>
                </View>
                <Text style={styles.comingSoon}>Tracking starts soon.</Text>
            </Surface>

            <View style={styles.actions}>
                <Button
                    mode="contained"
                    onPress={() => alert('Feature coming soon!')}
                    style={styles.actionButton}
                    contentStyle={{ height: 60 }}
                >
                    LOG ACTIVITY
                </Button>

                <Button
                    mode="outlined"
                    onPress={logout}
                    style={styles.logoutButton}
                    textColor="#FF4444"
                >
                    LOGOUT
                </Button>
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
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 40,
        marginTop: 20,
    },
    greeting: {
        color: '#888888',
    },
    username: {
        color: '#FFFFFF',
        fontWeight: 'bold',
    },
    card: {
        backgroundColor: '#121212',
        padding: 24,
        borderRadius: 0,
        marginBottom: 32,
        alignItems: 'center',
    },
    cardTitle: {
        color: '#888888',
        marginBottom: 16,
    },
    streakContainer: {
        alignItems: 'baseline',
        flexDirection: 'row',
        gap: 8,
    },
    streakCount: {
        color: '#FFFFFF',
        fontWeight: 'bold',
        fontSize: 80,
        lineHeight: 80,
    },
    streakLabel: {
        color: '#888888',
        fontWeight: 'bold',
    },
    comingSoon: {
        color: '#444444',
        marginTop: 16,
        fontStyle: 'italic',
    },
    actions: {
        marginTop: 'auto',
        gap: 16,
    },
    actionButton: {
        borderRadius: 0,
    },
    logoutButton: {
        borderRadius: 0,
        borderColor: '#333333',
    },
});

export default HomeScreen;
