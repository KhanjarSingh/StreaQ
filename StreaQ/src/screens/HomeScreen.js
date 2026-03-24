import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
    View,
    StyleSheet,
    ScrollView,
    Platform,
    TouchableOpacity,
    Modal,
    TextInput,
    Alert,
    Animated,
    ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { AuthContext } from '../context/AuthContext';
import client from '../api/client';
import GoalCard from '../components/GoalCard';

const MONO = Platform.OS === 'ios' ? 'Menlo' : 'monospace';

if (Device.isDevice) {
    Notifications.setNotificationHandler({
        handleNotification: async () => ({
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: false,
        }),
    });
}

const formatCountdown = (seconds) => {
    const safe = Math.max(0, seconds);
    const hh = String(Math.floor(safe / 3600)).padStart(2, '0');
    const mm = String(Math.floor((safe % 3600) / 60)).padStart(2, '0');
    const ss = String(safe % 60).padStart(2, '0');
    return `${hh}:${mm}:${ss}`;
};

const getProtocolColor = (goal) => {
    if (goal.isCompleted) return '#00FF41';
    if (goal.secondsRemaining <= 3600) return '#FF3B30';
    if (goal.secondsRemaining <= 7200) return '#FF9F0A';
    return '#58A6FF';
};

const VerifyModal = ({ visible, goal, onCancel, onConfirm, saving }) => {
    const [note, setNote] = useState('');

    useEffect(() => {
        if (!visible) setNote('');
    }, [visible]);

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
            <View style={styles.modalOverlay}>
                <View style={styles.modalCard}>
                    <Text style={styles.modalTitle}>MANUAL PROTOCOL VERIFY</Text>
                    <Text style={styles.modalSubtitle}>{goal?.title || 'Manual Protocol'}</Text>
                    <TextInput
                        style={styles.modalInput}
                        value={note}
                        onChangeText={setNote}
                        placeholder="What did you complete?"
                        placeholderTextColor="#55606D"
                        multiline
                    />
                    <View style={styles.modalActions}>
                        <TouchableOpacity style={styles.modalCancel} onPress={onCancel}>
                            <Text style={styles.modalCancelText}>[ ABORT ]</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.modalConfirm}
                            disabled={saving}
                            onPress={() => onConfirm(note)}
                        >
                            <Text style={styles.modalConfirmText}>
                                {saving ? '[ VERIFYING... ]' : '[ VERIFY PROTOCOL ]'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const HomeScreen = ({ navigation }) => {
    const { logout, userInfo, userToken } = useContext(AuthContext);
    const displayName = userInfo?.username || userInfo?.email?.split('@')[0] || 'Operator';

    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [activeGoals, setActiveGoals] = useState([]);
    const [timezone, setTimezone] = useState(userInfo?.timezone || 'UTC');
    const [githubConnected, setGithubConnected] = useState(false);
    const [verificationGoal, setVerificationGoal] = useState(null);
    const [verifying, setVerifying] = useState(false);

    const pulseAnim = useRef(new Animated.Value(1)).current;
    useEffect(() => {
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 0.2, duration: 1000, useNativeDriver: true }),
                Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
            ])
        );
        loop.start();
        return () => loop.stop();
    }, []);

    const fetchProtocols = useCallback(async () => {
        if (!userToken) return;

        try {
            const response = await client.get('/api/goals', {
                headers: { Authorization: `Bearer ${userToken}` },
            });

            setActiveGoals(response.data?.activeGoals || []);
            setTimezone(response.data?.timezone || userInfo?.timezone || 'UTC');
            setGithubConnected(Boolean(response.data?.githubConnected));
        } catch (error) {
            if (error.response?.status === 401) {
                await logout();
                return;
            }
            Alert.alert('PROTOCOL FEED LOST', 'Unable to fetch your active protocols right now.');
        } finally {
            setLoading(false);
        }
    }, [logout, userInfo?.timezone, userToken]);

    useFocusEffect(
        useCallback(() => {
            setLoading(true);
            fetchProtocols();
        }, [fetchProtocols])
    );

    useEffect(() => {
        if (!Device.isDevice) {
            console.log('[PROTOCOL_NOTIFICATIONS] Running on simulator or Expo Go. Push registration skipped.');
            return undefined;
        }

        let notificationListener;
        let responseListener;

        const bootstrapNotifications = async () => {
            try {
                const { status: existingStatus } = await Notifications.getPermissionsAsync();
                let finalStatus = existingStatus;
                if (existingStatus !== 'granted') {
                    const { status } = await Notifications.requestPermissionsAsync();
                    finalStatus = status;
                }

                if (finalStatus !== 'granted') {
                    console.log('[PROTOCOL_NOTIFICATIONS] Permission not granted.');
                    return;
                }

                const token = (await Notifications.getExpoPushTokenAsync()).data;
                await client.patch('/api/users/push-token', { token }, {
                    headers: { Authorization: `Bearer ${userToken}` },
                });
            } catch (error) {
                console.log('[PROTOCOL_NOTIFICATIONS] Registration skipped:', error.message);
            }

            notificationListener = Notifications.addNotificationReceivedListener((notification) => {
                if (notification.request.content.data?.type === 'CRITICAL') {
                    navigation.navigate('FailureGlitch');
                }
            });

            responseListener = Notifications.addNotificationResponseReceivedListener((response) => {
                if (response.notification.request.content.data?.type === 'CRITICAL') {
                    navigation.navigate('FailureGlitch');
                }
            });
        };

        bootstrapNotifications();

        return () => {
            if (notificationListener) Notifications.removeNotificationSubscription(notificationListener);
            if (responseListener) Notifications.removeNotificationSubscription(responseListener);
        };
    }, [navigation, userToken]);

    const handleSync = async () => {
        if (!userInfo?.id || syncing) return;
        setSyncing(true);
        try {
            await client.post('/api/sync', { userId: userInfo.id }, {
                headers: { Authorization: `Bearer ${userToken}` },
            });
            await fetchProtocols();
        } catch (error) {
            Alert.alert('SYNC FAILED', 'The operator HUD could not refresh protocol progress.');
        } finally {
            setSyncing(false);
        }
    };

    const handleManualVerify = async (note) => {
        if (!verificationGoal) return;
        setVerifying(true);
        try {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            await client.patch(`/api/goals/${verificationGoal.id}/verify`, { note }, {
                headers: { Authorization: `Bearer ${userToken}` },
            });
            setVerificationGoal(null);
            await fetchProtocols();
        } catch (error) {
            Alert.alert('VERIFY FAILED', 'The manual protocol could not be marked complete.');
        } finally {
            setVerifying(false);
        }
    };

    const handleSimulateFailure = async () => {
        const target = activeGoals.find((goal) => !goal.isCompleted) || activeGoals[0];
        if (!target) return;

        try {
            await client.post(`/api/goals/${target.id}/simulate-failure`, {}, {
                headers: { Authorization: `Bearer ${userToken}` },
            });
            navigation.navigate('FailureGlitch');
        } catch (error) {
            Alert.alert('SIMULATION FAILED', 'Could not trigger the failure screen.');
        }
    };

    const needsConfiguration = activeGoals.find((goal) => goal.requiresConfiguration);

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.centerState}>
                    <ActivityIndicator color="#58A6FF" />
                    <Text style={styles.loadingText}>LOADING OPERATOR HUD...</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <VerifyModal
                visible={Boolean(verificationGoal)}
                goal={verificationGoal}
                onCancel={() => setVerificationGoal(null)}
                onConfirm={handleManualVerify}
                saving={verifying}
            />

            <View style={styles.header}>
                <View>
                    <Text style={styles.eyebrow}>THE OPERATOR'S HUD</Text>
                    <Text style={styles.username}>{displayName}</Text>
                    <Text style={styles.timezone}>TZ {timezone}</Text>
                </View>

                <View style={styles.headerRight}>
                    <View style={styles.onlineChip}>
                        <Animated.View style={[styles.onlineDot, { opacity: pulseAnim }]} />
                        <Text style={styles.onlineText}>ONLINE</Text>
                    </View>
                    <TouchableOpacity style={styles.syncChip} onPress={handleSync} disabled={syncing}>
                        <Text style={styles.syncText}>{syncing ? 'SYNCING...' : 'FORCE SYNC'}</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                {needsConfiguration ? (
                    <TouchableOpacity
                        style={styles.promptCard}
                        onPress={() => navigation.navigate('ProtocolConfig', { goal: needsConfiguration, protocolType: needsConfiguration.protocolType })}
                    >
                        <Text style={styles.promptTitle}>CONFIGURE PROTOCOL</Text>
                        <Text style={styles.promptBody}>
                            {needsConfiguration.protocolType} was initialized with defaults. Review the target, deadline, and reminder intensity before tonight.
                        </Text>
                    </TouchableOpacity>
                ) : null}

                {activeGoals.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyEyebrow}>DISCIPLINE TRACKING, OPT-IN ONLY</Text>
                        <Text style={styles.emptyTitle}>No active protocols armed.</Text>
                        <Text style={styles.emptyBody}>
                            Activate only the missions you want StreaQ to monitor. Each protocol tracks its own target, deadline, reminder cadence, and punishment level.
                        </Text>
                        <TouchableOpacity style={styles.emptyButton} onPress={() => navigation.navigate('ProtocolConfig')}>
                            <Text style={styles.emptyButtonText}>[ INITIALIZE PROTOCOL ]</Text>
                        </TouchableOpacity>
                        {!githubConnected ? <Text style={styles.emptyHint}>GitHub OAuth is optional. Manual and LeetCode protocols can be configured immediately.</Text> : null}
                    </View>
                ) : (
                    <>
                        {activeGoals.map((goal) => (
                            <GoalCard
                                key={goal.id}
                                goal={goal}
                                color={getProtocolColor(goal)}
                                progressLabel={`${goal.currentCount} / ${goal.targetValue} ${goal.protocolType === 'GITHUB' ? 'COMMITS' : goal.protocolType === 'LEETCODE' ? 'SOLVES' : 'SESSIONS'}`}
                                footerLeft={`${goal.nextReminderAt} • ${goal.reminderLabel}`}
                                footerRight={`${goal.dailyDeadline} • ${formatCountdown(goal.secondsRemaining)}`}
                                actionLabel={goal.protocolType === 'MANUAL' && !goal.isCompleted ? 'VERIFY' : goal.isCompleted ? 'SECURED' : 'LIVE'}
                                onPress={() => {
                                    if (goal.protocolType === 'MANUAL' && !goal.isCompleted) {
                                        setVerificationGoal(goal);
                                    } else {
                                        navigation.navigate('ProtocolConfig', { goal, protocolType: goal.protocolType });
                                    }
                                }}
                            />
                        ))}

                        <TouchableOpacity style={styles.failureButton} onPress={handleSimulateFailure}>
                            <Text style={styles.failureButtonText}>[ TEST FAILURE PROTOCOL ]</Text>
                        </TouchableOpacity>
                    </>
                )}
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#06111B',
    },
    centerState: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    loadingText: {
        marginTop: 12,
        color: '#8B949E',
        fontFamily: MONO,
        fontSize: 11,
    },
    header: {
        paddingHorizontal: 20,
        paddingBottom: 12,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    eyebrow: {
        color: '#58A6FF',
        fontFamily: MONO,
        fontSize: 10,
        letterSpacing: 1.2,
    },
    username: {
        color: '#F0F6FC',
        fontFamily: MONO,
        fontSize: 24,
        fontWeight: '800',
        marginTop: 8,
    },
    timezone: {
        color: '#6E7681',
        fontFamily: MONO,
        fontSize: 10,
        marginTop: 6,
    },
    headerRight: {
        alignItems: 'flex-end',
        gap: 10,
    },
    onlineChip: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#19324C',
        borderRadius: 999,
        paddingHorizontal: 12,
        paddingVertical: 8,
        backgroundColor: '#0B1623',
    },
    onlineDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#00FF41',
        marginRight: 8,
    },
    onlineText: {
        color: '#00FF41',
        fontFamily: MONO,
        fontSize: 10,
        fontWeight: '700',
    },
    syncChip: {
        borderWidth: 1,
        borderColor: '#22324A',
        borderRadius: 999,
        paddingHorizontal: 12,
        paddingVertical: 8,
        backgroundColor: '#0B1623',
    },
    syncText: {
        color: '#58A6FF',
        fontFamily: MONO,
        fontSize: 10,
        fontWeight: '700',
    },
    content: {
        padding: 20,
        paddingTop: 8,
        paddingBottom: 40,
    },
    promptCard: {
        marginBottom: 16,
        padding: 16,
        borderRadius: 20,
        backgroundColor: 'rgba(88,166,255,0.08)',
        borderWidth: 1,
        borderColor: '#58A6FF',
    },
    promptTitle: {
        color: '#58A6FF',
        fontFamily: MONO,
        fontSize: 12,
        fontWeight: '700',
        marginBottom: 8,
    },
    promptBody: {
        color: '#C9D1D9',
        fontFamily: MONO,
        fontSize: 11,
        lineHeight: 18,
    },
    emptyState: {
        borderRadius: 28,
        padding: 24,
        backgroundColor: '#0D1621',
        borderWidth: 1,
        borderColor: '#1A2B3F',
    },
    emptyEyebrow: {
        color: '#58A6FF',
        fontFamily: MONO,
        fontSize: 10,
        letterSpacing: 1.2,
    },
    emptyTitle: {
        color: '#F0F6FC',
        fontFamily: MONO,
        fontSize: 28,
        fontWeight: '800',
        marginTop: 14,
    },
    emptyBody: {
        color: '#8B949E',
        fontFamily: MONO,
        fontSize: 12,
        lineHeight: 20,
        marginTop: 14,
    },
    emptyButton: {
        marginTop: 24,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: '#00FF41',
        paddingVertical: 16,
        alignItems: 'center',
        backgroundColor: 'rgba(0,255,65,0.1)',
    },
    emptyButtonText: {
        color: '#00FF41',
        fontFamily: MONO,
        fontSize: 12,
        fontWeight: '700',
    },
    emptyHint: {
        color: '#6E7681',
        fontFamily: MONO,
        fontSize: 10,
        lineHeight: 16,
        marginTop: 18,
    },
    failureButton: {
        marginTop: 8,
        alignItems: 'center',
        paddingVertical: 14,
    },
    failureButtonText: {
        color: '#FF6B6B',
        fontFamily: MONO,
        fontSize: 10,
        fontWeight: '700',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.72)',
        justifyContent: 'center',
        padding: 20,
    },
    modalCard: {
        backgroundColor: '#0D1621',
        borderRadius: 22,
        borderWidth: 1,
        borderColor: '#22324A',
        padding: 20,
    },
    modalTitle: {
        color: '#F0F6FC',
        fontFamily: MONO,
        fontSize: 16,
        fontWeight: '700',
    },
    modalSubtitle: {
        color: '#58A6FF',
        fontFamily: MONO,
        fontSize: 11,
        marginTop: 8,
        marginBottom: 16,
    },
    modalInput: {
        minHeight: 100,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#22324A',
        backgroundColor: '#08111A',
        color: '#E6EDF3',
        fontFamily: MONO,
        fontSize: 12,
        padding: 14,
        textAlignVertical: 'top',
    },
    modalActions: {
        flexDirection: 'row',
        gap: 10,
        marginTop: 16,
    },
    modalCancel: {
        flex: 1,
        borderWidth: 1,
        borderColor: '#2F3B4E',
        borderRadius: 14,
        paddingVertical: 14,
        alignItems: 'center',
    },
    modalCancelText: {
        color: '#8B949E',
        fontFamily: MONO,
        fontSize: 11,
    },
    modalConfirm: {
        flex: 1,
        borderWidth: 1,
        borderColor: '#00FF41',
        borderRadius: 14,
        paddingVertical: 14,
        alignItems: 'center',
        backgroundColor: 'rgba(0,255,65,0.1)',
    },
    modalConfirmText: {
        color: '#00FF41',
        fontFamily: MONO,
        fontSize: 11,
        fontWeight: '700',
    },
});

export default HomeScreen;
