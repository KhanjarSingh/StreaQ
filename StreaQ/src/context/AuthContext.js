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

            // Setup axios interceptor for future requests
            client.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
        } catch (e) {
            console.log(`Login error: ${e}`);
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
        <AuthContext.Provider value={{ login, register, logout, isLoading, userToken, userInfo }}>
            {children}
        </AuthContext.Provider>
    );
};
