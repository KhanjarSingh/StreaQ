const axios = require('axios');

const sendPushNotification = async (expoPushToken, title, body, data = {}) => {
    if (!expoPushToken) {
        console.warn('[NOTIFICATION_SERVICE] No token provided');
        return;
    }

    const message = {
        to: expoPushToken,
        sound: 'default',
        title,
        body,
        data,
    };

    try {
        await axios.post('https://exp.host/--/api/v2/push/send', message, {
            headers: {
                Accept: 'application/json',
                'Accept-encoding': 'gzip, deflate',
                'Content-Type': 'application/json',
            },
        });
        console.log(`[NOTIFICATION_SERVICE] Sent push to ${expoPushToken}`);
    } catch (error) {
        console.error('[NOTIFICATION_SERVICE_ERROR]', error.message);
    }
};

const sendWarningNotification = async (token, minutesLeft, title) => {
    await sendPushNotification(
        token,
        'WARNING: DEADLINE APPROACHING',
        `${minutesLeft} mins left to complete "${title}". Your streak is at risk.`,
        { type: 'WARNING', title }
    );
};

const sendCriticalNotification = async (token, title) => {
    await sendPushNotification(
        token,
        'CRITICAL: SYSTEM_FAILURE',
        `You failed to complete "${title}". Consequence issued. System corrupted.`,
        { type: 'CRITICAL', title }
    );
};

module.exports = {
    sendPushNotification,
    sendWarningNotification,
    sendCriticalNotification,
};
