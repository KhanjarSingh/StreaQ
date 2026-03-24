import React, { useCallback, useContext, useState } from 'react';
import {
    View,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Platform,
    RefreshControl,
    Alert,
    Image,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Text, IconButton, Switch } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthContext } from '../context/AuthContext';
import client from '../api/client';

const MONO = Platform.OS === 'ios' ? 'Menlo' : 'monospace';
const PROTOCOLS = ['GITHUB', 'LEETCODE', 'MANUAL'];

const ProtocolRow = ({ protocolType, goal, onToggle, onEdit, githubConnected }) => {
    const isActive = Boolean(goal?.isActive);
    const blocked = protocolType === 'GITHUB' && !githubConnected && !isActive;

    return (
        <View style={styles.protocolRow}>
            <View style={{ flex: 1 }}>
                <Text style={styles.protocolTitle}>{`PROTOCOL_${protocolType}`}</Text>
                <Text style={styles.protocolMeta}>
                    {isActive
                        ? `${goal.targetValue} target • ${goal.dailyDeadline} • ${goal.reminderFrequency}`
                        : blocked
                            ? 'Connect GitHub via OAuth to activate.'
                            : 'Inactive'}
                </Text>
            </View>

            <View style={styles.protocolActions}>
                <Switch value={isActive} onValueChange={(value) => onToggle(protocolType, goal, value, blocked)} color="#00FF41" />
                <TouchableOpacity onPress={() => onEdit(protocolType, goal, blocked)}>
                    <Text style={styles.protocolEdit}>{isActive ? 'EDIT' : 'CONFIG'}</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const ProfileScreen = ({ navigation }) => {
    const { logout, userInfo, userToken } = useContext(AuthContext);

    const [profile, setProfile] = useState(null);
    const [goals, setGoals] = useState([]);
    const [githubConnected, setGithubConnected] = useState(false);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchData = useCallback(async () => {
        if (!userToken) return;

        try {
            const [profileRes, goalsRes] = await Promise.all([
                client.get('/api/users/profile', {
                    headers: { Authorization: `Bearer ${userToken}` },
                }),
                client.get('/api/goals', {
                    headers: { Authorization: `Bearer ${userToken}` },
                }),
            ]);

            setProfile(profileRes.data);
            setGoals(goalsRes.data?.goals || []);
            setGithubConnected(Boolean(goalsRes.data?.githubConnected));
        } catch (error) {
            if (error.response?.status === 401) {
                await logout();
                return;
            }
            Alert.alert('PROFILE OFFLINE', 'Unable to refresh profile and protocol settings.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [logout, userToken]);

    useFocusEffect(
        useCallback(() => {
            setLoading(true);
            fetchData();
        }, [fetchData])
    );

    const handleRefresh = async () => {
        setRefreshing(true);
        await fetchData();
    };

    const handleToggle = async (protocolType, goal, nextValue, blocked) => {
        if (blocked) {
            Alert.alert('GITHUB REQUIRED', 'Connect with GitHub OAuth before activating the GitHub protocol.');
            return;
        }

        if (!goal?.id && nextValue) {
            navigation.navigate('ProtocolConfig', { protocolType });
            return;
        }

        if (!goal?.id) return;

        try {
            await client.patch(`/api/goals/${goal.id}/toggle`, { isActive: nextValue }, {
                headers: { Authorization: `Bearer ${userToken}` },
            });
            await fetchData();
        } catch (error) {
            Alert.alert('UPDATE FAILED', 'The protocol could not be toggled.');
        }
    };

    const handleEdit = (protocolType, goal, blocked) => {
        if (blocked) {
            Alert.alert('GITHUB REQUIRED', 'Connect with GitHub OAuth before activating the GitHub protocol.');
            return;
        }

        navigation.navigate('ProtocolConfig', goal?.id ? { goal, protocolType } : { protocolType });
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.centerState}>
                    <Text style={styles.loadingText}>BOOTING OPERATOR PROFILE...</Text>
                </View>
            </SafeAreaView>
        );
    }

    const gh = profile?.github;
    const user = profile?.user;
    const displayName = user?.username || userInfo?.username || 'Operator';
    const avatarUrl = gh?.avatarUrl || user?.avatarUrl;
    const protocolsByType = goals.reduce((acc, goal) => {
        acc[goal.protocolType] = goal;
        return acc;
    }, {});

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.topBar}>
                <TouchableOpacity onPress={() => navigation.navigate('Home')}>
                    <Text style={styles.backText}>{'<'} dashboard</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={logout}>
                    <Text style={styles.logoutText}>logout</Text>
                </TouchableOpacity>
            </View>

            <ScrollView
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={handleRefresh}
                        tintColor="#58A6FF"
                    />
                }
            >
                <View style={styles.hero}>
                    <View style={styles.avatarWrap}>
                        {avatarUrl ? (
                            <Image source={{ uri: avatarUrl }} style={styles.avatar} />
                        ) : (
                            <View style={styles.avatarFallback}>
                                <Text style={styles.avatarText}>{displayName.substring(0, 2).toUpperCase()}</Text>
                            </View>
                        )}
                    </View>

                    <View style={{ flex: 1 }}>
                        <Text style={styles.heroTitle}>{gh?.name || displayName}</Text>
                        <Text style={styles.heroSubtitle}>{user?.email || '@operator'}</Text>
                        <Text style={styles.heroMeta}>{githubConnected ? 'GitHub connected' : 'GitHub not connected'}</Text>
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>ACTIVE PROTOCOLS</Text>
                    <Text style={styles.sectionHint}>Toggle protocols on or off, or open a config form to change deadlines and reminder cadence.</Text>

                    {PROTOCOLS.map((protocolType) => (
                        <ProtocolRow
                            key={protocolType}
                            protocolType={protocolType}
                            goal={protocolsByType[protocolType]}
                            onToggle={handleToggle}
                            onEdit={handleEdit}
                            githubConnected={githubConnected}
                        />
                    ))}
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>ACCOUNT STATE</Text>
                    <View style={styles.infoCard}>
                        <IconButton icon="clock-outline" iconColor="#58A6FF" size={18} style={styles.infoIcon} />
                        <View style={{ flex: 1 }}>
                            <Text style={styles.infoLabel}>TIMEZONE</Text>
                            <Text style={styles.infoValue}>{user?.timezone || 'UTC'}</Text>
                        </View>
                    </View>
                    <View style={styles.infoCard}>
                        <IconButton icon="github" iconColor="#58A6FF" size={18} style={styles.infoIcon} />
                        <View style={{ flex: 1 }}>
                            <Text style={styles.infoLabel}>GITHUB PROFILE</Text>
                            <Text style={styles.infoValue}>{gh?.login || 'Not linked'}</Text>
                        </View>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#071019',
    },
    centerState: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    loadingText: {
        color: '#8B949E',
        fontFamily: MONO,
        fontSize: 11,
    },
    topBar: {
        paddingHorizontal: 20,
        paddingBottom: 8,
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    backText: {
        color: '#58A6FF',
        fontFamily: MONO,
        fontSize: 14,
    },
    logoutText: {
        color: '#FF6B6B',
        fontFamily: MONO,
        fontSize: 12,
    },
    content: {
        padding: 20,
        paddingTop: 4,
        paddingBottom: 40,
    },
    hero: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 24,
    },
    avatarWrap: {
        marginRight: 16,
    },
    avatar: {
        width: 78,
        height: 78,
        borderRadius: 39,
        borderWidth: 2,
        borderColor: '#1F2A37',
    },
    avatarFallback: {
        width: 78,
        height: 78,
        borderRadius: 39,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0D1621',
        borderWidth: 1,
        borderColor: '#1F2A37',
    },
    avatarText: {
        color: '#F0F6FC',
        fontFamily: MONO,
        fontSize: 24,
        fontWeight: '700',
    },
    heroTitle: {
        color: '#F0F6FC',
        fontFamily: MONO,
        fontSize: 22,
        fontWeight: '800',
    },
    heroSubtitle: {
        color: '#8B949E',
        fontFamily: MONO,
        fontSize: 11,
        marginTop: 6,
    },
    heroMeta: {
        color: '#58A6FF',
        fontFamily: MONO,
        fontSize: 10,
        marginTop: 8,
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        color: '#F0F6FC',
        fontFamily: MONO,
        fontSize: 14,
        fontWeight: '700',
        marginBottom: 8,
    },
    sectionHint: {
        color: '#6E7681',
        fontFamily: MONO,
        fontSize: 10,
        lineHeight: 16,
        marginBottom: 12,
    },
    protocolRow: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#1F2A37',
        backgroundColor: '#0D1621',
        borderRadius: 18,
        paddingHorizontal: 14,
        paddingVertical: 14,
        marginBottom: 10,
    },
    protocolTitle: {
        color: '#E6EDF3',
        fontFamily: MONO,
        fontSize: 12,
        fontWeight: '700',
    },
    protocolMeta: {
        color: '#6E7681',
        fontFamily: MONO,
        fontSize: 10,
        marginTop: 6,
    },
    protocolActions: {
        alignItems: 'center',
        marginLeft: 14,
    },
    protocolEdit: {
        color: '#58A6FF',
        fontFamily: MONO,
        fontSize: 10,
        fontWeight: '700',
        marginTop: 8,
    },
    infoCard: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#1F2A37',
        backgroundColor: '#0D1621',
        borderRadius: 18,
        padding: 14,
        marginBottom: 10,
    },
    infoIcon: {
        margin: 0,
        marginRight: 10,
    },
    infoLabel: {
        color: '#6E7681',
        fontFamily: MONO,
        fontSize: 10,
    },
    infoValue: {
        color: '#E6EDF3',
        fontFamily: MONO,
        fontSize: 12,
        fontWeight: '700',
        marginTop: 4,
    },
});

export default ProfileScreen;
