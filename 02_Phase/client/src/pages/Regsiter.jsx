import { useContext, useState } from "react";
import { AuthContext } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";
export default function Signup() {

  const { register } = useContext(AuthContext);
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(false);

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const getErrorMessage = (err) => {
    if (!err) return "Unknown error";
    if (err.response) {
      const data = err.response.data;
      return (
        data?.msg ||
        data?.error ||
        data?.errors?.[0]?.msg ||
        (typeof data === "string" ? data : JSON.stringify(data)) ||
        `Server responded with status ${err.response.status}`
      );
    }
    if (err.request) return "No response from server (network error)";
    return err.message || "An error occurred";
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    console.log("signup submit", form);
    try {
      // call context.register(name, email, password)
      await register(form.name, form.email, form.password);
      navigate("/dashboard");
    } catch (err) {
      console.error("Signup error raw:", err);
      console.error("Signup error response.data:", err?.response?.data);
      setErr(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md bg-white p-8 rounded shadow">
        <h2 className="text-2xl font-semibold mb-6">Sign up</h2>
        {err && <div className="mb-4 text-red-600 whitespace-pre-wrap">{err}</div>}
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium">Name</label>
            <input name="name" required value={form.name} onChange={onChange}
              className="mt-1 block w-full border rounded px-3 py-2 focus:outline-none focus:ring" />
          </div>

          <div>
            <label className="block text-sm font-medium">Email</label>
            <input name="email" type="email" required value={form.email} onChange={onChange}
              className="mt-1 block w-full border rounded px-3 py-2 focus:outline-none focus:ring" />
          </div>

          <div>
            <label className="block text-sm font-medium">Password</label>
            <input name="password" type="password" required minLength={6} value={form.password} onChange={onChange}
              className="mt-1 block w-full border rounded px-3 py-2 focus:outline-none focus:ring" />
          </div>

          <button type="submit" disabled={loading} className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700">
            {loading ? "Signing..." : "Sign up"}
          </button>
        </form>

        <p className="mt-4 text-sm">
          Already have an account? <Link className="text-indigo-600" to="/login">Log in</Link>
        </p>
      </div>
    </div>
  );
}
