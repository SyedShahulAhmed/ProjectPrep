import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import TaskModel from './models/TaskModel.js';
import dotenv from 'dotenv';
import authRoutes from "./routes/auth.js"
import auth from './middleware/auth.js';
dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());

app.get("/",(req,res) => {
    res.send("API IS RUNNING....")
})
app.listen(process.env.PORT,() => {
    console.log("Server running on port 5000");
})
app.use("/auth",authRoutes)
mongoose.connect(process.env.MONGO_URI)
.then(() => console.log("MongoDb Connected"))
.catch((e) => console.error("Error while connecting " , e))

app.get("/tasks",auth, async (req,res) => {
    const tasks = await TaskModel.find({user : req.user.id}).sort({createdAt : -1});
    res.json(tasks);
})

app.post("/tasks",auth, async (req,res) => {
    const {text} = req.body;
    const newTask = new TaskModel({text,user : req.user.id});
    await newTask.save();
    res.json(newTask);
})

app.put("/tasks/:id" ,auth, async (req,res) => {
    const {id} = req.params;
    const {text,completed} = req.body;
    const updateTask = await TaskModel.findByIdAndUpdate(
        {_id : id,user : req.user.id},
        {text, completed},
        {new : true},
    )
    if(!updateTask){
        return res.status(403).json({message : "task not found"})
    }
    res.json(updateTask)
})

app.delete("/tasks/:id",auth, async (req,res) => {
    const {id} = req.params;
    const deleted = await TaskModel.findByIdAndDelete({
        _id : id,
        user : req.user.id,
    });
    if(!deleted){
        return res.status(403).json({message : "Task not found"})
    }
    res.json({message : "Task Deleted"})
})