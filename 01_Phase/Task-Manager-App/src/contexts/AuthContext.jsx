import { createContext, useEffect, useState } from "react";
import api from "../api/axios";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  });

  useEffect(() => {
    if (user) {
      localStorage.setItem("user", JSON.stringify(user));
    } else {
      localStorage.removeItem("user");
    }
  }, [user]);

  const register = async (email, password) => {
    const res = await api.post("/auth/register", { email, password });
    localStorage.setItem("token", res.data.token);
    setUser(res.data.user);
    return res.data;
  };
  const login = async (email, password) => {
    const res = await api.post("/auth/login", { email, password });
    localStorage.setItem("token", res.data.token);
    setUser(res.data.user);
    return res.data;
  };
  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
  };
  return (
    <AuthContext.Provider value={{ user, login, logout, register }}>
      {children}
    </AuthContext.Provider>
  );
};
