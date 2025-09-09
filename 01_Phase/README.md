# 📝 Task Manager (MERN Stack)

A simple **Task Manager App** built with the **MERN stack** (MongoDB, Express, React, Node.js) as part of **Phase 1: MERN Basics** learning project.
Users can **register, login, and manage tasks (CRUD)** with JWT authentication.

---

## 🚀 Features

* 🔑 **User Authentication** (JWT-based)
* ➕ Add tasks
* ✏️ Edit tasks
* ✅ Mark tasks as complete/incomplete
* ❌ Delete tasks
* 👤 Tasks are **private to each logged-in user**
* 🎨 Styled with Tailwind CSS
* 🌍 Backend deployed on Render, Frontend on Vercel

---

## 📂 Project Structure

```
ProjectPrep/
 └── 01_Phase/
      ├── server/        # Backend (Node.js, Express, MongoDB, JWT)
      └── Task-Manager-App/  # Frontend (React, Vite, Tailwind)
```

---

## ⚙️ Tech Stack

* **Frontend**: React (Vite), Axios, Tailwind CSS, React Router
* **Backend**: Node.js, Express, Mongoose, JWT, Bcrypt
* **Database**: MongoDB Atlas
* **Deployment**: Render (backend), Vercel (frontend)

---

## 🛠️ Setup Instructions (Local Development)

### 1. Clone the repo

```bash
git clone https://github.com/SyedShahulAhmed/ProjectPrep.git
cd ProjectPrep/01_Phase
```

### 2. Backend Setup

```bash
cd server
npm install
```

* Create a `.env` file inside `server/`:

  ```
  MONGO_URI=your_mongodb_atlas_connection_string
  JWT_SECRET=your_secret_key
  PORT=5000
  ```
* Run the server:

  ```bash
  npm run dev
  ```
* API runs on: `http://localhost:5000`

### 3. Frontend Setup

```bash
cd ../Task-Manager-App
npm install
```

* Create a `.env` file inside `Task-Manager-App/`:

  ```
  VITE_API_BASE = http://localhost:5000
  ```
* Run the frontend:

  ```bash
  npm run dev
  ```

---

## 🌐 Deployment

* **Backend (Render)** → `https://taskmanager-backend-r8b9.onrender.com/`
* **Frontend (Vercel)** → `https://task-manager-gamma-orcin.vercel.app/`

Environment variables were added on the hosting platforms:

* Backend (Render):

  * `MONGO_URI`
  * `JWT_SECRET`
* Frontend (Vercel):

  * `VITE_API_BASE` → set to backend URL

---

## 📌 Phase 1 Progress (Learning Stages)

* ✅ **Stage 1**: React basics (components, hooks, state) + TaskList UI
* ✅ **Stage 2**: Express + MongoDB backend (CRUD API)
* ✅ **Stage 3**: Connected frontend ↔ backend (Axios, CRUD)
* ✅ **Stage 4**: JWT Authentication + Protected Routes
* 🚀 **Stage 5**: Deployment 

---

## 🤝 Contributing

This is a learning project. Suggestions and improvements are welcome!


