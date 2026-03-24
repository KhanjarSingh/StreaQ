import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
    View, StyleSheet, ScrollView, Platform, TouchableOpacity,
    Modal, TextInput, KeyboardAvoidingView, Alert, Animated, ActivityIndicator
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Text, IconButton } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import * as ImagePicker from 'expo-image-picker';
import { AuthContext } from '../context/AuthContext';
import client from '../api/client';
import TerminalConsole from '../components/TerminalConsole';
import GoalCard from '../components/GoalCard';

const MONO = Platform.OS === 'ios' ? 'Menlo' : 'monospace';

Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
    }),
});

// ─── Haptic escalation schedule ───────────────────────────────────────────────
const isTimeNow = (hh, mm) => {
    const now = new Date();
    return now.getHours() === hh && now.getMinutes() === mm;
};

const runHapticSchedule = async () => {
    if (isTimeNow(20, 0)) {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else if (isTimeNow(22, 0)) {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        await new Promise(r => setTimeout(r, 300));
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } else if (isTimeNow(22, 30)) {
        for (let i = 0; i < 4; i++) {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            await new Promise(r => setTimeout(r, 150));
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            await new Promise(r => setTimeout(r, 500));
        }
    }
};

// ─── EvidenceModal ─────────────────────────────────────────────────────────────
const EvidenceModal = ({ visible, goalTitle, onConfirm, onCancel }) => {
    const [note, setNote] = useState('');
    const [link, setLink] = useState('');

    const isGym = goalTitle.toLowerCase().includes('gym');

    const submit = () => {
        if (isGym && !link.trim()) {
            Alert.alert('VALIDATION ERROR', 'Gym tasks REQUIRE photo evidence.');
            return;
        }
        if (!note.trim() && !link.trim()) {
            Alert.alert('VALIDATION ERROR', 'Provide at least a session note or evidence link.');
            return;
        }
        onConfirm({ note: note.trim(), link: link.trim() });
        setNote('');
        setLink('');
    };

    const pickImage = async () => {
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 0.5,
        });
        if (!result.canceled) {
            setLink(result.assets[0].uri);
        }
    };

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
            <KeyboardAvoidingView
                style={styles.modalOverlay}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <View style={styles.modalBox}>
                    <Text style={styles.modalTitle}>{'> MANUAL_VERIFY'}</Text>
                    <Text style={styles.modalSub}>{goalTitle}</Text>

                    <Text style={styles.modalLabel}>Session Note *</Text>
                    <TextInput
                        style={styles.modalInput}
                        placeholder="Describe what you did..."
                        placeholderTextColor="#444"
                        value={note}
                        onChangeText={setNote}
                        multiline
                        numberOfLines={3}
                    />

                    <Text style={styles.modalLabel}>Evidence Link / Photo {isGym ? '*' : '(optional)'}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <TextInput
                            style={[styles.modalInput, { flex: 1, marginBottom: 0 }]}
                            placeholder="Photo URL / GPS / Strava link..."
                            placeholderTextColor="#444"
                            value={link}
                            onChangeText={setLink}
                            autoCapitalize="none"
                        />
                        <TouchableOpacity style={styles.uploadBtn} onPress={pickImage}>
                            <Text style={styles.uploadBtnText}>[+]</Text>
                        </TouchableOpacity>
                    </View>
                    <View style={{ marginBottom: 16 }} />

                    <View style={styles.modalBtns}>
                        <TouchableOpacity style={styles.modalCancelBtn} onPress={onCancel}>
                            <Text style={styles.modalCancelText}>[ ABORT ]</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.modalConfirmBtn} onPress={submit}>
                            <Text style={styles.modalConfirmText}>[ CONFIRM ]</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
};

const PLATFORM_ORDER = { GITHUB: 0, LEETCODE: 1, CODEFORCES: 2, CUSTOM: 3 };

const getClockPartsInTimezone = (date, timezone) => {
    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone || 'UTC',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
    });

    return formatter.formatToParts(date).reduce((acc, part) => {
        if (part.type !== 'literal') acc[part.type] = Number(part.value);
        return acc;
    }, {});
};

const getSecondsRemaining = (checkInterval, timezone, date) => {
    const [targetHour = 0, targetMinute = 0] = (checkInterval || '23:59').split(':').map(Number);
    const { hour = 0, minute = 0, second = 0 } = getClockPartsInTimezone(date, timezone);
    const currentSeconds = (hour * 3600) + (minute * 60) + second;
    let targetSeconds = (targetHour * 3600) + (targetMinute * 60);

    if (targetSeconds < currentSeconds) {
        targetSeconds += 24 * 3600;
    }

    return targetSeconds - currentSeconds;
};

const formatCountdown = (seconds) => {
    const safeSeconds = Math.max(0, seconds);
    const hours = String(Math.floor(safeSeconds / 3600)).padStart(2, '0');
    const minutes = String(Math.floor((safeSeconds % 3600) / 60)).padStart(2, '0');
    const secs = String(safeSeconds % 60).padStart(2, '0');
    return `${hours}:${minutes}:${secs}`;
};

const getStatusMeta = (goals, timezone, date) => {
    if (!goals.length) {
        return {
            label: 'NO TARGETS',
            color: '#8B949E',
            subtitle: 'AWAITING LIVE OBJECTIVES',
        };
    }

    if (goals.every((goal) => goal.isCompleted)) {
        return {
            label: 'SECURED',
            color: '#00FF41',
            subtitle: 'ALL TARGETS VERIFIED',
        };
    }

    const incompleteGoals = goals.filter((goal) => !goal.isCompleted);
    const nearestDeadline = Math.min(...incompleteGoals.map((goal) => getSecondsRemaining(goal.checkInterval, timezone, date)));

    if (nearestDeadline <= 3 * 60 * 60) {
        return {
            label: 'AT RISK',
            color: '#FF2D55',
            subtitle: `${formatCountdown(nearestDeadline)} TO CRITICAL WINDOW`,
        };
    }

    return {
        label: 'MONITORING',
        color: '#FFBD2E',
        subtitle: `${formatCountdown(nearestDeadline)} TO NEXT DEADLINE`,
    };
};

// ─── HomeScreen ────────────────────────────────────────────────────────────────
const HomeScreen = ({ navigation }) => {
    const { logout, userInfo, userToken } = useContext(AuthContext);
    const displayName = userInfo?.username || userInfo?.email?.split('@')[0] || 'Operator';

    const [isLoading, setIsLoading] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);
    const [isSubmittingManual, setIsSubmittingManual] = useState(false);
    const [isSimulatingFailure, setIsSimulatingFailure] = useState(false);
    const [goals, setGoals] = useState([]);
    const [timezone, setTimezone] = useState(userInfo?.timezone || 'UTC');
    const [consoleStatus, setConsoleStatus] = useState('LIVE TELEMETRY STANDBY');
    const [refreshLogsKey, setRefreshLogsKey] = useState(0);
    const [now, setNow] = useState(new Date());
    const [evidenceModal, setEvidenceModal] = useState({ visible: false, goalId: null, goalTitle: '' });

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
        const timer = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        runHapticSchedule();
        const timer = setInterval(runHapticSchedule, 60 * 1000);
        return () => clearInterval(timer);
    }, []);

    // ── Push Notifications ──────────────────────────────────────────────────────
    useEffect(() => {
        if (!userInfo?.id) return;

        registerForPushNotificationsAsync().then(token => {
            if (token) {
                client.patch('/api/users/push-token', { token }).catch(console.error);
            }
        });

        const notificationListener = Notifications.addNotificationReceivedListener(notification => {
            const data = notification.request.content.data;
            if (data?.type === 'CRITICAL') {
                navigation.navigate('FailureGlitch');
            }
        });

        const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
            const data = response.notification.request.content.data;
            if (data?.type === 'CRITICAL') {
                navigation.navigate('FailureGlitch');
            }
        });

        return () => {
            Notifications.removeNotificationSubscription(notificationListener);
            Notifications.removeNotificationSubscription(responseListener);
        };
    }, [navigation, userInfo?.id]);

    async function registerForPushNotificationsAsync() {
        let token;
        if (Device.isDevice) {
            const { status: existingStatus } = await Notifications.getPermissionsAsync();
            let finalStatus = existingStatus;
            if (existingStatus !== 'granted') {
                const { status } = await Notifications.requestPermissionsAsync();
                finalStatus = status;
            }
            if (finalStatus !== 'granted') return null;
            token = (await Notifications.getExpoPushTokenAsync({
                projectId: 'your-expo-project-id' // Optional depending on init
            })).data;
        } else {
            console.warn('[PUSH] Must use physical device for Push Notifications');
        }

        if (Platform.OS === 'android') {
            await Notifications.setNotificationChannelAsync('default', {
                name: 'default',
                importance: Notifications.AndroidImportance.MAX,
                vibrationPattern: [0, 250, 250, 250],
                lightColor: '#FF231F7C',
            });
        }
        return token;
    }

    const fetchGoals = useCallback(async ({ silent = false } = {}) => {
        if (!userToken) return;

        if (!silent) {
            setIsLoading(true);
        }

        try {
            const response = await client.get('/api/goals', {
                headers: { Authorization: `Bearer ${userToken}` },
            });

            const incomingGoals = response.data?.goals || [];
            setGoals(incomingGoals);
            setTimezone(response.data?.timezone || userInfo?.timezone || 'UTC');
            setConsoleStatus(`LIVE TARGETS ONLINE :: ${incomingGoals.length} GOALS TRACKED`);
        } catch (error) {
            if (error.response?.status === 401) {
                await logout();
                return;
            }

            console.error('[HOME_FETCH_GOALS_ERROR]', error.message);
            setConsoleStatus('LINK DEGRADED :: RETRY REQUIRED');
            Alert.alert('LINK DEGRADED', 'Unable to fetch the latest targets from the backend.');
        } finally {
            if (!silent) {
                setIsLoading(false);
            }
        }
    }, [logout, userInfo?.timezone, userToken]);

    useFocusEffect(
        useCallback(() => {
            fetchGoals();
        }, [fetchGoals])
    );

    const handleSync = async () => {
        if (isSyncing || !userInfo?.id) return;
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setIsSyncing(true);
        setConsoleStatus('SYNCING DATA...');
        try {
            await client.post(
                '/api/sync',
                { userId: userInfo.id },
                { headers: { Authorization: `Bearer ${userToken}` } }
            );
            await fetchGoals({ silent: true });
            setRefreshLogsKey((value) => value + 1);
            setConsoleStatus('SYNC COMPLETE :: LIVE COUNTS RECONCILED');
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (error) {
            setConsoleStatus('SYNC FAILURE :: BACKEND UNRESPONSIVE');
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        } finally {
            setIsSyncing(false);
        }
    };

    const onManualTaskPress = (goal) => {
        if (goal.isCompleted) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        setEvidenceModal({ visible: true, goalId: goal.id, goalTitle: goal.title });
    };

    const handleEvidenceConfirm = async ({ note, link }) => {
        const { goalId } = evidenceModal;
        setIsSubmittingManual(true);
        setConsoleStatus('MANUAL OVERRIDE :: VERIFYING EVIDENCE');

        try {
            await client.patch(
                `/api/goals/${goalId}/verify`,
                { note, link },
                { headers: { Authorization: `Bearer ${userToken}` } }
            );

            setEvidenceModal({ visible: false, goalId: null, goalTitle: '' });
            await fetchGoals({ silent: true });
            setRefreshLogsKey((value) => value + 1);
            setConsoleStatus('MANUAL OVERRIDE ACCEPTED');
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (error) {
            setConsoleStatus('MANUAL OVERRIDE REJECTED');
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            Alert.alert('VERIFICATION FAILED', 'The manual target could not be verified.');
        } finally {
            setIsSubmittingManual(false);
        }
    };

    const handleSimulateFailure = async () => {
        if (isSimulatingFailure || goals.length === 0) return;

        const targetGoal = goals.find((goal) => !goal.isCompleted) || goals[0];
        if (!targetGoal) return;

        setIsSimulatingFailure(true);
        setConsoleStatus(`SIMULATING FAILURE :: ${targetGoal.title.toUpperCase()}`);

        try {
            await client.post(
                `/api/goals/${targetGoal.id}/simulate-failure`,
                {},
                { headers: { Authorization: `Bearer ${userToken}` } }
            );
            setRefreshLogsKey((value) => value + 1);
            await fetchGoals({ silent: true });
            navigation.navigate('FailureGlitch');
        } catch (error) {
            Alert.alert('SIMULATION FAILED', 'Unable to trigger the corruption protocol.');
        } finally {
            setIsSimulatingFailure(false);
        }
    };

    const automatedGoals = goals
        .filter((goal) => goal.type === 'AUTOMATED')
        .sort((a, b) => (PLATFORM_ORDER[a.sourcePlatform] ?? 99) - (PLATFORM_ORDER[b.sourcePlatform] ?? 99));
    const manualGoals = goals.filter((goal) => goal.type === 'MANUAL');
    const statusMeta = getStatusMeta(goals, timezone, now);
    const incompleteGoals = goals.filter((goal) => !goal.isCompleted);
    const primaryRemaining = incompleteGoals.length
        ? formatCountdown(Math.min(...incompleteGoals.map((goal) => getSecondsRemaining(goal.checkInterval, timezone, now))))
        : '00:00:00';

    return (
        <SafeAreaView style={styles.container}>
            <EvidenceModal
                visible={evidenceModal.visible}
                goalTitle={evidenceModal.goalTitle}
                onConfirm={handleEvidenceConfirm}
                onCancel={() => setEvidenceModal({ visible: false, goalId: null, goalTitle: '' })}
            />

            <View style={styles.header}>
                <View>
                    <Text style={styles.greeting}>// COMMAND_CENTER_2.0</Text>
                    <Text style={styles.username}>usr: {displayName}</Text>
                    <Text style={styles.timezoneText}>tz: {timezone}</Text>
                </View>
                <View style={styles.headerRight}>
                    <View style={styles.statusBadge}>
                        <View style={[styles.onlineDot, { backgroundColor: isSyncing ? '#FFBD2E' : '#00FF41' }]} />
                        <Text style={[styles.statusText, { color: isSyncing ? '#FFBD2E' : '#00FF41' }]}>
                            {isSyncing ? 'SYNCING' : 'ONLINE'}
                        </Text>
                    </View>
                    <View style={styles.pulseRow}>
                        <Animated.View style={[styles.pulseDot, { opacity: pulseAnim }]} />
                        <Text style={styles.pulseText}>LIVE PULSE</Text>
                    </View>
                </View>
            </View>

            <View style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    <View style={[styles.streakCard, statusMeta.label === 'AT RISK' && styles.streakCardRisk, { borderColor: statusMeta.color }]}>
                        <View style={styles.streakTopRow}>
                            <View>
                                <Text style={[styles.streakEyebrow, { color: statusMeta.color }]}>GLOBAL STREAK STATUS</Text>
                                <Text style={[styles.streakValue, { color: statusMeta.color }]}>{`STATUS: ${statusMeta.label}`}</Text>
                            </View>
                            <IconButton
                                icon={statusMeta.label === 'SECURED' ? 'shield-check' : 'alert-decagram'}
                                iconColor={statusMeta.color}
                                size={24}
                                style={{ margin: 0 }}
                            />
                        </View>

                        <Text style={styles.streakSubtitle}>{statusMeta.subtitle}</Text>

                        <View style={styles.streakMetrics}>
                            <View style={styles.metricBlock}>
                                <Text style={styles.metricLabel}>TIME REMAINING</Text>
                                <Text style={styles.metricValue}>{primaryRemaining}</Text>
                            </View>
                            <View style={styles.metricBlock}>
                                <Text style={styles.metricLabel}>OBJECTIVES</Text>
                                <Text style={styles.metricValue}>{goals.length}</Text>
                            </View>
                        </View>

                        <TouchableOpacity onPress={handleSimulateFailure} style={styles.devBtn} disabled={isSimulatingFailure || goals.length === 0}>
                            <Text style={styles.devBtnText}>
                                {isSimulatingFailure ? '> [TEST] FAILURE PROTOCOL ARMED...' : '> [TEST] SIMULATE FAILURE'}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.sectionHeaderRow}>
                        <View>
                            <Text style={styles.sectionTitle}>{'> TARGET GRID'}</Text>
                            <Text style={styles.sectionSubTitle}>{consoleStatus}</Text>
                        </View>
                        <TouchableOpacity onPress={handleSync} style={styles.syncButton} disabled={isSyncing}>
                            {isSyncing ? <ActivityIndicator size="small" color="#58A6FF" /> : <Text style={styles.syncBtnText}>[ FORCE_SYNC ]</Text>}
                        </TouchableOpacity>
                    </View>

                    {isLoading ? (
                        <View style={styles.loadingCard}>
                            <ActivityIndicator size="small" color="#00FF41" />
                            <Text style={styles.loadingText}>FETCHING LIVE GOALS...</Text>
                        </View>
                    ) : (
                        <>
                            {automatedGoals.map((goal) => (
                                <GoalCard
                                    key={goal.id}
                                    goal={goal}
                                    progressRatio={Math.min(goal.currentCount / Math.max(goal.targetCount, 1), 1)}
                                    timeRemaining={formatCountdown(getSecondsRemaining(goal.checkInterval, timezone, now))}
                                />
                            ))}

                            <Text style={[styles.sectionTitle, { marginTop: 18 }]}>{'> MANUAL OVERRIDES'}</Text>
                            <Text style={styles.sectionSubTitle}>HEAVY CONFIRMATION HAPTICS ENABLED</Text>

                            {manualGoals.map((goal) => (
                                <GoalCard
                                    key={goal.id}
                                    goal={goal}
                                    progressRatio={Math.min(goal.currentCount / Math.max(goal.targetCount, 1), 1)}
                                    timeRemaining={formatCountdown(getSecondsRemaining(goal.checkInterval, timezone, now))}
                                    onPress={() => onManualTaskPress(goal)}
                                    disabled={goal.isCompleted || isSubmittingManual}
                                />
                            ))}
                        </>
                    )}

                    <View style={styles.logSection}>
                        <Text style={styles.sectionTitle}>{'> SYSTEM LOGS'}</Text>
                        <Text style={styles.sectionSubTitle}>LIVE DATABASE FEED :: AUTO-SCROLLING</Text>
                        <View style={{ height: 250 }}>
                            <TerminalConsole
                                userId={userInfo?.id}
                                token={userToken}
                                pollIntervalMs={5000}
                                refreshKey={refreshLogsKey}
                            />
                        </View>
                    </View>

                </ScrollView>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#05070D' },
    scrollContent: { padding: 20, paddingBottom: 40 },
    header: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: 20, marginBottom: 20,
    },
    greeting: { color: '#4B5563', fontFamily: MONO, fontSize: 10, marginBottom: 4 },
    username: { color: '#E6EDF3', fontWeight: 'bold', fontSize: 18, fontFamily: MONO },
    timezoneText: { color: '#58A6FF', fontFamily: MONO, fontSize: 10, marginTop: 4 },
    headerRight: { alignItems: 'flex-end' },
    statusBadge: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#0D1117', paddingHorizontal: 12, paddingVertical: 7,
        borderWidth: 1, borderColor: '#1F2937', borderRadius: 999,
    },
    onlineDot: { width: 8, height: 8, marginRight: 8, borderRadius: 999 },
    statusText: { color: '#00FF41', fontSize: 10, fontWeight: 'bold', fontFamily: MONO, letterSpacing: 1 },
    pulseRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
    pulseDot: { width: 8, height: 8, borderRadius: 999, backgroundColor: '#00FF41', marginRight: 8 },
    pulseText: { color: '#8B949E', fontFamily: MONO, fontSize: 10, letterSpacing: 1 },
    streakCard: {
        backgroundColor: 'rgba(13,17,23,0.92)',
        borderWidth: 1,
        borderRadius: 22,
        padding: 20,
        marginBottom: 24,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.2,
        shadowRadius: 14,
        elevation: 5,
    },
    streakCardRisk: {
        shadowColor: '#FF2D55',
        shadowOpacity: 0.4,
        elevation: 8,
    },
    streakTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    streakEyebrow: { fontFamily: MONO, fontSize: 11, letterSpacing: 1.3, marginBottom: 6 },
    streakValue: { fontFamily: MONO, fontSize: 28, fontWeight: '900', letterSpacing: 1.5 },
    streakSubtitle: { color: '#8B949E', fontFamily: MONO, fontSize: 10, marginTop: 10 },
    streakMetrics: { flexDirection: 'row', gap: 12, marginTop: 18 },
    metricBlock: {
        flex: 1,
        backgroundColor: '#0A0F17',
        borderWidth: 1,
        borderColor: '#18202D',
        borderRadius: 14,
        padding: 12,
    },
    metricLabel: { color: '#6E7681', fontFamily: MONO, fontSize: 9, marginBottom: 6 },
    metricValue: { color: '#E6EDF3', fontFamily: MONO, fontSize: 15, fontWeight: '700' },
    devBtn: { marginTop: 14, alignSelf: 'flex-start' },
    devBtnText: { color: '#FF4D6D', fontFamily: MONO, fontSize: 10, opacity: 0.88 },
    sectionHeaderRow: {
        flexDirection: 'row', justifyContent: 'space-between',
        alignItems: 'center', marginBottom: 16,
    },
    sectionTitle: { color: '#00FF41', fontFamily: MONO, fontWeight: 'bold', fontSize: 14, letterSpacing: 1.2 },
    sectionSubTitle: { color: '#6E7681', fontFamily: MONO, fontSize: 10, marginTop: 4 },
    syncButton: {
        minWidth: 120,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#22324A',
        borderRadius: 999,
        paddingHorizontal: 14,
        paddingVertical: 10,
        backgroundColor: '#08111E',
    },
    syncBtnText: { color: '#58A6FF', fontFamily: MONO, fontSize: 10, fontWeight: 'bold' },
    loadingCard: {
        backgroundColor: '#0C1016',
        borderWidth: 1,
        borderColor: '#18202D',
        borderRadius: 18,
        padding: 18,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 8,
    },
    loadingText: { color: '#8B949E', fontFamily: MONO, fontSize: 11 },
    logSection: { marginTop: 28, marginBottom: 16 },
    modalOverlay: {
        flex: 1, backgroundColor: 'rgba(0,0,0,0.85)',
        justifyContent: 'center', padding: 20,
    },
    modalBox: { backgroundColor: '#0A0A0A', borderWidth: 1, borderColor: '#22324A', padding: 24, borderRadius: 20 },
    modalTitle: { color: '#00FF41', fontFamily: MONO, fontWeight: 'bold', fontSize: 16, marginBottom: 4 },
    modalSub: { color: '#666', fontFamily: MONO, fontSize: 11, marginBottom: 20 },
    modalLabel: { color: '#8B949E', fontFamily: MONO, fontSize: 10, marginBottom: 6 },
    modalInput: {
        backgroundColor: '#111', borderWidth: 1, borderColor: '#333',
        color: '#E0E0E0', fontFamily: MONO, fontSize: 12,
        padding: 12, marginBottom: 16,
    },
    modalBtns: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
    modalCancelBtn: { flex: 1, borderWidth: 1, borderColor: '#333', padding: 12, alignItems: 'center' },
    modalCancelText: { color: '#666', fontFamily: MONO, fontSize: 11 },
    modalConfirmBtn: {
        flex: 1, borderWidth: 1, borderColor: '#00FF41',
        backgroundColor: 'rgba(0,255,65,0.1)', padding: 12, alignItems: 'center',
    },
    modalConfirmText: { color: '#00FF41', fontFamily: MONO, fontSize: 11, fontWeight: 'bold' },
    uploadBtn: {
        marginLeft: 8, padding: 12, borderWidth: 1, borderColor: '#333',
        backgroundColor: '#111', alignItems: 'center', justifyContent: 'center'
    },
    uploadBtnText: { color: '#444', fontFamily: MONO, fontWeight: 'bold' }
});

export default HomeScreen;
