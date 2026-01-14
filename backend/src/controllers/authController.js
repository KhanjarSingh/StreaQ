const authService = require('../services/auth.service');

const signup = async (req, res) => {
    try {
        let { email, password, username } = req.body;

        const data = await authService.signup({ email, password, username });
        res.status(201).json(data);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};

const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const data = await authService.login({ email, password });
        res.json(data);
    } catch (err) {
        res.status(401).json({ message: err.message });
    }
};


module.exports = { signup, login }