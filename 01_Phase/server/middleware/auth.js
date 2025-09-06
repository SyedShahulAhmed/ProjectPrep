import jwt from "jsonwebtoken"


export default function auth(req,res,next) {
    const header = req.headers.authorization || "";
    const token =  header.startsWith("Bearer") ? header.slice(7) : null;
    if(!token) {
        return res.status(403).json({message : "No token provided"})
    }
    try {
        const payLoad = jwt.verify(token,process.env.JWT_SECRET);
        req.user = { id : payLoad.id}
        next();
    } catch (error) {
        return res.startsWith(401).json({message : "Invalid Token"})
    }
}