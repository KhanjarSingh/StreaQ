import React, { useContext, useState } from 'react';
import { View, StyleSheet, Platform, TouchableOpacity, ScrollView, TextInput, Alert } from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthContext } from '../context/AuthContext';
import client from '../api/client';

const MONO = Platform.OS === 'ios' ? 'Menlo' : 'monospace';
const PROTOCOL_TYPES = ['GITHUB', 'LEETCODE', 'MANUAL'];
const REMINDER_OPTIONS = [
    { value: 'FIFTEEN_MINUTES', label: '15m' },
    { value: 'THIRTY_MINUTES', label: '30m' },
    { value: 'ONE_HOUR', label: '1h' },
];
const PUNISHMENT_OPTIONS = ['STRICT', 'HARSH', 'RELENTLESS'];

const SelectRow = ({ title, options, value, onChange }) => (
    <View style={styles.section}>
        <Text style={styles.label}>{title}</Text>
        <View style={styles.optionRow}>
            {options.map((option) => {
                const optionValue = option.value || option;
                const optionLabel = option.label || option;
                const active = value === optionValue;
                return (
                    <TouchableOpacity
                        key={optionValue}
                        style={[styles.optionChip, active && styles.optionChipActive]}
                        onPress={() => onChange(optionValue)}
                    >
                        <Text style={[styles.optionText, active && styles.optionTextActive]}>{optionLabel}</Text>
                    </TouchableOpacity>
                );
            })}
        </View>
    </View>
);

const ProtocolConfigScreen = ({ navigation, route }) => {
    const { userToken } = useContext(AuthContext);
    const existingGoal = route.params?.goal || null;
    const initialProtocolType = route.params?.protocolType || existingGoal?.protocolType || 'GITHUB';

    const [protocolType, setProtocolType] = useState(initialProtocolType);
    const [targetValue, setTargetValue] = useState(String(existingGoal?.targetValue || 1));
    const [dailyDeadline, setDailyDeadline] = useState(existingGoal?.dailyDeadline || '22:30');
    const [reminderFrequency, setReminderFrequency] = useState(existingGoal?.reminderFrequency || 'THIRTY_MINUTES');
    const [punishmentLevel, setPunishmentLevel] = useState(existingGoal?.punishmentLevel || 'STRICT');
    const [saving, setSaving] = useState(false);

    const heading = existingGoal ? `EDIT ${existingGoal.protocolType} PROTOCOL` : `ACTIVATE ${protocolType} PROTOCOL`;

    const handleSave = async () => {
        const target = Number(targetValue);
        if (!Number.isInteger(target) || target <= 0) {
            Alert.alert('INVALID TARGET', 'Target value must be a positive integer.');
            return;
        }

        if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(dailyDeadline)) {
            Alert.alert('INVALID DEADLINE', 'Deadline must be in HH:MM format.');
            return;
        }

        setSaving(true);
        try {
            const payload = {
                protocolType,
                targetValue: target,
                dailyDeadline,
                reminderFrequency,
                punishmentLevel,
            };

            if (existingGoal?.id) {
                await client.patch(`/api/goals/${existingGoal.id}/config`, payload, {
                    headers: { Authorization: `Bearer ${userToken}` },
                });
            } else {
                await client.post('/api/goals/protocols', payload, {
                    headers: { Authorization: `Bearer ${userToken}` },
                });
            }

            navigation.goBack();
        } catch (error) {
            Alert.alert('SAVE FAILED', error.response?.data?.message || 'Unable to save protocol settings.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.topBar}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={styles.back}>{'<'} back</Text>
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <Text style={styles.eyebrow}>OPERATOR PROTOCOL CONFIG</Text>
                <Text style={styles.title}>{heading}</Text>
                <Text style={styles.subTitle}>
                    Define target value, deadline, reminders, and punishment intensity before this protocol goes live.
                </Text>

                {!existingGoal ? (
                    <SelectRow title="PROTOCOL TYPE" options={PROTOCOL_TYPES} value={protocolType} onChange={setProtocolType} />
                ) : null}

                <View style={styles.section}>
                    <Text style={styles.label}>TARGET VALUE</Text>
                    <TextInput
                        style={styles.input}
                        value={targetValue}
                        onChangeText={setTargetValue}
                        keyboardType="number-pad"
                        placeholder="e.g. 3"
                        placeholderTextColor="#4B5563"
                    />
                </View>

                <View style={styles.section}>
                    <Text style={styles.label}>DAILY DEADLINE</Text>
                    <TextInput
                        style={styles.input}
                        value={dailyDeadline}
                        onChangeText={setDailyDeadline}
                        autoCapitalize="none"
                        placeholder="22:30"
                        placeholderTextColor="#4B5563"
                    />
                </View>

                <SelectRow
                    title="REMINDER FREQUENCY"
                    options={REMINDER_OPTIONS}
                    value={reminderFrequency}
                    onChange={setReminderFrequency}
                />

                <SelectRow
                    title="PUNISHMENT LEVEL"
                    options={PUNISHMENT_OPTIONS}
                    value={punishmentLevel}
                    onChange={setPunishmentLevel}
                />

                <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={saving}>
                    <Text style={styles.saveButtonText}>{saving ? '[ SAVING PROTOCOL... ]' : '[ COMMIT PROTOCOL ]'}</Text>
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#071019',
    },
    topBar: {
        paddingHorizontal: 20,
        paddingBottom: 8,
    },
    back: {
        color: '#58A6FF',
        fontFamily: MONO,
        fontSize: 14,
    },
    content: {
        padding: 20,
        paddingBottom: 40,
    },
    eyebrow: {
        color: '#58A6FF',
        fontFamily: MONO,
        fontSize: 10,
        letterSpacing: 1.2,
        marginBottom: 8,
    },
    title: {
        color: '#F0F6FC',
        fontFamily: MONO,
        fontSize: 24,
        fontWeight: '800',
    },
    subTitle: {
        color: '#8B949E',
        fontFamily: MONO,
        fontSize: 11,
        lineHeight: 18,
        marginTop: 10,
        marginBottom: 24,
    },
    section: {
        marginBottom: 20,
    },
    label: {
        color: '#8B949E',
        fontFamily: MONO,
        fontSize: 10,
        marginBottom: 8,
        letterSpacing: 1.1,
    },
    input: {
        backgroundColor: '#0D1621',
        borderWidth: 1,
        borderColor: '#1F2A37',
        color: '#E6EDF3',
        borderRadius: 16,
        paddingHorizontal: 14,
        paddingVertical: 14,
        fontFamily: MONO,
        fontSize: 14,
    },
    optionRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    optionChip: {
        borderWidth: 1,
        borderColor: '#22324A',
        borderRadius: 999,
        paddingHorizontal: 14,
        paddingVertical: 10,
        backgroundColor: '#0B131D',
    },
    optionChipActive: {
        borderColor: '#00FF41',
        backgroundColor: 'rgba(0,255,65,0.08)',
    },
    optionText: {
        color: '#C9D1D9',
        fontFamily: MONO,
        fontSize: 11,
    },
    optionTextActive: {
        color: '#00FF41',
        fontWeight: '700',
    },
    saveButton: {
        marginTop: 12,
        borderWidth: 1,
        borderColor: '#00FF41',
        borderRadius: 18,
        paddingVertical: 16,
        alignItems: 'center',
        backgroundColor: 'rgba(0,255,65,0.1)',
    },
    saveButtonText: {
        color: '#00FF41',
        fontFamily: MONO,
        fontSize: 12,
        fontWeight: '700',
    },
});

export default ProtocolConfigScreen;
