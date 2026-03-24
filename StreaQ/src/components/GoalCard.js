import React from 'react';
import { View, Text, StyleSheet, Platform, TouchableOpacity } from 'react-native';
import { IconButton } from 'react-native-paper';

const MONO = Platform.OS === 'ios' ? 'Menlo' : 'monospace';

const PLATFORM_META = {
    GITHUB: { icon: 'source-branch', label: 'GITHUB_NODE', accent: '#58A6FF' },
    LEETCODE: { icon: 'code-tags', label: 'LEETCODE_NODE', accent: '#FFBD2E' },
    CODEFORCES: { icon: 'lightning-bolt', label: 'CODEFORCES_NODE', accent: '#39D353' },
    CUSTOM: { icon: 'shield-sword', label: 'MANUAL_OVERRIDE', accent: '#FF4D6D' },
};

const formatTitle = (goal) => {
    if (goal.type === 'MANUAL') return goal.title.toUpperCase();
    if (goal.sourcePlatform === 'GITHUB') return 'GITHUB COMMIT WATCH';
    if (goal.sourcePlatform === 'LEETCODE') return 'LEETCODE DAILY WATCH';
    return goal.title.toUpperCase();
};

const GoalCard = ({ goal, progressRatio, timeRemaining, onPress, disabled }) => {
    const meta = PLATFORM_META[goal.sourcePlatform] || PLATFORM_META.CUSTOM;
    const accent = goal.isCompleted ? '#00FF41' : meta.accent;
    const statusText = goal.isCompleted
        ? 'VERIFIED'
        : goal.type === 'MANUAL'
            ? 'EXECUTE'
            : `${goal.currentCount}/${goal.targetCount}`;

    return (
        <TouchableOpacity
            style={[
                styles.card,
                {
                    borderColor: goal.isCompleted ? 'rgba(0,255,65,0.55)' : 'rgba(88,166,255,0.18)',
                    shadowColor: accent,
                },
                disabled && styles.cardDisabled,
            ]}
            onPress={onPress}
            disabled={disabled}
            activeOpacity={0.88}
        >
            <View style={styles.header}>
                <View style={styles.titleWrap}>
                    <IconButton icon={meta.icon} iconColor={accent} size={18} style={styles.icon} />
                    <View style={styles.textWrap}>
                        <Text style={styles.title}>{formatTitle(goal)}</Text>
                        <Text style={[styles.platformTag, { color: accent }]}>{meta.label}</Text>
                    </View>
                </View>
                <Text style={[styles.status, { color: goal.isCompleted ? '#00FF41' : '#E6EDF3' }]}>{statusText}</Text>
            </View>

            <View style={styles.progressTrack}>
                <View
                    style={[
                        styles.progressFill,
                        {
                            width: progressRatio > 0 ? `${Math.max(6, Math.round(progressRatio * 100))}%` : '0%',
                            backgroundColor: accent,
                        },
                    ]}
                />
            </View>

            <View style={styles.footer}>
                <Text style={styles.metric}>
                    {goal.currentCount}/{goal.targetCount} TARGET
                </Text>
                <Text style={[styles.metric, { color: goal.isCompleted ? '#00FF41' : '#FFBD2E' }]}>
                    {timeRemaining} REMAINING
                </Text>
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#0C1016',
        borderWidth: 1,
        borderRadius: 18,
        padding: 16,
        marginBottom: 14,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.22,
        shadowRadius: 10,
        elevation: 4,
    },
    cardDisabled: {
        opacity: 0.72,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    titleWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    textWrap: {
        flex: 1,
    },
    icon: {
        margin: 0,
        marginRight: 6,
    },
    title: {
        color: '#E6EDF3',
        fontFamily: MONO,
        fontSize: 13,
        fontWeight: '700',
        letterSpacing: 0.7,
    },
    platformTag: {
        fontFamily: MONO,
        fontSize: 9,
        marginTop: 3,
        letterSpacing: 1,
    },
    status: {
        fontFamily: MONO,
        fontSize: 12,
        fontWeight: '700',
        marginLeft: 10,
    },
    progressTrack: {
        height: 6,
        borderRadius: 999,
        backgroundColor: '#111927',
        overflow: 'hidden',
        marginBottom: 10,
    },
    progressFill: {
        height: '100%',
        borderRadius: 999,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 12,
    },
    metric: {
        color: '#7D8590',
        fontFamily: MONO,
        fontSize: 10,
    },
});

export default GoalCard;
