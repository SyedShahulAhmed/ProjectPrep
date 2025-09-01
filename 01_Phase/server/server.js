import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import TaskModel from './models/TaskModel.js';


const app = express();

app.use(cors());
app.use(express.json());

app.get("/",(req,res) => {
    res.send("API IS RUNNING....")
})
app.listen(5000,() => {
    console.log("Server running on port 5000");
})

mongoose.connect("mongodb+srv://User123:jUoPa6IGCQvadYex@clustermain.lpy6jrt.mongodb.net/taskmanager?retryWrites=true&w=majority&appName=ClusterMain")
.then(() => console.log("MongoDb Connected"))
.catch((e) => console.error("Error while connecting " , e))

app.get("/tasks", async (req,res) => {
    const tasks = await TaskModel.find();
    res.json(tasks);
})

app.post("/tasks", async (req,res) => {
    const {text} = req.body;
    const newTask = new TaskModel({text});
    await newTask.save();
    res.json(newTask);
})

app.put("/tasks/:id" , async (req,res) => {
    const {id} = req.params;
    const {text,completed} = req.body;
    const updateTask = await TaskModel.findByIdAndUpdate(
        id,
        {text, completed},
        {new : true},
    )
    res.json(updateTask)
})

app.delete("/tasks/:id", async (req,res) => {
    const {id} = req.params;
    await TaskModel.findByIdAndDelete(id);
    res.json({message : "Task Deleted"})
})