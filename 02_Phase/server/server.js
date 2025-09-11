import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import mongoose from 'mongoose';
import authRoutes from "./routes/auth.js"
import profileRoute from "./routes/profile.js"
import googleAuthRoutes from './routes/googleAuth.js'
import githubRoutes from './routes/githubPublic.js'
const app = express();
dotenv.config();

app.use(express.json());
app.use(cors({origin : process.env.CLIENT_URL || "*" , credentials : true}))

mongoose.connect(process.env.MONGO_URI)
.then(() => console.log("MONGO DB CONNECTED"))
.catch((e) => console.error("MONGO ERROR",e))

app.get("/",(req,res) => {
    res.send("Backend is Running....")
})

app.use('/api/auth',authRoutes)
app.use('/api/profile',profileRoute)
app.use('/api/auth',googleAuthRoutes)

//GITHUB PUBLIC ROUTE

app.use('/api/github',githubRoutes)

const PORT = process.env_PORT || 5000;
app.listen(PORT,() => {
    console.log(`Server running on ${PORT}`);
})