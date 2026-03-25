import React from 'react';
import { View, Text, StyleSheet, Platform, TouchableOpacity, Animated } from 'react-native';
import { IconButton } from 'react-native-paper';

const MONO = Platform.OS === 'ios' ? 'Menlo' : 'monospace';

const PROTOCOL_META = {
    GITHUB: { icon: 'github', label: 'PROTOCOL_GITHUB' },
    LEETCODE: { icon: 'code-braces', label: 'PROTOCOL_LEETCODE' },
    CODEFORCES: { icon: 'lightning-bolt', label: 'PROTOCOL_CODEFORCES' },
    MANUAL: { icon: 'shield-check', label: 'PROTOCOL_MANUAL' },
};

const GoalCard = ({
    goal,
    color,
    progressLabel,
    footerLeft,
    footerRight,
    onPress,
    disabled = false,
    actionLabel,
    actionSlot,
    syncStateLabel,
    syncStateColor = '#FACC15',
    syncPulseOpacity = 1,
}) => {
    const meta = PROTOCOL_META[goal.protocolType] || PROTOCOL_META.MANUAL;

    return (
        <TouchableOpacity
            style={[
                styles.card,
                {
                    borderColor: color,
                    shadowColor: color,
                    opacity: disabled ? 0.72 : 1,
                },
            ]}
            activeOpacity={0.9}
            onPress={onPress}
            disabled={disabled}
        >
            <View style={styles.header}>
                <View style={styles.titleRow}>
                    <IconButton icon={meta.icon} iconColor={color} size={18} style={styles.icon} />
                    <View>
                        <Text style={[styles.title, { color }]}>{goal.protocolDisplayName || meta.label}</Text>
                        {goal.manualTaskDetails ? <Text style={styles.subtitle}>{goal.manualTaskDetails}</Text> : null}
                        {!goal.manualTaskDetails && goal.platformUsername ? <Text style={styles.usernameTag}>{`usr: @${goal.platformUsername}`}</Text> : null}
                    </View>
                </View>
                {syncStateLabel
                    ? <Animated.Text style={[styles.syncState, { color: syncStateColor, opacity: syncPulseOpacity }]}>{syncStateLabel}</Animated.Text>
                    : actionSlot || (actionLabel ? <Text style={styles.action}>{actionLabel}</Text> : null)}
            </View>

            <View style={styles.middle}>
                <Text style={styles.progress}>{progressLabel}</Text>
                <Text style={styles.target}>TARGET VALUE</Text>
            </View>

            <View style={styles.footer}>
                <View>
                    <Text style={styles.footerLabel}>NEXT REMINDER</Text>
                    <Text style={styles.footerValue}>{footerLeft}</Text>
                </View>
                <View style={styles.footerBlock}>
                    <Text style={styles.footerLabel}>DEADLINE</Text>
                    <Text style={styles.footerValue}>{footerRight}</Text>
                </View>
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#0D121A',
        borderWidth: 1,
        borderRadius: 24,
        padding: 18,
        marginBottom: 14,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.25,
        shadowRadius: 14,
        elevation: 5,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    icon: {
        margin: 0,
        marginRight: 4,
    },
    title: {
        fontFamily: MONO,
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 1.2,
    },
    action: {
        color: '#C9D1D9',
        fontFamily: MONO,
        fontSize: 10,
    },
    subtitle: {
        color: '#6E7681',
        fontFamily: MONO,
        fontSize: 9,
        marginTop: 2,
    },
    usernameTag: {
        color: '#00FF41',
        fontFamily: MONO,
        fontSize: 10,
        marginTop: 4,
    },
    syncState: {
        fontFamily: MONO,
        fontSize: 10,
        fontWeight: '700',
    },
    middle: {
        marginTop: 18,
        marginBottom: 18,
    },
    progress: {
        color: '#F0F6FC',
        fontFamily: MONO,
        fontSize: 28,
        fontWeight: '800',
        letterSpacing: 1,
    },
    target: {
        color: '#6E7681',
        fontFamily: MONO,
        fontSize: 10,
        marginTop: 6,
        letterSpacing: 1,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        borderTopWidth: 1,
        borderTopColor: '#1A2330',
        paddingTop: 14,
    },
    footerBlock: {
        alignItems: 'flex-end',
    },
    footerLabel: {
        color: '#6E7681',
        fontFamily: MONO,
        fontSize: 9,
        marginBottom: 4,
        letterSpacing: 1,
    },
    footerValue: {
        color: '#E6EDF3',
        fontFamily: MONO,
        fontSize: 12,
        fontWeight: '700',
    },
});

export default GoalCard;
