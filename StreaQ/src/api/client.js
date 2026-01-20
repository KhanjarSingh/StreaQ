import axios from 'axios';
import { Platform } from 'react-native';

const NGROK_URL = 'https://4fb1c8a35720.ngrok-free.app';

const getBaseUrl = () => {
    if (NGROK_URL && NGROK_URL !== 'https://c7d821877957.ngrok-free.app') {
        return NGROK_URL;
    }
    return Platform.OS === 'android' ? 'https://c7d821877957.ngrok-free.app' : 'https://c7d821877957.ngrok-free.app';
};

const client = axios.create({
    baseURL: NGROK_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

export default client;
