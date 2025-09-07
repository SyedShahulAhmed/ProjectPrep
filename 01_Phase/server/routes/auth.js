import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

const router = express.Router();

//Register Route 

router.post("/register",async (req,res) => {
    try {
        const {email,password} = req.body;
        if(!email?.trim() || !password?.trim()){
            return res.status(400).json({message : "Fields Missing" })
        }
        const exist = await User.findOne({email});
        if(exist){
            return res.status(405).json({message : "User exits !!!"})
        }
        const passwordHash = await bcrypt.hash(password,10);
        const user = await User.create({email,passwordHash});
        const token = jwt.sign({id : user._id},process.env.JWT_SECRET, {expiresIn : '7d'})
        res.json(
            {
                token,
                user : {id : user._id,email : user.email}
            });
    } catch (error) {
        console.error(error);
        res.status(500).json({message : "Server Error"})
    }
})


//Login Route :-

router.post("/login",async(req,res) => {
    try {
        const {email ,password} = req.body
        if(!email?.trim() || !password?.trim()) {
            return res.status(409).json({message : "Fields missing"})
        }
        const user = await User.findOne({email});
        if(!user){
            return res.status(401).json({message : "Invalid Credentials"});
        }
        const correctPass =await bcrypt.compare(password,user.passwordHash)
        if(!correctPass){
            return res.status(401).json({message : "Invalid Credentials"});
        }
        const token = jwt.sign({id : user._id},process.env.JWT_SECRET, {expiresIn : '7d'});
        res.json(
            {token,
                user : {id : user._id,email : user.email}
            });
    } catch (error) {
        console.error(error);
        res.status(500).json({message : "Server Error from Login"})
    }
})

export default router;