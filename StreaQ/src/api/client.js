import axios from 'axios';
import { Platform } from 'react-native';

const NGROK_URL = 'https://c338ead0c321.ngrok-free.app';

const getBaseUrl = () => {
    if (NGROK_URL && NGROK_URL !== 'https://your-ngrok-url.ngrok-free.app') {
        return NGROK_URL;
    }
    return Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000';
};

const client = axios.create({
    baseURL: getBaseUrl(),
    headers: {
        'Content-Type': 'application/json',
    },
});

export default client;
