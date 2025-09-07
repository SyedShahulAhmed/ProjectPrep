import React, { use, useContext, useState } from "react";
import { AuthContext } from "../contexts/AuthContext";
import { Link } from "react-router-dom";

export default function Login() {
  const { login } = useContext(AuthContext);
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [err, setErr] = useState("");
  const submit = async (e) => {
    e.preventDefault();
    try {
      await login(email, pass);
      window.location.href = "/";
    } catch (error) {
      setErr(error?.response?.data?.message || "Login Failed");
    }
  };
  return (
    <form
      onSubmit={submit}
      className="max-w-md mx-auto mt-12 p-6 bg-white rounded"
    >
      {err && <div className="text-red-500 mb-2">{err}</div>}
      <input
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        className="w-full border p-2 mb-2"
      />
      <input
        required
        value={pass}
        onChange={(e) => setPass(e.target.value)}
        placeholder="Password"
        type="password"
        className="w-full border p-2 mb-4"
      />
      <button className="w-full bg-blue-600 text-white p-2 rounded">
        Login
      </button>
      <p className="mt-4 text-center text-sm text-gray-700">
        Don’t have an account?{" "}
        <Link to="/register" className="text-blue-600 hover:underline">
          Register here
        </Link>
      </p>
    </form>
  );
}
