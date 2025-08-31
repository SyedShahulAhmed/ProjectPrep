import { useState } from "react";
import TaskList from "./components/TaskList";

function App() {
  return (
    <div className="min-h-screen bg-slate-600 flex items-center justify-center">
      <div className="bg-slate-800 shadow-lg rounded-xl p-6 w-full max-w-md">
        <h1 className="text-2xl font-bold text-center italic text-yellow-300 mb-4">
          Task Manager
        </h1>
        <TaskList />
      </div>
    </div>
  );
}

export default App;
