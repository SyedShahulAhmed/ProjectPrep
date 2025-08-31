import React, { useState } from "react";

const TaskList = () => {
  const [tasks, setTasks] = useState([
    { text: "Code", completed: true },
    { text: "Read", completed: false },
    { text: "Sleep", completed: false },
  ]);
  const [task, setTask] = useState("");

  const addTask = () => {
    if (!task.trim()) return;
    setTasks((e) => [...e, { text: task, completed: false }]);
    setTask("");
  };
  const toggleTask = (id) => {
    setTasks((t) =>
      t.map((e, idx) => (idx == id ? { ...e, completed: !e.completed } : e))
    );
  };
  const deleteTask = (id) => {
    setTasks((p) => p.filter((_, idx) => idx != id));
  };
  const UpdateTask = (id) =>{
    const newTask = prompt("Enter Update Task :- ",tasks[id].text);
    if(!newTask || !newTask.trim()) return;
    setTasks((p) => 
    p.map((t,idx) => idx === id ? {...t,text:newTask} : t)
    )
  }
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
        {tasks.map((t, id) => (
          <li
            key={id}
            className={`bg-gray-100 border border-gray-300 rounded-md px-3 py-2 shadow-sm flex justify-between items-center ${
              t.completed ? "line-through text-gray-500" : "text-black"
            }`}
          >
            <span
              onClick={() => toggleTask(id)}
              className="cursor-pointer flex-1"
            >
              {t.text}
            </span>
            <span className="mr-2.5">
              <button
                onClick={() => UpdateTask(id)}
                className="text-green-500 hover:text-green-700 font-medium border rounded p-1"
              >
                Update
              </button>
            </span>
            <span>
              <button
                onClick={() => deleteTask(id)}
                className="text-red-500 hover:text-red-700 font-medium border rounded p-1"
              >
                Del
              </button>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default TaskList;
