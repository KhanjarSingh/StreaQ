import axios from 'axios';

const client = axios.create({
    baseURL: 'https://streaq.onrender.com',
    headers: {
        'Content-Type': 'application/json',
    },
});

export default client;
