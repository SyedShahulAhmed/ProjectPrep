import { useContext } from "react";
import {AuthContext} from "../context/AuthContext"
import { Navigate } from "react-router-dom";
export default function ProtectedRoute({children}) {
    const {token,loading} = useContext(AuthContext)
    if(loading) return <div className="p-6">Loading...</div>
    if(!token) return <Navigate to = "/login" replace />
    return children;
}