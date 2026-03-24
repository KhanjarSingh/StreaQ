import React, { useContext } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, ActivityIndicator, Platform } from 'react-native';
import { IconButton } from 'react-native-paper';
import { AuthContext } from '../context/AuthContext';

import LandingScreen from '../screens/LandingScreen';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import HomeScreen from '../screens/HomeScreen';
import ProfileScreen from '../screens/ProfileScreen';
import FailureGlitchScreen from '../screens/FailureGlitchScreen';

const AuthStack = createNativeStackNavigator();
const AppStack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const AuthNavigator = () => (
    <AuthStack.Navigator screenOptions={{ headerShown: false, animation: 'none', gestureEnabled: true }}>
        <AuthStack.Screen name="Landing" component={LandingScreen} />
        <AuthStack.Screen name="Login" component={LoginScreen} />
        <AuthStack.Screen name="Register" component={RegisterScreen} />
    </AuthStack.Navigator>
);

const AppNavigator = () => (
    <Tab.Navigator
        screenOptions={({ route }) => ({
            headerShown: false,
            tabBarStyle: {
                backgroundColor: '#0D1117',
                borderTopColor: '#30363D',
                height: Platform.OS === 'ios' ? 88 : 60,
                paddingBottom: Platform.OS === 'ios' ? 28 : 8,
                paddingTop: 8,
            },
            tabBarActiveTintColor: '#58A6FF',
            tabBarInactiveTintColor: '#8B949E',
            tabBarShowLabel: false, // Minimalist look
            tabBarIcon: ({ focused, color, size }) => {
                let iconName;
                if (route.name === 'Home') {
                    iconName = focused ? 'console-line' : 'console';
                } else if (route.name === 'Profile') {
                    iconName = focused ? 'account-circle' : 'account-circle-outline';
                }
                // Use IconButton for consistency but disable press since Tab handles it
                return <IconButton icon={iconName} iconColor={color} size={24} style={{ margin: 0 }} />;
            },
        })}
    >
        <Tab.Screen name="Home" component={HomeScreen} />
        <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
);

// Wraps the Tab navigator + FailureGlitch overlay in a stack so the glitch
// screen can be pushed full-screen without a tab bar.
const AppRootNavigator = () => (
    <AppStack.Navigator screenOptions={{ headerShown: false }}>
        <AppStack.Screen name="MainTabs" component={AppNavigator} />
        <AppStack.Screen
            name="FailureGlitch"
            component={FailureGlitchScreen}
            options={{ animation: 'fade', gestureEnabled: false }}
        />
    </AppStack.Navigator>
);

const AppNav = () => {
    const { isLoading, userToken } = useContext(AuthContext);

    if (isLoading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000000' }}>
                <ActivityIndicator size="large" color="#FFFFFF" />
            </View>
        );
    }

    return (
        <NavigationContainer>
            {userToken ? <AppRootNavigator /> : <AuthNavigator />}
        </NavigationContainer>
    );
};

export default AppNav;
