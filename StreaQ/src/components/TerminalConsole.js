import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Platform, Animated, ScrollView } from 'react-native';
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
// Uses a plain ScrollView + mapped Views instead of FlatList to avoid the
// "VirtualizedList inside ScrollView" warning when embedded in HomeScreen.
const TerminalConsole = ({ userId, token, pollIntervalMs = 10000, refreshKey = 0 }) => {
    const [logs, setLogs] = useState([]);
    const [newIds, setNewIds] = useState(new Set());
    const scrollRef = useRef(null);
    const prevIdsRef = useRef(new Set());

    // Blinking cursor
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
        fetchLogs();
    }, [fetchLogs, refreshKey]);

    useEffect(() => {
        if (logs.length > 0) {
            setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
        }
    }, [logs.length]);

    return (
        <View style={styles.terminal}>
            {/* Plain ScrollView — no nested VirtualizedList warning */}
            <ScrollView
                ref={scrollRef}
                style={styles.scroll}
                nestedScrollEnabled
                showsVerticalScrollIndicator={false}
            >
                {logs.length === 0
                    ? <Text style={styles.empty}>{'> Awaiting system events...'}</Text>
                    : logs.map(item => (
                        <TypewriterRow key={item.id} item={item} isNew={newIds.has(item.id)} />
                    ))
                }
            </ScrollView>
            <Animated.Text style={[styles.cursor, { opacity: cursorAnim }]}>_</Animated.Text>
        </View>
    );
};

const styles = StyleSheet.create({
    terminal: {
        backgroundColor: '#020409',
        borderWidth: 1,
        borderColor: '#132033',
        minHeight: 120,
        maxHeight: 220,
        padding: 12,
        borderRadius: 16,
    },
    scroll: { flex: 1 },
    logLine: { fontFamily: MONO, fontSize: 10, lineHeight: 16, marginBottom: 2 },
    ts: { color: '#444' },
    empty: { fontFamily: MONO, fontSize: 10, color: '#444' },
    cursor: { color: '#00FF00', fontFamily: MONO, fontWeight: 'bold', fontSize: 14, marginTop: 4 },
});

export default TerminalConsole;
