import React, { useContext, useEffect, useState, useRef } from 'react';
import {
    View, StyleSheet, ScrollView, Platform, TouchableOpacity,
    Modal, TextInput, KeyboardAvoidingView, Alert, Animated
} from 'react-native';
import { Text, Surface, IconButton } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import * as ImagePicker from 'expo-image-picker';
import { AuthContext } from '../context/AuthContext';
import client from '../api/client';
import TerminalConsole from '../components/TerminalConsole';

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

// ─── HomeScreen ────────────────────────────────────────────────────────────────
const HomeScreen = ({ navigation }) => {
    const { userInfo, userToken } = useContext(AuthContext);
    const displayName = userInfo?.username || userInfo?.email?.split('@')[0] || 'Operator';

    const [isSyncing, setIsSyncing] = useState(false);
    const [goals, setGoals] = useState([
        { id: 'g1', title: 'GitHub Commits', type: 'AUTOMATED', targetCount: 3, currentCount: 1, isCompleted: false },
        { id: 'g2', title: 'LeetCode Daily', type: 'AUTOMATED', targetCount: 1, currentCount: 0, isCompleted: false },
        { id: 'g3', title: 'Deep Work (4hrs)', type: 'MANUAL', targetCount: 1, currentCount: 1, isCompleted: true },
        { id: 'g4', title: 'Gym (Hypertrophy)', type: 'MANUAL', targetCount: 1, currentCount: 0, isCompleted: false },
    ]);
    const [evidenceModal, setEvidenceModal] = useState({ visible: false, goalId: null, goalTitle: '' });

    // ── Pulse animation (RN Animated — no JSI) ────────────────────────────────
    const pulseAnim = useRef(new Animated.Value(1)).current;
    useEffect(() => {
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 0.4, duration: 800, useNativeDriver: true }),
                Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
            ])
        );
        loop.start();
        return () => loop.stop();
    }, []);

    // ── Haptic scheduler ──────────────────────────────────────────────────────
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
    }, [userInfo?.id]);

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

    // ── Force Sync ─────────────────────────────────────────────────────────────
    const handleSync = async () => {
        if (isSyncing || !userInfo?.id) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setIsSyncing(true);
        try {
            const response = await client.post('/api/sync', { userId: userInfo.id });
            if (response.data?.syncedGoals?.length) {
                const synced = response.data.syncedGoals;
                setGoals(prev => prev.map(g => {
                    const updated = synced.find(s => s.id === g.id);
                    return updated
                        ? { ...g, currentCount: updated.currentCount, isCompleted: updated.isCompleted }
                        : g;
                }));
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
        } catch {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        } finally {
            setIsSyncing(false);
        }
    };

    // ── Manual task (requires evidence) ──────────────────────────────────────
    const onManualTaskPress = (goal) => {
        if (goal.isCompleted) return;
        setEvidenceModal({ visible: true, goalId: goal.id, goalTitle: goal.title });
    };

    const handleEvidenceConfirm = ({ note, link }) => {
        const { goalId } = evidenceModal;
        setEvidenceModal({ visible: false, goalId: null, goalTitle: '' });
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        console.log(`[MANUAL_VERIFY] Goal ${goalId} — Note: "${note}" Link: "${link}"`);
        setGoals(prev => prev.map(g =>
            g.id === goalId ? { ...g, currentCount: g.targetCount, isCompleted: true } : g
        ));
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    };

    const activeStreak = goals.every(g => g.isCompleted) ? 'SECURED' : 'AT RISK';
    const streakColor = activeStreak === 'SECURED' ? '#00FF41' : '#FF003C';

    return (
        <SafeAreaView style={styles.container}>
            <EvidenceModal
                visible={evidenceModal.visible}
                goalTitle={evidenceModal.goalTitle}
                onConfirm={handleEvidenceConfirm}
                onCancel={() => setEvidenceModal({ visible: false, goalId: null, goalTitle: '' })}
            />

            {/* HEADER */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.greeting}>// TERMINAL_ACCESS_GRANTED</Text>
                    <Text style={styles.username}>usr: {displayName}</Text>
                </View>
                <Animated.View style={[styles.statusBadge, { opacity: pulseAnim }]}>
                    <View style={[styles.onlineDot, { backgroundColor: isSyncing ? '#FFBD2E' : '#00FF41' }]} />
                    <Text style={[styles.statusText, { color: isSyncing ? '#FFBD2E' : '#00FF41' }]}>
                        {isSyncing ? 'SYNCING...' : 'ONLINE'}
                    </Text>
                </Animated.View>
            </View>

            {/* Remove ScrollView and use a FlatList or a regular View inside SafeArea if it is mostly static/nested flatlists */}
            <View style={{flex: 1}}>
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                {/* STREAK CARD */}
                <Surface style={[styles.card, { borderColor: streakColor }]} elevation={0}>
                    <View style={styles.cardHeader}>
                        <IconButton icon="fire" iconColor={streakColor} size={24} style={styles.cardIcon} />
                        <Text style={[styles.cardTitle, { color: streakColor }]}>GLOBAL STREAK STATUS</Text>
                    </View>
                    <Text style={[styles.statValue, { color: streakColor }]}>{activeStreak}</Text>
                    <Text style={styles.statLabel}>DEADLINE: 22:30:00</Text>
                    <TouchableOpacity onPress={() => navigation.navigate('FailureGlitch')} style={styles.devBtn}>
                        <Text style={styles.devBtnText}>{'> [TEST] SIMULATE FAILURE'}</Text>
                    </TouchableOpacity>
                </Surface>

                {/* TARGETS */}
                <View style={styles.sectionHeaderRow}>
                    <Text style={styles.sectionTitle}>{'> TARGETS'}</Text>
                    <TouchableOpacity onPress={handleSync}>
                        <Text style={styles.syncBtnText}>[ FORCE_SYNC ]</Text>
                    </TouchableOpacity>
                </View>

                {goals.filter(g => g.type === 'AUTOMATED').map(goal => (
                    <View key={goal.id} style={styles.goalRow}>
                        <View style={styles.goalInfo}>
                            <Text style={styles.goalTitle}>{goal.title}</Text>
                            <Text style={styles.goalSub}>[AUTOMATED_WATCHER]</Text>
                        </View>
                        <View style={styles.goalProgress}>
                            <Text style={[styles.progressText, { color: goal.isCompleted ? '#00FF41' : '#FFBD2E' }]}>
                                {goal.currentCount}/{goal.targetCount}
                            </Text>
                            <View style={[styles.indicatorLine, { backgroundColor: goal.isCompleted ? '#00FF41' : '#FF003C' }]} />
                        </View>
                    </View>
                ))}

                {/* MANUAL OVERRIDES */}
                <Text style={[styles.sectionTitle, { marginTop: 24 }]}>{'> MANUAL_OVERRIDES'}</Text>
                {goals.filter(g => g.type === 'MANUAL').map(goal => (
                    <TouchableOpacity
                        key={goal.id}
                        style={[styles.goalRow, goal.isCompleted && styles.goalRowCompleted]}
                        onPress={() => onManualTaskPress(goal)}
                        disabled={goal.isCompleted}
                    >
                        <View style={styles.goalInfo}>
                            <Text style={styles.goalTitle}>{goal.title}</Text>
                            <Text style={styles.goalSub}>
                                {goal.isCompleted ? '[VERIFIED — SESSION LOGGED]' : '[REQUIRES EVIDENCE]'}
                            </Text>
                        </View>
                        <View style={styles.toggleContainer}>
                            {goal.isCompleted ? (
                                <Text style={[styles.progressText, { color: '#00FF41' }]}>VERIFIED</Text>
                            ) : (
                                <View style={styles.actionSwitch}>
                                    <Text style={styles.switchText}>EXECUTE</Text>
                                </View>
                            )}
                        </View>
                    </TouchableOpacity>
                ))}

                {/* SYSTEM LOGS */}
                <View style={{ marginTop: 32, marginBottom: 32 }}>
                    <Text style={styles.sectionTitle}>{'> SYSTEM_LOGS'}</Text>
                    {/* Replaced TerminalConsole internal ScrollView with fixed height / FlatList in TerminalConsole config */}
                    <View style={{height: 250}}>
                        <TerminalConsole userId={userInfo?.id} token={userToken} pollIntervalMs={10000} />
                    </View>
                </View>

            </ScrollView>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#050505' },
    scrollContent: { padding: 20 },
    header: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: 20, marginBottom: 24,
    },
    greeting: { color: '#444', fontFamily: MONO, fontSize: 10, marginBottom: 4 },
    username: { color: '#E0E0E0', fontWeight: 'bold', fontSize: 18, fontFamily: MONO },
    statusBadge: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#111', paddingHorizontal: 12, paddingVertical: 6,
        borderWidth: 1, borderColor: '#333',
    },
    onlineDot: { width: 8, height: 8, marginRight: 8 },
    statusText: { color: '#00FF41', fontSize: 10, fontWeight: 'bold', fontFamily: MONO },
    card: {
        backgroundColor: '#0A0A0A', padding: 20,
        borderWidth: 1, borderColor: '#333', marginBottom: 24,
    },
    cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
    cardIcon: { margin: 0, marginRight: -4 },
    cardTitle: { color: '#E0E0E0', fontSize: 12, fontWeight: '900', fontFamily: MONO, letterSpacing: 2 },
    statValue: { color: '#E0E0E0', fontWeight: '900', fontSize: 32, fontFamily: MONO, letterSpacing: 2 },
    statLabel: { color: '#8B949E', fontSize: 10, marginTop: 4, fontFamily: MONO },
    devBtn: { marginTop: 12 },
    devBtnText: { color: '#FF003C', fontFamily: MONO, fontSize: 9, opacity: 0.6 },
    sectionHeaderRow: {
        flexDirection: 'row', justifyContent: 'space-between',
        alignItems: 'flex-end', marginBottom: 16,
    },
    sectionTitle: { color: '#00FF41', fontFamily: MONO, fontWeight: 'bold', fontSize: 14, letterSpacing: 1 },
    syncBtnText: { color: '#58A6FF', fontFamily: MONO, fontSize: 10, fontWeight: 'bold' },
    goalRow: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        backgroundColor: '#111', borderWidth: 1, borderColor: '#222',
        padding: 16, marginBottom: 12,
    },
    goalRowCompleted: { borderColor: '#00FF41', opacity: 0.8 },
    goalInfo: { flex: 1 },
    goalTitle: { color: '#E0E0E0', fontFamily: MONO, fontWeight: 'bold', fontSize: 14 },
    goalSub: { color: '#666', fontFamily: MONO, fontSize: 10, marginTop: 4 },
    goalProgress: { alignItems: 'flex-end' },
    progressText: { fontFamily: MONO, fontWeight: 'bold', fontSize: 18 },
    indicatorLine: { width: 30, height: 2, marginTop: 4 },
    toggleContainer: { alignItems: 'flex-end' },
    actionSwitch: {
        borderWidth: 1, borderColor: '#FF003C',
        paddingVertical: 6, paddingHorizontal: 12,
        backgroundColor: 'rgba(255, 0, 60, 0.1)',
    },
    switchText: { color: '#FF003C', fontFamily: MONO, fontSize: 10, fontWeight: 'bold' },
    modalOverlay: {
        flex: 1, backgroundColor: 'rgba(0,0,0,0.85)',
        justifyContent: 'center', padding: 20,
    },
    modalBox: { backgroundColor: '#0A0A0A', borderWidth: 1, borderColor: '#333', padding: 24 },
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
