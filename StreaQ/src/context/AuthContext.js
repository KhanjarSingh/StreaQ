import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import client from '../api/client';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [userToken, setUserToken] = useState(null);
    const [userInfo, setUserInfo] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    const login = async (email, password) => {
        try {
            const response = await client.post('/api/auth/login', { email, password });
            const { accessToken, user } = response.data;

            setUserInfo(user);
            setUserToken(accessToken);

            await AsyncStorage.setItem('userToken', accessToken);
            await AsyncStorage.setItem('userInfo', JSON.stringify(user));

            client.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
        } catch (e) {
            console.log(`Login error: ${e}`);
            throw e;
        }
    };

    const externalLogin = async (accessToken, user) => {
        try {
            setUserInfo(user);
            setUserToken(accessToken);

            await AsyncStorage.setItem('userToken', accessToken);
            if (user) {
                await AsyncStorage.setItem('userInfo', JSON.stringify(user));
            }

            client.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
        } catch (e) {
            console.log(`External Login error: ${e}`);
            throw e;
        }
    };

    const register = async (username, email, password) => {
        try {
            const response = await client.post('/api/auth/register', { username, email, password });
            const { accessToken, user } = response.data;

            setUserInfo(user);
            setUserToken(accessToken);

            await AsyncStorage.setItem('userToken', accessToken);
            await AsyncStorage.setItem('userInfo', JSON.stringify(user));

            client.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
        } catch (e) {
            console.log(`Register error: ${e}`);
            throw e;
        }
    };

    const logout = async () => {
        setIsLoading(true);
        setUserToken(null);
        setUserInfo(null);
        await AsyncStorage.removeItem('userToken');
        await AsyncStorage.removeItem('userInfo');
        delete client.defaults.headers.common['Authorization'];
        setIsLoading(false);
    };

    const isLoggedIn = async () => {
        try {
            setIsLoading(true);
            let userToken = await AsyncStorage.getItem('userToken');
            let userInfo = await AsyncStorage.getItem('userInfo');

            if (userToken) {
                setUserToken(userToken);
                setUserInfo(JSON.parse(userInfo));
                client.defaults.headers.common['Authorization'] = `Bearer ${userToken}`;

                // Refresh user profile from backend to ensure data is up to date (fixes stale github-user)
                try {
                    const res = await client.get('/api/users/me');
                    if (res.data) {
                        setUserInfo(res.data);
                        await AsyncStorage.setItem('userInfo', JSON.stringify(res.data));
                    }
                } catch (err) {
                    console.log('Failed to refresh user profile', err);
                    if (err.response && (err.response.status === 401 || err.response.status === 403)) {
                        // Token is stale or invalid, force logout
                        await logout();
                    }
                }
            }
            setIsLoading(false);
        } catch (e) {
            console.log(`isLogged in error ${e}`);
            setIsLoading(false);
        }
    };

    useEffect(() => {
        isLoggedIn();
    }, []);

    return (
        <AuthContext.Provider value={{ login, register, externalLogin, logout, isLoading, userToken, userInfo }}>
            {children}
        </AuthContext.Provider>
    );
};
