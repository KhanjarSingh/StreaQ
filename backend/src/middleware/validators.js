const signUpValidator = (req, res, next) => {
    let { email, password, username } = req.body;
    if (!email?.trim()) {
        return res.status(400).json({ 
            error: "Incomplete data" ,
            message: "Email field cannot be empty."
        })
    }
    if (!password?.trim()) {
        return res.status(400).json({ 
            error: "Incomplete data" ,
            message: "Password field cannot be empty."
        })
    }
    if (!username?.trim()) {
        return res.status(400).json({ 
            error: "Incomplete data" ,
            message: "Username field cannot be empty."
        })
    }

    email = email.trim()
    password = password.trim()
    username = username.trim()

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    if (!emailPattern.test(email)) {
        return res.status(400).json({
            error: "Invalid email",
            message: "Please enter a valid email address."
        });
    }

    const passwordPattern =
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

    if (!passwordPattern.test(password)) {
        return res.status(400).json({
            error: "Weak password",
            message:
                "Password must be at least 8 characters long and include uppercase, lowercase, number, and special character."
        });
    }

    next();
}



const loginValidator = (req, res, next) => {
    let { email, password } = req.body;
    if (!email?.trim()) {
        return res.status(400).json({ 
            error: "Incomplete data" ,
            message: "Email field cannot be empty."
        })
    }
    if (!password?.trim()) {
        return res.status(400).json({ 
            error: "Incomplete data" ,
            message: "Password field cannot be empty."
        })
    }


    next();
}

module.exports = {signUpValidator, loginValidator}