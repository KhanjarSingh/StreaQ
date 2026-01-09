const express = require('express');
const cors = require('cors');
require('dotenv').config();
const prisma = require('./config/db');
const router = require('./routes/routes');
const PORT = process.env.PORT || 3000;

const app = express();

app.use(cors({
  origin: '*'
}));



app.use(express.json());
app.use(express.urlencoded({ extended: true }));


app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});


app.use('/api',router)

async function startServer() {
    try {

        await prisma.$connect();
        console.log('✅ Database connected');


        app.listen(PORT, () => {
            console.log(`🚀 Server running on port http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}

startServer()