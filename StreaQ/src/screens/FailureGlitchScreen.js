import React, { useEffect, useState, useRef } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, StyleSheet,
    Platform, KeyboardAvoidingView, Animated, Alert
} from 'react-native';
import * as Haptics from 'expo-haptics';

const MONO = Platform.OS === 'ios' ? 'Menlo' : 'monospace';
const UNLOCK_PHRASE = 'I HAVE FAILED';

const GLITCH_CHARS = '█▓▒░#@$%&*!?';
const glitchText = (str) =>
    str.split('').map(c =>
        Math.random() < 0.15 ? GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)] : c
    ).join('');

const FailureGlitchScreen = ({ navigation }) => {
    const [input, setInput] = useState('');
    const [error, setError] = useState('');
    const [glitchedTitle, setGlitchedTitle] = useState('SYSTEM CORRUPTED');

    // RN Animated values — no JSI/worklets
    const shakeX = useRef(new Animated.Value(0)).current;
    const scanAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        // Heartbeat haptics
        const hapticPattern = async () => {
            for (let i = 0; i < 6; i++) {
                await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                await new Promise(r => setTimeout(r, 180));
                await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                await new Promise(r => setTimeout(r, 80));
            }
        };
        hapticPattern();

        // Screen shake
        Animated.sequence([
            Animated.timing(shakeX, { toValue: 10, duration: 50, useNativeDriver: true }),
            Animated.timing(shakeX, { toValue: -10, duration: 50, useNativeDriver: true }),
            Animated.timing(shakeX, { toValue: 8, duration: 50, useNativeDriver: true }),
            Animated.timing(shakeX, { toValue: -8, duration: 50, useNativeDriver: true }),
            Animated.timing(shakeX, { toValue: 6, duration: 50, useNativeDriver: true }),
            Animated.timing(shakeX, { toValue: -6, duration: 50, useNativeDriver: true }),
            Animated.timing(shakeX, { toValue: 0, duration: 50, useNativeDriver: true }),
        ]).start();

        // Scanline flicker loop
        const scanLoop = Animated.loop(
            Animated.sequence([
                Animated.timing(scanAnim, { toValue: 0.85, duration: 60, useNativeDriver: true }),
                Animated.timing(scanAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
            ])
        );
        scanLoop.start();

        // Glitch title
        let count = 0;
        const gi = setInterval(() => {
            count++;
            setGlitchedTitle(count < 20 ? glitchText('SYSTEM CORRUPTED') : 'SYSTEM CORRUPTED');
            if (count >= 20) clearInterval(gi);
        }, 80);

        return () => {
            scanLoop.stop();
            clearInterval(gi);
        };
    }, []);

    const triggerWrongShake = () => {
        shakeX.setValue(0);
        Animated.sequence([
            Animated.timing(shakeX, { toValue: 8, duration: 40, useNativeDriver: true }),
            Animated.timing(shakeX, { toValue: -8, duration: 40, useNativeDriver: true }),
            Animated.timing(shakeX, { toValue: 0, duration: 40, useNativeDriver: true }),
        ]).start();
    };

    const handleAttempt = () => {
        if (input.trim().toUpperCase() === UNLOCK_PHRASE) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
        } else {
            setError(`> ERROR: "${input}" is not the required phrase.`);
            setInput('');
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            triggerWrongShake();
        }
    };

    const inputColor = input.toUpperCase() === UNLOCK_PHRASE ? '#00FF00' : '#FF0000';

    return (
        <KeyboardAvoidingView
            style={styles.bg}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <Animated.View style={[
                styles.container,
                { transform: [{ translateX: shakeX }], opacity: scanAnim }
            ]}>
                <View style={styles.scanOverlay} pointerEvents="none" />

                <Text style={styles.errorCode}>ERR_0xDEAD :: STREAK_TERMINATED</Text>
                <Text style={styles.title}>{glitchedTitle}</Text>

                <View style={styles.divider} />

                <Text style={styles.body}>
                    {'> DISCIPLINE_PROTOCOL: BREACH DETECTED\n'}
                    {'> ALL PROGRESS HAS BEEN RESET\n'}
                    {'> STREAK COUNTER: [████ ZEROED ████]\n\n'}
                    {'> To reinitialise the system, you must\n'}
                    {'  acknowledge your failure.\n'}
                </Text>

                <View style={styles.divider} />

                <Text style={styles.prompt}>
                    {'> Type exactly: '}
                    <Text style={styles.phrase}>{UNLOCK_PHRASE}</Text>
                </Text>

                <TextInput
                    style={[styles.input, { borderColor: inputColor, color: inputColor }]}
                    value={input}
                    onChangeText={setInput}
                    autoCapitalize="characters"
                    autoCorrect={false}
                    placeholder="TYPE HERE..."
                    placeholderTextColor="#333"
                    onSubmitEditing={handleAttempt}
                    returnKeyType="done"
                />

                {error !== '' && <Text style={styles.errorText}>{error}</Text>}

                <TouchableOpacity style={styles.confirmBtn} onPress={handleAttempt}>
                    <Text style={styles.confirmBtnText}>[ CONFIRM_ACKNOWLEDGEMENT ]</Text>
                </TouchableOpacity>

                <Text style={styles.footer}>
                    {'// System will only reset when truth is spoken.'}
                </Text>
            </Animated.View>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    bg: { flex: 1, backgroundColor: '#000' },
    container: { flex: 1, backgroundColor: '#060000', padding: 28, justifyContent: 'center' },
    scanOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,0,0,0.04)' },
    errorCode: { fontFamily: MONO, fontSize: 9, color: '#FF0000', letterSpacing: 1, marginBottom: 12, opacity: 0.7 },
    title: {
        fontFamily: MONO, fontSize: 28, fontWeight: '900', color: '#FF0000', letterSpacing: 3,
        textShadowColor: '#FF0000', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 12, marginBottom: 16,
    },
    divider: { height: 1, backgroundColor: '#330000', marginVertical: 16 },
    body: { fontFamily: MONO, fontSize: 11, color: '#CC0000', lineHeight: 18 },
    prompt: { fontFamily: MONO, fontSize: 12, color: '#888', marginBottom: 12, marginTop: 8 },
    phrase: { color: '#FF0000', fontWeight: 'bold' },
    input: {
        fontFamily: MONO, fontSize: 16, borderWidth: 1,
        backgroundColor: '#0A0000', padding: 14, letterSpacing: 2, marginBottom: 8,
    },
    errorText: { fontFamily: MONO, fontSize: 10, color: '#FF4444', marginBottom: 12 },
    confirmBtn: {
        borderWidth: 1, borderColor: '#FF0000', backgroundColor: 'rgba(255,0,0,0.1)',
        padding: 14, alignItems: 'center', marginTop: 8,
    },
    confirmBtnText: { fontFamily: MONO, fontSize: 11, color: '#FF0000', fontWeight: 'bold', letterSpacing: 1 },
    footer: { fontFamily: MONO, fontSize: 9, color: '#330000', marginTop: 32, textAlign: 'center' },
});

export default FailureGlitchScreen;
