import express from "express"
import auth from "../middleware/auth.js"
import User from "../models/UserModel.js"


const router = express.Router()

router.get('/me',auth,async(req,res) => {
    try {
        const user = await User.findById(req.userId).select('-password -__v')
        if(!user){
            return res.status(404).json({msg : "User not found !!!"})
        }
        res.json(user);
    } catch (error) {
        console.error(error);
        res.status(500).send('Server error')
    }
})

export default router;