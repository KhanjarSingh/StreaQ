import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
    View,
    StyleSheet,
    ScrollView,
    Platform,
    TouchableOpacity,
    Pressable,
    Modal,
    TextInput,
    Alert,
    Animated,
    ActivityIndicator,
    AppState,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { AuthContext } from '../context/AuthContext';
import client from '../api/client';
import GoalCard from '../components/GoalCard';

const MONO = Platform.OS === 'ios' ? 'Menlo' : 'monospace';
const HOLD_DURATION_MS = 2000;

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

const HoldToConfirmButton = ({ label, color, disabled, onComplete }) => {
    const progress = useRef(new Animated.Value(0)).current;
    const completedRef = useRef(false);

    const finishHold = useCallback(() => {
        if (completedRef.current) return;
        completedRef.current = true;
        onComplete();
    }, [onComplete]);

    const reset = () => {
        completedRef.current = false;
        progress.stopAnimation();
        Animated.timing(progress, {
            toValue: 0,
            duration: 140,
            useNativeDriver: false,
        }).start();
    };

    const start = () => {
        completedRef.current = false;
        progress.setValue(0);
        Animated.timing(progress, {
            toValue: 1,
            duration: HOLD_DURATION_MS,
            useNativeDriver: false,
        }).start(({ finished }) => {
            if (finished) {
                finishHold();
            }
        });
    };

    const width = progress.interpolate({
        inputRange: [0, 1],
        outputRange: ['0%', '100%'],
    });

    return (
        <Pressable
            disabled={disabled}
            style={[styles.holdButton, { borderColor: color, opacity: disabled ? 0.65 : 1 }]}
            onPressIn={start}
            onPressOut={reset}
        >
            <Animated.View style={[styles.holdFill, { backgroundColor: color, width }]} />
            <Text style={[styles.holdText, { color }]}>{label}</Text>
        </Pressable>
    );
};

const ConfirmModal = ({
    visible,
    goal,
    note,
    onNoteChange,
    onCancel,
    onProceed,
    saving,
    requiresPhoto,
}) => (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
        <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
                <Text style={styles.modalTitle}>CONFIRM_ACTION</Text>
                <Text style={styles.modalSubtitle}>
                    Are you sure you completed {goal?.title ? `[${goal.title.toUpperCase()}]` : '[TASK]'}?
                </Text>
                <Text style={styles.warningText}>
                    False reporting will result in a permanent ban/reset.
                </Text>

                <TextInput
                    style={styles.modalInput}
                    value={note}
                    onChangeText={onNoteChange}
                    placeholder={requiresPhoto ? 'Add a short training note before capturing evidence...' : 'Add a quick completion note...'}
                    placeholderTextColor="#55606D"
                    multiline
                />

                {requiresPhoto ? <Text style={styles.photoHint}>GYM PROTOCOL REQUIRES AN EVIDENCE PHOTO BEFORE COMPLETION.</Text> : null}

                <View style={styles.modalActions}>
                    <TouchableOpacity style={styles.modalCancel} onPress={onCancel}>
                        <Text style={styles.modalCancelText}>[ CANCEL ]</Text>
                    </TouchableOpacity>
                    <HoldToConfirmButton
                        label={saving ? '[ PROCESSING... ]' : '[ PROCEED ]'}
                        color="#00FF41"
                        disabled={saving}
                        onComplete={onProceed}
                    />
                </View>
            </View>
        </View>
    </Modal>
);

const CameraEvidenceModal = ({ visible, onCancel, onCaptured, saving }) => {
    const [permission, requestPermission] = useCameraPermissions();
    const cameraRef = useRef(null);

    useEffect(() => {
        if (visible && !permission?.granted) {
            requestPermission();
        }
    }, [permission?.granted, requestPermission, visible]);

    const takePicture = async () => {
        try {
            const result = await cameraRef.current?.takePictureAsync({ quality: 0.5, base64: false });
            if (result?.uri) {
                onCaptured(result.uri);
            }
        } catch (error) {
            Alert.alert('CAMERA FAILED', 'Unable to capture the evidence photo.');
        }
    };

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
            <View style={styles.cameraOverlay}>
                <View style={styles.cameraCard}>
                    <Text style={styles.modalTitle}>EVIDENCE_CAPTURE</Text>
                    {!permission?.granted ? (
                        <View style={styles.cameraFallback}>
                            <Text style={styles.warningText}>Camera access is required to verify the Gym protocol.</Text>
                            <TouchableOpacity style={styles.cameraAction} onPress={requestPermission}>
                                <Text style={styles.cameraActionText}>[ GRANT CAMERA ]</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <>
                            <CameraView ref={cameraRef} style={styles.cameraView} facing="back" />
                            <View style={styles.cameraActions}>
                                <TouchableOpacity style={styles.modalCancel} onPress={onCancel}>
                                    <Text style={styles.modalCancelText}>[ CANCEL ]</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.cameraAction} onPress={takePicture} disabled={saving}>
                                    <Text style={styles.cameraActionText}>{saving ? '[ SAVING... ]' : '[ CAPTURE ]'}</Text>
                                </TouchableOpacity>
                            </View>
                        </>
                    )}
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
    const [verificationNote, setVerificationNote] = useState('');
    const [showCamera, setShowCamera] = useState(false);
    const [verifying, setVerifying] = useState(false);
    const [failureCountdown, setFailureCountdown] = useState(null);
    const failureTimerRef = useRef(null);
    const authRef = useRef({
        userId: userInfo?.id || null,
        userToken: userToken || null,
        timezone: userInfo?.timezone || 'UTC',
        logout,
    });
    const syncingRef = useRef(false);

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

    useEffect(() => {
        authRef.current = {
            userId: userInfo?.id || null,
            userToken: userToken || null,
            timezone: userInfo?.timezone || 'UTC',
            logout,
        };
    }, [logout, userInfo?.id, userInfo?.timezone, userToken]);

    const fetchProtocols = useCallback(async ({ isActive = () => true, withLoading = false } = {}) => {
        const { userToken: currentToken, timezone: currentTimezone, logout: currentLogout } = authRef.current;

        if (withLoading && isActive()) {
            setLoading(true);
        }

        if (!currentToken) {
            if (isActive()) {
                setLoading(false);
            }
            return;
        }

        try {
            const response = await client.get('/api/goals', {
                headers: { Authorization: `Bearer ${currentToken}` },
            });

            if (!isActive()) return;

            setActiveGoals(response.data?.activeGoals || []);
            setTimezone(response.data?.timezone || currentTimezone || 'UTC');
            setGithubConnected(Boolean(response.data?.githubConnected));
        } catch (error) {
            if (error.response?.status === 401) {
                await currentLogout();
                return;
            }
            if (isActive()) {
                Alert.alert('PROTOCOL FEED LOST', 'Unable to fetch your active protocols right now.');
            }
        } finally {
            if (isActive()) {
                setLoading(false);
            }
        }
    }, []);

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

    const handleSync = useCallback(async ({ isActive = () => true } = {}) => {
        const { userId: currentUserId, userToken: currentToken } = authRef.current;
        if (!currentUserId || !currentToken || syncingRef.current) return;

        syncingRef.current = true;
        setSyncing(true);

        try {
            await client.post('/api/sync', { userId: currentUserId }, {
                headers: { Authorization: `Bearer ${currentToken}` },
            });
            await fetchProtocols({ isActive });
        } catch (error) {
            if (isActive()) {
                Alert.alert('SYNC FAILED', 'The operator HUD could not refresh protocol progress.');
            }
        } finally {
            syncingRef.current = false;
            if (isActive()) {
                setSyncing(false);
            }
        }
    }, [fetchProtocols]);

    useFocusEffect(
        useCallback(() => {
            let isActive = true;

            const fetchAndSync = async () => {
                await handleSync({ isActive: () => isActive });
            };

            fetchAndSync();

            return () => {
                isActive = false;
            };
        }, [])
    );

    useEffect(() => {
        if (!userToken || !userInfo?.id) return undefined;

        const subscription = AppState.addEventListener('change', (state) => {
            if (state === 'active') {
                handleSync();
            }
        });

        return () => subscription.remove();
    }, [handleSync, userInfo?.id, userToken]);

    const resetVerificationFlow = () => {
        setVerificationGoal(null);
        setVerificationNote('');
        setShowCamera(false);
    };

    const submitManualVerification = async (link) => {
        if (!verificationGoal) return;
        setVerifying(true);
        try {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            await client.patch(`/api/goals/${verificationGoal.id}/verify`, {
                note: verificationNote,
                link,
            }, {
                headers: { Authorization: `Bearer ${userToken}` },
            });
            resetVerificationFlow();
            await fetchProtocols();
        } catch (error) {
            Alert.alert('VERIFY FAILED', error.response?.data?.message || 'The manual protocol could not be marked complete.');
        } finally {
            setVerifying(false);
        }
    };

    const handleProceedVerification = async () => {
        if (!verificationGoal) return;
        const goalName = (verificationGoal.manualTaskName || verificationGoal.title || '').toLowerCase();
        const isGymProtocol = goalName.includes('gym');
        if (isGymProtocol) {
            setShowCamera(true);
            return;
        }
        await submitManualVerification(undefined);
    };

    const handleSimulateFailure = async () => {
        const target = activeGoals.find((goal) => !goal.isCompleted) || activeGoals[0];
        if (!target) return;

        if (failureCountdown !== null) return;

        setFailureCountdown(5);
        let secondsLeft = 5;
        failureTimerRef.current = setInterval(() => {
            secondsLeft -= 1;
            if (secondsLeft > 0) {
                setFailureCountdown(secondsLeft);
                return;
            }

            clearInterval(failureTimerRef.current);
            failureTimerRef.current = null;
            setFailureCountdown(null);
            Alert.alert(
                'CONFIRM: Trigger System Failure?',
                'This will dispatch the corruption state for testing.',
                [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: 'Yes',
                        style: 'destructive',
                        onPress: async () => {
                            try {
                                await client.post(`/api/goals/${target.id}/simulate-failure`, {}, {
                                    headers: { Authorization: `Bearer ${userToken}` },
                                });
                                navigation.navigate('FailureGlitch');
                            } catch (error) {
                                Alert.alert('SIMULATION FAILED', 'Could not trigger the failure screen.');
                            }
                        },
                    },
                ]
            );
        }, 1000);
    };

    useEffect(() => {
        return () => {
            if (failureTimerRef.current) {
                clearInterval(failureTimerRef.current);
            }
        };
    }, []);

    const needsConfiguration = activeGoals.find((goal) => goal.requiresConfiguration);
    const isGymVerification = Boolean((verificationGoal?.manualTaskName || verificationGoal?.title || '').toLowerCase().includes('gym'));

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
            <ConfirmModal
                visible={Boolean(verificationGoal)}
                goal={verificationGoal}
                note={verificationNote}
                onNoteChange={setVerificationNote}
                onCancel={resetVerificationFlow}
                onProceed={handleProceedVerification}
                saving={verifying}
                requiresPhoto={isGymVerification}
            />
            <CameraEvidenceModal
                visible={showCamera}
                onCancel={() => setShowCamera(false)}
                onCaptured={submitManualVerification}
                saving={verifying}
            />

            <View style={styles.header}>
                <View>
                    <Text style={styles.eyebrow}>THE OPERATOR'S HUD</Text>
                    <Text style={styles.username}>{displayName}</Text>
                    <Text style={styles.timezone}>TZ IST • {timezone === 'Asia/Kolkata' ? 'LOCKED' : timezone}</Text>
                </View>

                <View style={styles.headerRight}>
                    <View style={styles.onlineChip}>
                        <Animated.View style={[styles.onlineDot, { opacity: pulseAnim }]} />
                        <Text style={styles.onlineText}>ONLINE</Text>
                    </View>
                    <TouchableOpacity style={styles.syncChip} onPress={handleSync} disabled={syncing}>
                        <Text style={styles.syncText}>{syncing ? '[ FORCE_SYNC ]' : '[ FORCE_SYNC ]'}</Text>
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
                        <Text style={styles.emptyTitle}>SYSTEM IDLE: NO PROTOCOLS ACTIVE</Text>
                        <Text style={styles.emptyBody}>
                            Activate only the missions you want StreaQ to monitor. Each protocol tracks its own target, deadline, reminder cadence, and punishment level.
                        </Text>
                        <TouchableOpacity style={styles.emptyButton} onPress={() => navigation.navigate('ProtocolConfig')}>
                            <Text style={styles.emptyButtonText}>[ INITIALIZE NEW PROTOCOL ]</Text>
                        </TouchableOpacity>
                        {!githubConnected ? <Text style={styles.emptyHint}>GitHub OAuth is optional. Manual and LeetCode protocols can be configured immediately.</Text> : null}
                    </View>
                ) : (
                    <>
                        {activeGoals.map((goal) => {
                            const isManualIncomplete = goal.protocolType === 'MANUAL' && !goal.isCompleted;
                            const unitLabel = goal.protocolType === 'GITHUB'
                                ? 'COMMITS'
                                : goal.protocolType === 'LEETCODE'
                                    ? 'SOLVES'
                                    : goal.protocolType === 'CODEFORCES'
                                        ? 'PROBLEMS'
                                        : 'SESSIONS';
                            return (
                                <GoalCard
                                    key={goal.id}
                                    goal={goal}
                                    color={getProtocolColor(goal)}
                                    progressLabel={`${goal.currentCount} / ${goal.targetValue} ${unitLabel}`}
                                    footerLeft={`${goal.nextReminderAt} IST • ${goal.reminderLabel}`}
                                    footerRight={`${goal.dailyDeadline} IST • ${formatCountdown(goal.secondsRemaining)}`}
                                    syncStateLabel={syncing ? '> FETCHING_DATA...' : undefined}
                                    syncStateColor="#FACC15"
                                    syncPulseOpacity={syncing ? pulseAnim : 1}
                                    actionSlot={isManualIncomplete ? (
                                        <TouchableOpacity
                                            style={styles.executeChip}
                                            onPress={() => {
                                                setVerificationGoal(goal);
                                                setVerificationNote('');
                                                setShowCamera(false);
                                            }}
                                        >
                                            <Text style={styles.executeText}>EXECUTE</Text>
                                        </TouchableOpacity>
                                    ) : null}
                                    actionLabel={!isManualIncomplete ? (goal.isCompleted ? 'SECURED' : 'LIVE') : undefined}
                                    onPress={() => {
                                        if (!isManualIncomplete) {
                                            navigation.navigate('ProtocolConfig', { goal, protocolType: goal.protocolType });
                                        }
                                    }}
                                />
                            );
                        })}

                        {failureCountdown !== null ? (
                            <View style={styles.countdownCard}>
                                <Text style={styles.countdownLabel}>{`> INITIATING CORRUPTION IN ${failureCountdown}...`}</Text>
                                <Text style={styles.countdownMeta}>Safety confirm will appear before dispatch.</Text>
                            </View>
                        ) : null}

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
        minHeight: 360,
        justifyContent: 'center',
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
        borderWidth: 2,
        borderColor: '#00FF41',
        paddingVertical: 22,
        alignItems: 'center',
        backgroundColor: 'rgba(0,255,65,0.16)',
    },
    emptyButtonText: {
        color: '#00FF41',
        fontFamily: MONO,
        fontSize: 16,
        fontWeight: '700',
    },
    emptyHint: {
        color: '#6E7681',
        fontFamily: MONO,
        fontSize: 10,
        lineHeight: 16,
        marginTop: 18,
    },
    executeChip: {
        borderWidth: 1,
        borderColor: '#FF9F0A',
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 6,
        backgroundColor: 'rgba(255,159,10,0.08)',
    },
    executeText: {
        color: '#FF9F0A',
        fontFamily: MONO,
        fontSize: 10,
        fontWeight: '700',
    },
    countdownCard: {
        marginTop: 6,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#FF3B30',
        borderRadius: 18,
        padding: 14,
        backgroundColor: 'rgba(255,59,48,0.08)',
    },
    countdownLabel: {
        color: '#FFB4A8',
        fontFamily: MONO,
        fontSize: 11,
        fontWeight: '700',
    },
    countdownMeta: {
        color: '#8B949E',
        fontFamily: MONO,
        fontSize: 10,
        marginTop: 6,
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
        backgroundColor: 'rgba(0,0,0,0.82)',
        justifyContent: 'center',
        padding: 20,
    },
    modalCard: {
        backgroundColor: '#0A1017',
        borderRadius: 22,
        borderWidth: 1,
        borderColor: '#FF3B30',
        padding: 20,
    },
    modalTitle: {
        color: '#FF3B30',
        fontFamily: MONO,
        fontSize: 16,
        fontWeight: '700',
        letterSpacing: 1,
    },
    modalSubtitle: {
        color: '#F0F6FC',
        fontFamily: MONO,
        fontSize: 13,
        marginTop: 12,
        lineHeight: 20,
    },
    warningText: {
        color: '#FFB4A8',
        fontFamily: MONO,
        fontSize: 10,
        lineHeight: 18,
        marginTop: 10,
    },
    photoHint: {
        color: '#FF9F0A',
        fontFamily: MONO,
        fontSize: 10,
        lineHeight: 16,
        marginTop: 10,
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
        marginTop: 16,
    },
    modalActions: {
        flexDirection: 'row',
        gap: 10,
        marginTop: 18,
    },
    modalCancel: {
        flex: 1,
        borderWidth: 1,
        borderColor: '#394150',
        borderRadius: 14,
        paddingVertical: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalCancelText: {
        color: '#8B949E',
        fontFamily: MONO,
        fontSize: 11,
    },
    holdButton: {
        flex: 1,
        minHeight: 48,
        borderWidth: 1,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
        position: 'relative',
        backgroundColor: 'rgba(0,255,65,0.06)',
    },
    holdFill: {
        ...StyleSheet.absoluteFillObject,
        width: '0%',
        opacity: 0.18,
    },
    holdText: {
        fontFamily: MONO,
        fontSize: 11,
        fontWeight: '700',
        zIndex: 1,
    },
    cameraOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.9)',
        justifyContent: 'center',
        padding: 16,
    },
    cameraCard: {
        backgroundColor: '#08111A',
        borderRadius: 22,
        borderWidth: 1,
        borderColor: '#22324A',
        padding: 16,
    },
    cameraFallback: {
        paddingVertical: 24,
    },
    cameraView: {
        height: 360,
        borderRadius: 18,
        overflow: 'hidden',
        marginTop: 16,
    },
    cameraActions: {
        flexDirection: 'row',
        gap: 10,
        marginTop: 14,
    },
    cameraAction: {
        flex: 1,
        borderWidth: 1,
        borderColor: '#00FF41',
        borderRadius: 14,
        paddingVertical: 14,
        alignItems: 'center',
        backgroundColor: 'rgba(0,255,65,0.1)',
    },
    cameraActionText: {
        color: '#00FF41',
        fontFamily: MONO,
        fontSize: 11,
        fontWeight: '700',
    },
});

export default HomeScreen;
