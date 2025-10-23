import { useEffect, useState } from "react";
import API from "../api";

export default function Feed({ refreshKey }) {
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    API.get("/posts").then((res) => setPosts(res.data));
  }, [refreshKey]);

  return (
    <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mt-10">
      {posts.map((post) => (
        <div
          key={post._id}
          className="bg-[#18181b] text-white rounded-xl overflow-hidden shadow-lg hover:scale-105 transition"
        >
          <img src={post.imageUrl} alt={post.name} className="w-full h-48 object-cover" />
          <div className="p-3">
            <p className="font-semibold">{post.name}</p>
            <p className="text-sm text-gray-400">
              {new Date(post.createdAt).toLocaleString()}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
