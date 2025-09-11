import jwt from "jsonwebtoken"

export default function(req,res,next){
    const header = req.header("Authorization");
    if(!header){
        return res.status(401).json({msg : "No token"})
    }
    const token = header.startsWith("Bearer ") ? header.slice(7).trim() : header.trim();
    try {
        const decode = jwt.verify(token,process.env.JWT_SECRET)
        req.userId = decode.userId
        next()
    } catch (error) {
        return res.status(401).json({msg : "Token is Invalid"})
    }
}