import React, { useState } from "react";
import axios from "axios";
import { useEffect } from "react";
import api from "../api/axios";
import LogoutButton from "./Logout";

const TaskList = () => {
  const [tasks, setTasks] = useState([]);
  const [task, setTask] = useState("");

  useEffect(() => {
    api
      .get("/tasks")
      .then((res) => setTasks(res.data))
      .catch((e) => console.error(e));
  }, []);

  const addTask = () => {
    if (!task.trim()) return;
    api
      .post("/tasks", { text: task })
      .then((res) => {
        setTasks((p) => [...p, res.data]);
        setTask("");
      })
      .catch((e) => console.error(e));
  };
  const toggleTask = (id, completed, text) => {
    api
      .put(`/tasks/${id}`, { text, completed: !completed })
      .then((res) => {
        setTasks((p) => p.map((t) => (t._id === id ? res.data : t)));
      })
      .catch((e) => console.error(e));
  };
  const deleteTask = (id) => {
    api
      .delete(`/tasks/${id}`)
      .then(() => {
        setTasks((p) => p.filter((t) => t._id !== id));
      })
      .catch((e) => console.error(e));
  };
  const UpdateTask = (id,completed,currText) => {
    const newTask = prompt("Enter Update Task :- ", currText);
    if (!newTask || !newTask.trim()) return;
    api.put(`/tasks/${id}`, { text: newTask, completed})
    .then((res) => {
      setTasks((p) => 
      p.map((t) => (t._id === id ? res.data : t))
      );
    })
    .catch((e) => console.error(e))

  };
  return (
    <div>
      <div className="flex mb-4">
        <input
          type="text"
          value={task}
          placeholder="Enter new Task..."
          className="flex-1 text-white border border-gray-500 rounded-l-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 placeholder:text-white"
          onChange={(e) => setTask(e.target.value)}
        />
        <button
          className="bg-red-700 border-none text-white px-4 py-2 rounded-r-md hover:bg-red-800"
          onClick={addTask}
        >
          Add
        </button>
      </div>
      <ul className="space-y-2">
        {tasks.map((t) => (
          <li
            key={t._id}
            className={`bg-gray-100 border border-gray-300 rounded-md px-3 py-2 shadow-sm flex justify-between items-center ${
              t.completed ? "line-through text-gray-500" : "text-black"
            }`}
          >
            <span
              onClick={() => toggleTask(t._id,t.completed,t.text)}
              className="cursor-pointer flex-1"
            >
              {t.text}
            </span>
            <span className="mr-2.5">
              <button
                onClick={() => UpdateTask(t._id,t.completed,t.text)}
                className="text-green-500 hover:text-green-700 font-medium border rounded p-1"
              >
                Update
              </button>
            </span>
            <span>
              <button
                onClick={() => deleteTask(t._id)}
                className="text-red-500 hover:text-red-700 font-medium border rounded p-1"
              >
                Del
              </button>
            </span>
          </li>
        ))}
      </ul>
      <LogoutButton/>
    </div>
  );
};

export default TaskList;
