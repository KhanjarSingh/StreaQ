import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Platform, Animated, Easing } from 'react-native';
import { Button, Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

const LandingScreen = ({ navigation }) => {
    const [cursorVisible, setCursorVisible] = useState(true);

    useEffect(() => {
        const interval = setInterval(() => {
            setCursorVisible((v) => !v);
        }, 500);

        return () => clearInterval(interval);
    }, []);

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.contentContainer}>
                <View style={styles.logoSection}>
                    <View style={styles.titleRow}>
                        <Text variant="displayLarge" style={styles.title}>STREAQ</Text>
                        <Text variant="displayLarge" style={[styles.cursor, { opacity: cursorVisible ? 1 : 0 }]}>_</Text>
                    </View>

                    <View style={styles.separator} />

                    <Text variant="titleMedium" style={styles.subtitle}>
                        {`> Relentless.\n> Coding.\n> Discipline.`}
                    </Text>
                </View>

                <View style={styles.footer}>
                    <Button
                        mode="contained"
                        onPress={() => navigation.navigate('Login')}
                        style={styles.button}
                        contentStyle={styles.buttonContent}
                        labelStyle={styles.buttonLabel}
                    >
                        LOGIN
                    </Button>
                    <Button
                        mode="outlined"
                        onPress={() => navigation.navigate('Register')}
                        style={[styles.button, styles.outlineButton]}
                        contentStyle={styles.buttonContent}
                        labelStyle={styles.buttonLabel}
                    >
                        INIT_SEQUENCE
                    </Button>
                </View>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000000',
    },
    contentContainer: {
        flex: 1,
        justifyContent: 'space-between',
        padding: 32,
        paddingTop: 80,
    },
    logoSection: {
        flex: 1,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
    },
    title: {
        fontWeight: '900', 
        color: '#E0E0E0',
        letterSpacing: 2,
        fontSize: 64,
        lineHeight: 70,
    },
    cursor: {
        fontWeight: '900',
        color: '#00FF41',
        fontSize: 64,
        lineHeight: 70,
    },
    separator: {
        height: 4,
        backgroundColor: '#444444',
        width: 60,
        marginTop: 8,
        marginBottom: 32,
    },
    subtitle: {
        color: '#BBBBBB',
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
        lineHeight: 32,
        fontSize: 20,
    },
    footer: {
        gap: 16,
        marginBottom: 16,
    },
    button: {
        borderRadius: 0,
        borderWidth: 1,
        borderColor: '#444444',
    },
    outlineButton: {
        borderColor: '#333333',
    },
    buttonContent: {
        height: 60,
    },
    buttonLabel: {
        fontSize: 16,
        fontWeight: 'bold',
        letterSpacing: 2,
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    },
});

export default LandingScreen;
