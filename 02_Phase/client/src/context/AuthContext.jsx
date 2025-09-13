import { createContext, useEffect, useState } from "react";
import {register,login,profile} from "../services/api.js"
export const AuthContext = createContext()

export const AuhtProvider = ({children}) => {
    const [token,setToken] = useState(() => localStorage.getItem('token'))
    const [user,setUser] = useState(null);
    const [loading,setLoading] = useState(Boolean(token))
    useEffect(() => {
        let mounted = true;
        const load = async () => {
            if(!token){
                setUser(null);
                setLoading(false)
                return
            }
            try {
                setLoading(true)
                const res = await profile();
                if(mounted) setUser(res.data);
                
            } catch (error) {
                console.error("Failed to load data",error);
                localStorage.removeItem('token')
                setToken(null)
                setUser(null)
                return
            } finally {
                if(mounted) setLoading(false)
            }
        }
        load();
        return () => { mounted = false}
    },[token])
    const persist = (tok) => {
        if(tok){
            localStorage.setItem('token',tok)
            setToken(tok)
        }else{
            localStorage.removeItem('token')
            setToken(null)
            setUser(null)
        }
    }
    const doLogin = async(email,password) => {
        const res = await login({email,password})
        const tok = res.data.token;
        persist(tok)
        return res.data;
    }
    const doRegister = async (name,email,password) =>{
        const res = await register({name,email,password})
        const tok = res.data.token;
        persist(tok)
        return res.data;
    }
    const setTokenFromGoogle = (tok,userObj = null) => {
        persist(tok)
        if(userObj) setUser(userObj)
    }
    const logout = () => {
        persist(null);
        setUser(null);
    }
    return (
        <AuthContext.Provider value={{user,token,loading,login : doLogin,register : doRegister,logout,setTokenFromGoogle}}>
        {children}
        </AuthContext.Provider>
    )
}