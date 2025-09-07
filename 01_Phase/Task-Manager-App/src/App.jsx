import { BrowserRouter, Route, Routes } from "react-router-dom";
import TaskList from "./components/TaskList";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ProtectedRoute from "./components/ProtectedRoute";

function App() {
  return (
    <div className="min-h-screen bg-slate-600 flex items-center justify-center">
      <div className="bg-slate-800 shadow-lg rounded-xl p-6 w-full max-w-md">
        <h1 className="text-2xl font-bold text-center italic text-yellow-300 mb-4">
          Task Manager
        </h1>
        <BrowserRouter>
        <Routes>
          <Route path = "/login" element = {<Login/>} />
          <Route path="/register" element = {<Register/> }/>
          <Route element = {<ProtectedRoute/>}>
          <Route path="/" element = {<TaskList/>}/>
          </Route>
        </Routes>
        </BrowserRouter>
      </div>
    </div>
  );
}

export default App;
