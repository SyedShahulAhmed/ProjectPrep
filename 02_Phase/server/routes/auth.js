import express from "express";
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken";
import {body,validationResult} from "express-validator";
import User from "../models/UserModel.js";

const router = express.Router()

router.post('/register', [
    body('name').notEmpty().withMessage("Name is Requires"),
    body('email').isEmail().withMessage('Enter valid email'),
    body('password').isLength({min : 6}).withMessage('Password must atleast 6 chars')
],async(req,res) => {
    const error = validationResult(req);
    if(!error.isEmpty()){
        return res.status(400).json({errors : error.array()})
    }
    const {name,email,password} = req.body;
    try {
        let user = await User.findOne({email})
        if(user){
            return res.status(408).json({msg : "Email already in use !!!"})
        }
        const salt = await bcrypt.genSalt(10);
        const hashed = await bcrypt.hash(password,salt);
        user = new User({name,email,password : hashed})
        await user.save();
        const payload = {userId : user._id}
        const token = jwt.sign(payload,process.env.JWT_SECRET, {
            expiresIn : process.env.JWT_EXPIRE_IN || '1h'
        })
        res.json({token,userId : user._id,name : user,name,email:user.email})
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error')
    }
})

router.post('/login',[
    body('email').isEmail().withMessage('Email is Required'),
    body('password').exists().withMessage('Password required')
],async(req,res) =>{
    const errors = validationResult(req);
    if(!errors.isEmpty()){
        return res.status(400).json({errors : errors.array()})
    }
    const {email,password} = req.body;
    try {
        const user = await User.findOne({email})
        if(!user || !user.password){
            return res.status(403).json({msg : "Invalid Credentials"})
        }
        const isMatch = await bcrypt.compare(password,user.password);
        if(!isMatch){
            return res.status(405).json({msg : "Password wrong"})
        }
        const token = jwt.sign({userId : user._id},process.env.JWT_SECRET,{
            expiresIn : process.env.JWT_EXPIRE_IN || '1h'
        })
        res.json({token,user : {id : user._id, name : user.name,email:user.email}})
    } catch (error) {
        console.error(error);
        return res.status(500).send('Server error from login')
    }
})
export default router