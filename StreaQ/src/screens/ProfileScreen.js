import React, { useContext } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { Text, Avatar, Button, IconButton, Surface } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthContext } from '../context/AuthContext';

const ProfileScreen = ({ navigation }) => {
    const { logout, userInfo } = useContext(AuthContext);

    const displayName = userInfo?.username || userInfo?.email?.split('@')[0] || 'User';
    const displayHandle = `@${displayName.toLowerCase().replace(/\s+/g, '')}`;

    // Mock contribution data
    const contributionDays = Array.from({ length: 52 * 7 }).map((_, i) => ({
        level: Math.random() > 0.7 ? Math.floor(Math.random() * 4) : 0
    }));

    const getContributionColor = (level) => {
        switch (level) {
            case 1: return '#0E4429';
            case 2: return '#006D32';
            case 3: return '#26A641';
            case 4: return '#39D353';
            default: return '#161B22';
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.topBar}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButtonRow}>
                    <IconButton icon="arrow-left" iconColor="#58A6FF" size={20} style={{ margin: 0 }} />
                    <Text style={styles.backText}>cd ..</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={logout}>
                    <Text style={styles.logoutText}>./LOGOUT</Text>
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <View style={styles.profileHeader}>
                    <View style={styles.avatarContainer}>
                        <Avatar.Text
                            size={80}
                            label={displayName.substring(0, 2).toUpperCase()}
                            style={styles.avatar}
                            color="#C9D1D9"
                            labelStyle={styles.avatarLabel}
                        />
                        <View style={styles.onlineBadge} />
                    </View>
                    <View style={styles.userInfo}>
                        <Text variant="headlineMedium" style={styles.name}>{displayName}</Text>
                        <Text variant="bodyMedium" style={styles.handle}>{displayHandle}</Text>
                    </View>
                </View>

                <View style={styles.bioSection}>
                    <Text style={styles.bioText}>
                        <Text style={styles.comment}>// Full Stack Developer</Text>{'\n'}
                        <Text style={styles.keyword}>const</Text> currentJob = <Text style={styles.string}>"Building StreaQ"</Text>;{'\n'}
                        <Text style={styles.keyword}>let</Text> status = <Text style={styles.boolean}>true</Text>;
                    </Text>
                </View>

                <View style={styles.statsRow}>
                    <Surface style={styles.statCard} elevation={0}>
                        <IconButton icon="source-repository" iconColor="#8B949E" size={20} />
                        <Text style={styles.statValue}>12</Text>
                        <Text style={styles.statLabel}>Repos</Text>
                    </Surface>
                    <Surface style={styles.statCard} elevation={0}>
                        <IconButton icon="star-outline" iconColor="#8B949E" size={20} />
                        <Text style={styles.statValue}>48</Text>
                        <Text style={styles.statLabel}>Stars</Text>
                    </Surface>
                    <Surface style={styles.statCard} elevation={0}>
                        <IconButton icon="git" iconColor="#8B949E" size={20} />
                        <Text style={styles.statValue}>342</Text>
                        <Text style={styles.statLabel}>Commits</Text>
                    </Surface>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>CONTRIBUTION_GRAPH</Text>
                    <View style={styles.graphContainer}>
                        <View style={styles.graphGrid}>
                            {contributionDays.slice(0, 126).map((day, index) => ( // Show subset for mobile fit
                                <View
                                    key={index}
                                    style={[styles.contributionBox, { backgroundColor: getContributionColor(day.level) }]}
                                />
                            ))}
                        </View>
                        <Text style={styles.graphFooter}>142 contributions in the last year</Text>
                    </View>
                </View>

                <View style={styles.menuSection}>
                    <TouchableOpacity style={styles.menuItem}>
                        <View style={styles.menuIconBox}>
                            <IconButton icon="cog-outline" iconColor="#C9D1D9" size={20} />
                        </View>
                        <Text style={styles.menuText}>config.json</Text>
                        <IconButton icon="chevron-right" iconColor="#58A6FF" size={20} />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.menuItem}>
                        <View style={styles.menuIconBox}>
                            <IconButton icon="shield-outline" iconColor="#C9D1D9" size={20} />
                        </View>
                        <Text style={styles.menuText}>security_policy.md</Text>
                        <IconButton icon="chevron-right" iconColor="#58A6FF" size={20} />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.menuItem}>
                        <View style={styles.menuIconBox}>
                            <IconButton icon="bell-outline" iconColor="#C9D1D9" size={20} />
                        </View>
                        <Text style={styles.menuText}>notifications.log</Text>
                        <IconButton icon="chevron-right" iconColor="#58A6FF" size={20} />
                    </TouchableOpacity>
                </View>

                <Button
                    mode="outlined"
                    onPress={() => alert('Edit Profile')}
                    style={styles.editButton}
                    labelStyle={styles.editButtonLabel}
                >
                    EDIT_PROFILE
                </Button>

            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0D1117',
    },
    topBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingBottom: 10,
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
    logoutText: {
        color: '#F85149',
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
        fontSize: 14,
        fontWeight: 'bold',
    },
    scrollContent: {
        padding: 20,
        paddingTop: 0,
    },
    profileHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 24,
    },
    avatarContainer: {
        position: 'relative',
        marginRight: 16,
    },
    avatar: {
        backgroundColor: '#21262D',
        borderWidth: 1,
        borderColor: '#30363D',
    },
    avatarLabel: {
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
        fontWeight: 'bold',
    },
    onlineBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: '#238636',
        borderWidth: 2,
        borderColor: '#0D1117',
    },
    userInfo: {
        flex: 1,
    },
    name: {
        color: '#C9D1D9',
        fontWeight: 'bold',
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
        fontSize: 24,
    },
    handle: {
        color: '#8B949E',
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    },
    bioSection: {
        backgroundColor: '#161B22',
        padding: 16,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#30363D',
        marginBottom: 24,
    },
    bioText: {
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
        fontSize: 14,
        lineHeight: 22,
        color: '#C9D1D9',
    },
    comment: { color: '#8B949E' },
    keyword: { color: '#FF7B72' },
    string: { color: '#A5D6FF' },
    boolean: { color: '#79C0FF' },

    statsRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 24,
    },
    statCard: {
        flex: 1,
        backgroundColor: '#161B22',
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#30363D',
        alignItems: 'center',
        paddingVertical: 12,
    },
    statValue: {
        color: '#C9D1D9',
        fontWeight: 'bold',
        fontSize: 18,
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
        marginTop: -4,
    },
    statLabel: {
        color: '#8B949E',
        fontSize: 12,
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        color: '#C9D1D9',
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
        fontWeight: 'bold',
        marginBottom: 12,
        fontSize: 14,
    },
    graphContainer: {
        backgroundColor: '#0D1117',
        borderWidth: 1,
        borderColor: '#30363D',
        padding: 12,
        borderRadius: 6,
    },
    graphGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 3,
    },
    contributionBox: {
        width: 10,
        height: 10,
        borderRadius: 2,
    },
    graphFooter: {
        color: '#8B949E',
        fontSize: 10,
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
        marginTop: 8,
        textAlign: 'right',
    },
    menuSection: {
        marginBottom: 24,
        gap: 8,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#161B22',
        borderRadius: 6,
        paddingRight: 8,
        borderWidth: 1,
        borderColor: '#30363D',
    },
    menuIconBox: {
        width: 40,
        alignItems: 'center',
    },
    menuText: {
        flex: 1,
        color: '#C9D1D9',
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
        fontSize: 14,
    },
    editButton: {
        borderRadius: 6,
        borderColor: '#30363D',
        backgroundColor: '#21262D',
    },
    editButtonLabel: {
        color: '#C9D1D9',
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
        fontWeight: 'bold',
    },
});

export default ProfileScreen;
