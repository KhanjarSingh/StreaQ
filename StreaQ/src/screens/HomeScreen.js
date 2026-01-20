import React, { useContext } from 'react';
import { View, StyleSheet, ScrollView, Platform } from 'react-native';
import { Button, Text, Surface, IconButton, Avatar } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthContext } from '../context/AuthContext';

const HomeScreen = () => {
    const { logout, userInfo } = useContext(AuthContext);

    const displayName = userInfo?.username || userInfo?.email?.split('@')[0] || 'User';

    const systemLogs = [
        { id: 1, time: '10:42:01', action: 'System Init', status: 'SUCCESS' },
        { id: 2, time: '10:42:05', action: 'Auth Token', status: 'VERIFIED' },
        { id: 3, time: '10:43:12', action: 'Fetch Data', status: 'p.o.m.' },
        { id: 4, time: '10:45:00', action: 'Sync Stream', status: 'WAITING' },
    ];

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <View>
                    <Text variant="bodyMedium" style={styles.greeting}>// WELCOME_BACK</Text>
                    <Text variant="headlineMedium" style={styles.username}>{displayName}</Text>
                </View>
                <Surface style={styles.statusBadge} elevation={0}>
                    <View style={styles.onlineDot} />
                    <Text style={styles.statusText}>ONLINE</Text>
                </Surface>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                {/* Dashboard Widgets */}
                <View style={styles.grid}>
                    <Surface style={styles.card} elevation={0}>
                        <View style={styles.cardHeader}>
                            <IconButton icon="fire" iconColor="#FF7B72" size={20} style={styles.cardIcon} />
                            <Text style={styles.cardTitle}>STREAK</Text>
                        </View>
                        <Text variant="displayMedium" style={styles.statValue}>0</Text>
                        <Text style={styles.statLabel}>DAYS_ACTIVE</Text>
                    </Surface>

                    <Surface style={styles.card} elevation={0}>
                        <View style={styles.cardHeader}>
                            <IconButton icon="checkbox-marked-circle-outline" iconColor="#238636" size={20} style={styles.cardIcon} />
                            <Text style={styles.cardTitle}>TASKS</Text>
                        </View>
                        <Text variant="displayMedium" style={styles.statValue}>5</Text>
                        <Text style={styles.statLabel}>PENDING</Text>
                    </Surface>
                </View>

                {/* Main Action Area */}
                <Surface style={styles.actionCard} elevation={0}>
                    <Text style={styles.actionTitle}>CURRENT_OBJECTIVE</Text>
                    <Text style={styles.actionDesc}>No active coding session detected. Initialize a new session to maintain streak.</Text>
                    <Button
                        mode="contained"
                        onPress={() => alert('Starting Session...')}
                        style={styles.actionButton}
                        contentStyle={{ height: 48 }}
                        labelStyle={styles.actionButtonLabel}
                        icon="console-line"
                    >
                        INIT_SESSION
                    </Button>
                </Surface>

                {/* System Logs */}
                <View style={styles.logSection}>
                    <Text style={styles.sectionTitle}>{'> SYSTEM_LOGS'}</Text>
                    <View style={styles.terminalWindow}>
                        {systemLogs.map((log) => (
                            <Text key={log.id} style={styles.logLine}>
                                <Text style={styles.logTime}>[{log.time}]</Text>
                                <Text style={styles.logAction}> {log.action}</Text>
                                <Text style={styles.logStatus}>...{log.status}</Text>
                            </Text>
                        ))}
                        <Text style={styles.cursor}>_</Text>
                    </View>
                </View>

            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0D1117',
    },
    scrollContent: {
        padding: 20,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 24,
    },
    greeting: {
        color: '#8B949E',
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
        marginBottom: 4,
    },
    username: {
        color: '#C9D1D9',
        fontWeight: 'bold',
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#161B22',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#30363D',
    },
    onlineDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#238636',
        marginRight: 8,
    },
    statusText: {
        color: '#238636',
        fontSize: 10,
        fontWeight: 'bold',
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    },
    grid: {
        flexDirection: 'row',
        gap: 16,
        marginBottom: 24,
    },
    card: {
        flex: 1,
        backgroundColor: '#161B22',
        padding: 16,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#30363D',
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    cardIcon: {
        margin: 0,
        marginRight: 4,
    },
    cardTitle: {
        color: '#8B949E',
        fontSize: 12,
        fontWeight: 'bold',
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    },
    statValue: {
        color: '#C9D1D9',
        fontWeight: 'bold',
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    },
    statLabel: {
        color: '#8B949E',
        fontSize: 10,
        marginTop: 4,
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    },
    actionCard: {
        backgroundColor: '#161B22',
        padding: 20,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#30363D',
        marginBottom: 24,
    },
    actionTitle: {
        color: '#58A6FF',
        fontSize: 14,
        fontWeight: 'bold',
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
        marginBottom: 8,
    },
    actionDesc: {
        color: '#8B949E',
        fontSize: 14,
        marginBottom: 20,
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    },
    actionButton: {
        backgroundColor: '#238636',
        borderRadius: 6,
    },
    actionButtonLabel: {
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
        fontSize: 14,
        fontWeight: 'bold',
        color: '#FFFFFF',
    },
    logSection: {
        gap: 12,
    },
    sectionTitle: {
        color: '#C9D1D9',
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
        fontWeight: 'bold',
        fontSize: 16,
    },
    terminalWindow: {
        backgroundColor: '#000000',
        padding: 16,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#30363D',
    },
    logLine: {
        color: '#C9D1D9',
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
        fontSize: 12,
        marginBottom: 4,
    },
    logTime: { color: '#8B949E' },
    logAction: { color: '#E1E4E8' },
    logStatus: { color: '#238636' },
    cursor: {
        color: '#58A6FF',
        fontWeight: 'bold',
    },
});

export default HomeScreen;
