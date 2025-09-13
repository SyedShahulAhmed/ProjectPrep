import axios from "axios";

const Base_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const api = axios.create({
    baseURL : Base_URL,
})

api.interceptors.request.use(config => {
    const token = localStorage.getItem('token');
    if(token) config.headers.Authorization = `Bearer ${token}`
    return config
},err => Promise.reject(err))

export const register = (payload) => api.post("/auth/register",payload)
export const login = (payload) => api.post("/auth/login",payload)
export const profile = () => api.get('/profile/me')
 
export default api;