import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import mongoose from 'mongoose';

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
const PORT = process.env_PORT || 5000;
app.listen(PORT,() => {
    console.log(`Server running on ${PORT}`);
})