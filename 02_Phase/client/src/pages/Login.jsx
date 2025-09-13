import { useContext, useState } from "react";
import { AuthContext } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";
import GoogleSignIn from "../components/GoogleSignIn";

export default function Login() {
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(false);

  const onChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const getErrorMessage = (err) => {
    // axios error shape: err.response.data  OR err.request OR err.message
    if (!err) return "Unknown error";
    if (err.response) {
      // server responded with a status code outside 2xx
      return (
        err.response.data?.msg ||
        err.response.data?.error ||
        (typeof err.response.data === "string"
          ? err.response.data
          : JSON.stringify(err.response.data)) ||
        `Server responded with status ${err.response.status}`
      );
    }
    if (err.request) {
      return "No response from server (network error)";
    }
    return err.message || "An error occurred";
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr(null);
    setLoading(true);                // <-- fixed (was setSubmitting)
    console.log("submit", form);     // helpful debug line
    try {
      await login(form.email, form.password);
      navigate("/dashboard");
    } catch (err) {
      console.error("Login error raw:", err);
      const msg = getErrorMessage(err);
      setErr(msg);
    } finally {
      setLoading(false);             // <-- fixed
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md bg-white p-8 rounded shadow">
        <h2 className="text-2xl font-semibold mb-6">Log in</h2>
        {err && <div className="mb-4 text-red-600 whitespace-pre-wrap">{err}</div>}
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium">Email</label>
            <input
              name="email"
              type="email"
              required
              value={form.email}
              onChange={onChange}
              className="mt-1 block w-full border rounded px-3 py-2 focus:outline-none focus:ring"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Password</label>
            <input
              name="password"
              type="password"
              required
              value={form.password}
              onChange={onChange}
              className="mt-1 block w-full border rounded px-3 py-2 focus:outline-none focus:ring"
            />
          </div>
          <button
            type="submit"
            className="w-full bg-indigo-600 text-white py-2 rounded hover:bg-indigo-700 mb-5"
            disabled={loading}
          >
            {loading ? "Logging..." : "Log in"}
          </button>
        </form>
        <GoogleSignIn/>
        <p className="mt-4 text-sm">
          Don't have an account?{" "}
          <Link className="text-indigo-600" to="/signup">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
