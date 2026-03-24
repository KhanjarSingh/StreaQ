import React, { useEffect, useRef, useState, useCallback } from 'react';
import { FlatList, View, Text, StyleSheet, Platform, Animated } from 'react-native';
import client from '../api/client';

const MONO = Platform.OS === 'ios' ? 'Menlo' : 'monospace';

const LEVEL_COLOR = {
    SUCCESS: '#00FF00',
    INFO: '#E0E0E0',
    WARNING: '#FFD700',
    CRITICAL: '#FF0000',
};

// ─── Typewriter Row ────────────────────────────────────────────────────────────
const TypewriterRow = ({ item, isNew }) => {
    const [displayed, setDisplayed] = useState(isNew ? '' : item.message);

    useEffect(() => {
        if (!isNew) return;
        let i = 0;
        const interval = setInterval(() => {
            i++;
            setDisplayed(item.message.slice(0, i));
            if (i >= item.message.length) clearInterval(interval);
        }, 18);
        return () => clearInterval(interval);
    }, []);

    const color = LEVEL_COLOR[item.level] || '#E0E0E0';
    const ts = new Date(item.timestamp).toTimeString().slice(0, 8);

    return (
        <Text style={[styles.logLine, { color }]}>
            <Text style={styles.ts}>[{ts}] </Text>
            {displayed}
        </Text>
    );
};

// ─── TerminalConsole ──────────────────────────────────────────────────────────
const TerminalConsole = ({ userId, token, pollIntervalMs = 10000 }) => {
    const [logs, setLogs] = useState([]);
    const [newIds, setNewIds] = useState(new Set());
    const listRef = useRef(null);
    const prevIdsRef = useRef(new Set());

    // Blinking cursor using RN Animated (no JSI/worklets)
    const cursorAnim = useRef(new Animated.Value(1)).current;
    useEffect(() => {
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(cursorAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
                Animated.timing(cursorAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
            ])
        );
        loop.start();
        return () => loop.stop();
    }, []);

    const fetchLogs = useCallback(async () => {
        if (!userId || !token) return;
        try {
            const res = await client.get(`/api/logs/${userId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const incoming = res.data?.logs || [];
            const incomingIds = new Set(incoming.map(l => l.id));
            const freshIds = new Set([...incomingIds].filter(id => !prevIdsRef.current.has(id)));
            prevIdsRef.current = incomingIds;
            setNewIds(freshIds);
            setLogs(incoming);
        } catch {
            // silently fail
        }
    }, [userId, token]);

    useEffect(() => {
        fetchLogs();
        const timer = setInterval(fetchLogs, pollIntervalMs);
        return () => clearInterval(timer);
    }, [fetchLogs, pollIntervalMs]);

    useEffect(() => {
        if (logs.length > 0) {
            setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
        }
    }, [logs.length]);

    return (
        <View style={styles.terminal}>
            <FlatList
                ref={listRef}
                data={logs}
                keyExtractor={item => item.id}
                renderItem={({ item }) => (
                    <TypewriterRow item={item} isNew={newIds.has(item.id)} />
                )}
                scrollEnabled
                style={styles.list}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                initialNumToRender={20}
                ListEmptyComponent={
                    <Text style={styles.empty}>{'> Awaiting system events...'}</Text>
                }
            />
            <Animated.Text style={[styles.cursor, { opacity: cursorAnim }]}>_</Animated.Text>
        </View>
    );
};

const styles = StyleSheet.create({
    terminal: {
        backgroundColor: '#000',
        borderWidth: 1,
        borderColor: '#1A1A1A',
        minHeight: 160,
        maxHeight: 280,
        padding: 12,
    },
    list: { flex: 1 },
    listContent: { paddingBottom: 4 },
    logLine: { fontFamily: MONO, fontSize: 10, lineHeight: 16, marginBottom: 2 },
    ts: { color: '#444' },
    empty: { fontFamily: MONO, fontSize: 10, color: '#444' },
    cursor: { color: '#00FF00', fontFamily: MONO, fontWeight: 'bold', fontSize: 14, marginTop: 4 },
});

export default TerminalConsole;
