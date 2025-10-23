import { useState } from "react";
import UploadForm from "./components/UploadForm";
import Feed from "./components/Feed";

export default function App() {
  const [refresh, setRefresh] = useState(0);

  return (
    <div className="min-h-screen bg-[#121212] text-white p-8">
      <h1 className="text-4xl font-bold text-center mb-8">🌍 Community Image Feed</h1>
      <UploadForm onUpload={() => setRefresh((r) => r + 1)} />
      <Feed refreshKey={refresh} />
    </div>
  );
}
