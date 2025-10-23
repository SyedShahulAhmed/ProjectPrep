import axios from "axios";

const API = axios.create({
  baseURL: "https://imageuploader-wh2t.onrender.com/api" || "http://localhost:5000/api", 
});

export default API;
