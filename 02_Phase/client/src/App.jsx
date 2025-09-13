import { AuhtProvider, AuthContext } from "./context/AuthContext";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Regsiter";
import ProtectedRoute from "./components/ProtectedRoute";
import { useContext } from "react";
import Github from "./components/Github";
function Dashboard() {
  const { user, logout } = useContext(AuthContext);
  return (
    <div className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-3xl mx-auto bg-white rounded p-6 shadow">
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-semibold">Dashboard</h1>
          <button
            className="px-3 py-1 bg-red-500 text-white rounded"
            onClick={logout}
          >
            Logout
          </button>
        </div>
        <div className="mt-6">
          <p className="text-sm text-gray-600">Logged in as:</p>
          <pre className="bg-gray-100 p-4 rounded mt-2">
            {JSON.stringify(user, null, 2)}
          </pre>
        </div>
      </div>
      <Github/>
    </div>
  );
}

function App() {
  return (
    <AuhtProvider>
      <BrowserRouter>
        <nav className="bg-white border-b p-3">
          <div className="max-w-4xl mx-auto flex gap-4">
            <Link to="/" className="text-indigo-600">
              Home
            </Link>
            <Link to="/register" className="text-gray-700">
              Signup
            </Link>
            <Link to="/login" className="text-gray-700">
              Login
            </Link>
            <Link to="/dashboard" className="text-gray-700">
              Dashboard
            </Link>
          </div>
        </nav>
        <Routes>
          <Route path="/" element={<div className="p-8">HOME_PUBLIC</div>} />
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Login />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuhtProvider>
  );
}

export default App;
