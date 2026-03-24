import React, { useContext, useEffect, useState, useRef, useCallback } from 'react';
import {
    View, StyleSheet, TouchableOpacity, ScrollView, Platform,
    RefreshControl, Modal, TextInput, Animated, Dimensions, Image, Alert
} from 'react-native';
import { Text, IconButton } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthContext } from '../context/AuthContext';
import client from '../api/client';

const MONO = Platform.OS === 'ios' ? 'Menlo' : 'monospace';
const SCREEN_WIDTH = Dimensions.get('window').width;
const WEEKS_TO_SHOW = 18;
const CELL_GAP = 2;
const HEATMAP_H_PAD = 12;
const CELL_SIZE = Math.floor(
    (SCREEN_WIDTH - 40 - HEATMAP_H_PAD * 2 - (WEEKS_TO_SHOW - 1) * CELL_GAP) / WEEKS_TO_SHOW
);

const TODAY = new Date().toISOString().split('T')[0];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const getContribColor = (count, isToday) => {
    if (isToday && count > 0) return '#00FF41';  // Neon today
    if (count === 0) return '#161B22';
    if (count <= 3)  return '#0E4429';
    if (count <= 6)  return '#1A5C34';
    if (count <= 9)  return '#26A641';
    return '#39D353';
};

// Group flat contribution array into column-first weeks for the heatmap
const toWeeks = (contributions) => {
    if (!contributions?.length) return [];
    const sorted = [...contributions].sort((a, b) => a.date.localeCompare(b.date));
    const weeks = [];
    let week = [];
    for (const day of sorted) {
        week.push(day);
        if (week.length === 7) { weeks.push(week); week = []; }
    }
    if (week.length) weeks.push(week);
    return weeks.slice(-WEEKS_TO_SHOW);
};

// ─── BlinkingCursor ───────────────────────────────────────────────────────────
const BlinkingCursor = ({ color = '#00FF41' }) => {
    const anim = useRef(new Animated.Value(1)).current;
    useEffect(() => {
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(anim, { toValue: 0, duration: 500, useNativeDriver: true }),
                Animated.timing(anim, { toValue: 1, duration: 500, useNativeDriver: true }),
            ])
        );
        loop.start();
        return () => loop.stop();
    }, []);
    return <Animated.Text style={{ color, fontFamily: MONO, fontSize: 16, opacity: anim }}>_</Animated.Text>;
};

// ─── SettingsModal ────────────────────────────────────────────────────────────
const SettingsModal = ({ visible, timezone, token, onClose, onLogout, onTimezoneUpdate }) => {
    const [tz, setTz] = useState(timezone || 'UTC');
    const [saving, setSaving] = useState(false);

    useEffect(() => { setTz(timezone || 'UTC'); }, [timezone]);

    const saveTimezone = async () => {
        if (!tz.trim()) return;
        setSaving(true);
        try {
            await client.patch('/api/users/me',
                { timezone: tz.trim() },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            onTimezoneUpdate(tz.trim());
            Alert.alert('TIMEZONE_UPDATED', `Cron jobs now run in: ${tz.trim()}`);
        } catch {
            Alert.alert('ERROR', 'Failed to update timezone. Check format (e.g. Asia/Kolkata).');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <View style={mStyles.overlay}>
                <View style={mStyles.box}>
                    <View style={mStyles.header}>
                        <Text style={mStyles.title}>{'> CONFIG.JSON'}</Text>
                        <TouchableOpacity onPress={onClose}>
                            <Text style={mStyles.close}>[ X ]</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={mStyles.divider} />

                    <Text style={mStyles.label}>// timezone (IANA format)</Text>
                    <TextInput
                        style={mStyles.input}
                        value={tz}
                        onChangeText={setTz}
                        autoCapitalize="none"
                        autoCorrect={false}
                        placeholder="e.g. Asia/Kolkata"
                        placeholderTextColor="#444"
                    />
                    <TouchableOpacity style={mStyles.saveBtn} onPress={saveTimezone} disabled={saving}>
                        <Text style={mStyles.saveBtnText}>{saving ? '[ SAVING... ]' : '[ SAVE_TIMEZONE ]'}</Text>
                    </TouchableOpacity>

                    <View style={mStyles.divider} />

                    <TouchableOpacity style={mStyles.logoutBtn} onPress={onLogout}>
                        <Text style={mStyles.logoutBtnText}>[ TERMINATE_SESSION ]</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};

const mStyles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', padding: 24 },
    box: { backgroundColor: '#0D1117', borderWidth: 1, borderColor: '#30363D', padding: 24 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    title: { color: '#00FF41', fontFamily: MONO, fontWeight: 'bold', fontSize: 14 },
    close: { color: '#F85149', fontFamily: MONO, fontSize: 12 },
    divider: { height: 1, backgroundColor: '#21262D', marginVertical: 16 },
    label: { color: '#8B949E', fontFamily: MONO, fontSize: 11, marginBottom: 8 },
    input: {
        backgroundColor: '#161B22', borderWidth: 1, borderColor: '#30363D',
        color: '#C9D1D9', fontFamily: MONO, fontSize: 13, padding: 12, marginBottom: 12,
    },
    saveBtn: { borderWidth: 1, borderColor: '#238636', padding: 12, alignItems: 'center', backgroundColor: 'rgba(35,134,54,0.1)' },
    saveBtnText: { color: '#3FB950', fontFamily: MONO, fontSize: 12, fontWeight: 'bold' },
    logoutBtn: { borderWidth: 1, borderColor: '#F85149', padding: 12, alignItems: 'center', backgroundColor: 'rgba(248,81,73,0.1)' },
    logoutBtnText: { color: '#F85149', fontFamily: MONO, fontSize: 12, fontWeight: 'bold' },
});

// ─── ProfileScreen ────────────────────────────────────────────────────────────
const ProfileScreen = ({ navigation }) => {
    const { logout, userInfo, userToken } = useContext(AuthContext);

    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState(null);
    const [settingsVisible, setSettingsVisible] = useState(false);
    const [timezone, setTimezone] = useState(userInfo?.timezone || 'UTC');

    const fetchProfile = useCallback(async () => {
        if (!userToken) return;
        try {
            const res = await client.get('/api/users/profile', {
                headers: { Authorization: `Bearer ${userToken}` }
            });
            setProfile(res.data);
            setTimezone(res.data?.user?.timezone || 'UTC');
            setError(null);
        } catch (e) {
            if (e.response?.status === 401) {
                setError(null);
                setProfile(null);
                setLoading(false);
                setRefreshing(false);
                await logout();
                return;
            }
            setError(e.message || 'Connection failed');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [logout, userToken]);

    useEffect(() => { fetchProfile(); }, [fetchProfile]);

    const handleRefresh = async () => {
        setRefreshing(true);
        // Trigger sync then re-fetch profile
        try {
            await client.post('/api/sync',
                { userId: userInfo?.id },
                { headers: { Authorization: `Bearer ${userToken}` } }
            );
        } catch { /* ignore sync errors */ }
        await fetchProfile();
    };

    const gh = profile?.github;
    const u = profile?.user;
    const displayName = u?.username || userInfo?.username || 'Operator';
    const avatarUrl = gh?.avatarUrl || u?.avatarUrl;
    const weeks = toWeeks(gh?.contributions);
    const todayCount = gh?.contributions?.find(d => d.date === TODAY)?.count ?? 0;

    // ── Loading state ─────────────────────────────────────────────────────────
    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.bootScreen}>
                    <Text style={styles.bootText}>{'> SYSTEM_BOOTING...'}</Text>
                    <View style={{ flexDirection: 'row' }}>
                        <Text style={styles.bootText}>{'> FETCHING_PROFILE'}</Text>
                        <BlinkingCursor />
                    </View>
                    <Text style={[styles.bootText, { color: '#444', marginTop: 8 }]}>
                        {'connecting to streaq.onrender.com'}
                    </Text>
                </View>
            </SafeAreaView>
        );
    }

    // ── Error state ───────────────────────────────────────────────────────────
    if (error && !profile) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.bootScreen}>
                    <Text style={[styles.bootText, { color: '#FF0000' }]}>{'> ERR: CONNECTION_FAILED'}</Text>
                    <Text style={[styles.bootText, { color: '#FFD700', marginTop: 8 }]}>
                        {'> RECONNECTING TO SERVER...'}
                    </Text>
                    <Text style={[styles.bootText, { color: '#444', marginTop: 4 }]}>{error}</Text>
                    <TouchableOpacity style={styles.retryBtn} onPress={() => { setLoading(true); fetchProfile(); }}>
                        <Text style={styles.retryBtnText}>[ RETRY ]</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <SettingsModal
                visible={settingsVisible}
                timezone={timezone}
                token={userToken}
                onClose={() => setSettingsVisible(false)}
                onLogout={logout}
                onTimezoneUpdate={(tz) => setTimezone(tz)}
            />

            {/* TOP BAR */}
            <View style={styles.topBar}>
                <TouchableOpacity
                    onPress={() => navigation.navigate('Home')}
                    style={styles.backButtonRow}
                >
                    <Text style={styles.backText}>{'<'} cd ..</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setSettingsVisible(true)}>
                    <IconButton icon="cog-outline" iconColor="#58A6FF" size={22} style={{ margin: 0 }} />
                </TouchableOpacity>
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={handleRefresh}
                        tintColor="#00FF41"
                        title="SYNCING..."
                        titleColor="#00FF41"
                    />
                }
            >
                {/* PROFILE HEADER */}
                <View style={styles.profileHeader}>
                    <View style={styles.avatarContainer}>
                        {avatarUrl ? (
                            <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
                        ) : (
                            <View style={styles.avatarFallback}>
                                <Text style={styles.avatarInitials}>
                                    {displayName.substring(0, 2).toUpperCase()}
                                </Text>
                            </View>
                        )}
                        <View style={styles.onlineBadge} />
                    </View>
                    <View style={styles.userInfo}>
                        <Text style={styles.name}>{gh?.name || displayName}</Text>
                        <Text style={styles.handle}>@{gh?.login || displayName.toLowerCase()}</Text>
                        {gh?.location && (
                            <Text style={styles.location}>{'⌖ '}{gh.location}</Text>
                        )}
                    </View>
                </View>

                {/* BIO CODE BLOCK */}
                <View style={styles.bioSection}>
                    <View style={styles.bioTopBar}>
                        <View style={{ flexDirection: 'row', gap: 6 }}>
                            {['#FF5F56', '#FFBD2E', '#27C93F'].map((c, i) => (
                                <View key={i} style={[styles.winBtn, { backgroundColor: c }]} />
                            ))}
                        </View>
                        <Text style={styles.bioFileName}>manifest.js</Text>
                    </View>
                    <Text style={styles.bioCode}>
                        <Text style={styles.cmt}>{'/* User Manifest */\n'}</Text>
                        <Text style={styles.kw}>{'const '}</Text>
                        <Text style={styles.var}>{'developer'}</Text>
                        <Text style={styles.pun}>{' = {\n'}</Text>
                        <Text style={styles.prop}>{'  name'}</Text>
                        <Text style={styles.pun}>{': '}</Text>
                        <Text style={styles.str}>{`"${gh?.name || displayName}"`}</Text>
                        <Text style={styles.pun}>{',\n'}</Text>
                        <Text style={styles.prop}>{'  location'}</Text>
                        <Text style={styles.pun}>{': '}</Text>
                        <Text style={styles.str}>{`"${gh?.location || 'Unknown'}"`}</Text>
                        <Text style={styles.pun}>{',\n'}</Text>
                        <Text style={styles.prop}>{'  bio'}</Text>
                        <Text style={styles.pun}>{': '}</Text>
                        <Text style={styles.str}>{`"${gh?.bio || 'Building StreaQ'}"`}</Text>
                        <Text style={styles.pun}>{',\n'}</Text>
                        <Text style={styles.prop}>{'  status'}</Text>
                        <Text style={styles.pun}>{': '}</Text>
                        <Text style={styles.bool}>{'"RELENTLESS"'}</Text>
                        <Text style={styles.pun}>{'\n};'}</Text>
                    </Text>
                </View>

                {/* STATS ROW */}
                <View style={styles.statsRow}>
                    {[
                        { icon: 'source-repository', value: gh?.publicRepos ?? '—', label: 'Repos' },
                        { icon: 'account-multiple-outline', value: gh?.followers ?? '—', label: 'Followers' },
                        { icon: 'git', value: gh?.totalContributions ?? '—', label: 'Commits' },
                    ].map(({ icon, value, label }) => (
                        <View key={label} style={styles.statCard}>
                            <IconButton icon={icon} iconColor="#58A6FF" size={18} style={{ margin: 0, marginBottom: -4 }} />
                            <Text style={styles.statValue}>{String(value)}</Text>
                            <Text style={styles.statLabel}>{label}</Text>
                        </View>
                    ))}
                </View>

                {/* CONTRIBUTION HEATMAP */}
                <View style={styles.section}>
                    <View style={styles.heatmapTitleRow}>
                        <Text style={styles.sectionTitle}>{'> CONTRIBUTION_GRAPH'}</Text>
                        <Text style={[styles.todayBadge, todayCount > 0 && styles.todayBadgeActive]}>
                            {todayCount} today
                        </Text>
                    </View>

                    <View style={styles.graphContainer}>
                        {weeks.length === 0 ? (
                            <Text style={styles.noData}>{'// no contribution data available'}</Text>
                        ) : (
                            <View style={styles.graphGrid}>
                                {weeks.map((week, wi) => (
                                    <View key={wi} style={styles.weekCol}>
                                        {week.map((day, di) => (
                                            <View
                                                key={di}
                                                style={[
                                                    styles.cell,
                                                    {
                                                        width: CELL_SIZE,
                                                        height: CELL_SIZE,
                                                        backgroundColor: getContribColor(day.count, day.date === TODAY),
                                                        ...(day.date === TODAY && day.count > 0 && styles.todayGlow),
                                                    }
                                                ]}
                                            />
                                        ))}
                                    </View>
                                ))}
                            </View>
                        )}

                        <Text style={styles.graphFooter}>
                            {gh?.totalContributions != null
                                ? `${gh.totalContributions} contributions in the last year`
                                : '– contributions unavailable –'
                            }
                        </Text>
                    </View>
                </View>

                {/* MENU */}
                <View style={styles.menuSection}>
                    <TouchableOpacity style={styles.menuItem} onPress={() => setSettingsVisible(true)}>
                        <IconButton icon="cog-outline" iconColor="#58A6FF" size={18} style={styles.menuIcon} />
                        <Text style={styles.menuText}>config.json</Text>
                        <Text style={styles.menuArrow}>{'>'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.menuItem} onPress={logout}>
                        <IconButton icon="logout" iconColor="#F85149" size={18} style={styles.menuIcon} />
                        <Text style={[styles.menuText, { color: '#F85149' }]}>terminate_session.sh</Text>
                        <Text style={styles.menuArrow}>{'>'}</Text>
                    </TouchableOpacity>
                </View>

                {/* TIMEZONE TAG */}
                <Text style={styles.tzLabel}>{'> TZ: '}<Text style={styles.tzValue}>{timezone}</Text></Text>

            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0D1117' },

    // Boot / Error screens
    bootScreen: { flex: 1, justifyContent: 'center', padding: 32 },
    bootText: { color: '#00FF41', fontFamily: MONO, fontSize: 13, lineHeight: 22 },
    retryBtn: { marginTop: 24, borderWidth: 1, borderColor: '#58A6FF', padding: 12, alignItems: 'center' },
    retryBtnText: { color: '#58A6FF', fontFamily: MONO, fontSize: 12 },

    // Top bar
    topBar: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: 20, paddingBottom: 8,
    },
    backButtonRow: { flexDirection: 'row', alignItems: 'center' },
    backText: { color: '#58A6FF', fontFamily: MONO, fontSize: 14 },

    scrollContent: { padding: 20, paddingTop: 0, paddingBottom: 40 },

    // Profile header
    profileHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
    avatarContainer: { position: 'relative', marginRight: 16 },
    avatarImage: { width: 72, height: 72, borderRadius: 36, borderWidth: 2, borderColor: '#30363D' },
    avatarFallback: {
        width: 72, height: 72, borderRadius: 36,
        backgroundColor: '#21262D', borderWidth: 2, borderColor: '#30363D',
        justifyContent: 'center', alignItems: 'center',
    },
    avatarInitials: { color: '#C9D1D9', fontFamily: MONO, fontWeight: 'bold', fontSize: 22 },
    onlineBadge: {
        position: 'absolute', bottom: 2, right: 2,
        width: 14, height: 14, borderRadius: 7,
        backgroundColor: '#238636', borderWidth: 2, borderColor: '#0D1117',
    },
    userInfo: { flex: 1 },
    name: { color: '#E6EDF3', fontWeight: 'bold', fontFamily: MONO, fontSize: 20 },
    handle: { color: '#8B949E', fontFamily: MONO, fontSize: 13, marginTop: 2 },
    location: { color: '#8B949E', fontFamily: MONO, fontSize: 11, marginTop: 4 },

    // Bio code block
    bioSection: {
        backgroundColor: '#161B22', borderWidth: 1, borderColor: '#30363D',
        borderRadius: 6, marginBottom: 20, overflow: 'hidden',
    },
    bioTopBar: {
        backgroundColor: '#21262D', borderBottomWidth: 1, borderBottomColor: '#30363D',
        height: 32, flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 12, justifyContent: 'space-between',
    },
    winBtn: { width: 10, height: 10, borderRadius: 5 },
    bioFileName: { color: '#8B949E', fontFamily: MONO, fontSize: 10 },
    bioCode: { fontFamily: MONO, fontSize: 12, lineHeight: 20, color: '#C9D1D9', padding: 14 },
    cmt: { color: '#8B949E' }, kw: { color: '#FF7B72' }, var: { color: '#79C0FF' },
    pun: { color: '#C9D1D9' }, prop: { color: '#A5D6FF' }, str: { color: '#A5D6FF' },
    bool: { color: '#00FF41' },

    // Stats
    statsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
    statCard: {
        flex: 1, backgroundColor: '#161B22',
        borderWidth: 0.5, borderColor: '#333',
        alignItems: 'center', paddingVertical: 14, borderRadius: 4,
    },
    statValue: { color: '#E6EDF3', fontWeight: 'bold', fontSize: 16, fontFamily: MONO },
    statLabel: { color: '#8B949E', fontSize: 10, fontFamily: MONO, marginTop: 2 },

    // Heatmap
    section: { marginBottom: 20 },
    heatmapTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    sectionTitle: { color: '#E6EDF3', fontFamily: MONO, fontWeight: 'bold', fontSize: 12, letterSpacing: 1 },
    todayBadge: { color: '#8B949E', fontFamily: MONO, fontSize: 10, borderWidth: 1, borderColor: '#30363D', paddingHorizontal: 6, paddingVertical: 2 },
    todayBadgeActive: { color: '#00FF41', borderColor: '#00FF41' },
    graphContainer: { backgroundColor: '#0D1117', borderWidth: 1, borderColor: '#30363D', padding: HEATMAP_H_PAD, borderRadius: 4 },
    graphGrid: { flexDirection: 'row', gap: CELL_GAP },
    weekCol: { flexDirection: 'column', gap: CELL_GAP },
    cell: { borderRadius: 2 },
    todayGlow: { shadowColor: '#00FF41', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 4 },
    noData: { color: '#444', fontFamily: MONO, fontSize: 10, textAlign: 'center', paddingVertical: 20 },
    graphFooter: { color: '#8B949E', fontSize: 10, fontFamily: MONO, marginTop: 8, textAlign: 'right' },

    // Menu
    menuSection: { gap: 8, marginBottom: 16 },
    menuItem: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#161B22', borderWidth: 0.5, borderColor: '#30363D',
        paddingRight: 16, borderRadius: 4,
    },
    menuIcon: { margin: 0 },
    menuText: { flex: 1, color: '#C9D1D9', fontFamily: MONO, fontSize: 13 },
    menuArrow: { color: '#58A6FF', fontFamily: MONO, fontSize: 14 },

    // TZ label
    tzLabel: { color: '#444', fontFamily: MONO, fontSize: 10, textAlign: 'center', marginTop: 8 },
    tzValue: { color: '#58A6FF' },
});

export default ProfileScreen;
