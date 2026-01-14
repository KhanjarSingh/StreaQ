const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../config/db');


const generateAccessToken = (userId) => {
    try {
        const result = jwt.sign(
            { userId },
            process.env.JWT_SECRET_KEY,
            { expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m' }
        );
        return result
    }
    catch (err) {
        throw new Error('Failed to generate access token');
    }
}

const signup = async ({ email, password, username }) => {
    if (!email || !password) {
        throw new Error('Email and password are required');
    }

    email = email.toLowerCase().trim()
    password = password.trim()
    username = username.trim()

    if (password.length < 8) {
        throw new Error('Password must be at least 8 characters');
    }

    const existingUser = await prisma.user.findUnique({
        where: { email }
    });

    if (existingUser) {
        throw new Error('User already exists');
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
        data: {
            email,
            passwordHash,
            username,
            emailVerified: false,
            lastLoginAt: new Date()
        }
    });

    const accessToken = generateAccessToken(user.id);

    return {
        user: {
            id: user.id,
            email: user.email,
            username:user.username
        },
        accessToken
    };
}


const login = async ({ email, password }) => {
    if (!email || !password) {
        throw new Error('Email and password are required');
    }

    email = email.toLowerCase().trim()
    password = password.trim()

    const user = await prisma.user.findUnique({
        where: { email }
    });

    if (!user || !user.passwordHash) {
        throw new Error('Invalid credentials');
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
        throw new Error('Invalid credentials');
    }

    await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() }
    });

    const accessToken = generateAccessToken(user.id);

    return {
        user: {
            id: user.id,
            email: user.email
        },
        accessToken
    };
}

module.exports = {
    signup,
    login
};