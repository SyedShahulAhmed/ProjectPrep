import { useState } from "react";
import imageCompression from "browser-image-compression";
import API from "../api";

export default function UploadForm({ onUpload }) {
  const [name, setName] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setImageFile(file);
    if (file) {
      setPreview(URL.createObjectURL(file));
    } else {
      setPreview(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !imageFile) {
      alert("Please provide your name and select an image.");
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("name", name);

      // 🧩 Compress the image before upload
      const options = {
        maxSizeMB: 0.4, // ~400KB target
        maxWidthOrHeight: 1280, // Resize large images
        useWebWorker: true,
      };

      const compressedFile = await imageCompression(imageFile, options);
      formData.append("image", compressedFile);

      // Upload to backend
      const { data } = await API.post("/posts/upload", formData);
      onUpload(data);

      // Reset form
      setName("");
      setImageFile(null);
      setPreview(null);
    } catch (error) {
      console.error("Upload error:", error);
      alert("Upload failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-[#18181b] text-white rounded-2xl p-6 w-full max-w-md mx-auto shadow-xl"
    >
      <h2 className="text-xl font-bold mb-4 text-center">
        📸 Add to Community Feed
      </h2>

      <input
        type="text"
        placeholder="Your Name"
        className="w-full mb-4 p-2 rounded bg-[#27272a] focus:outline-none focus:ring-2 focus:ring-indigo-600"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
      />

      <div className="border-2 border-dashed border-gray-600 rounded-xl p-4 text-center hover:border-indigo-500 transition mb-4">
        <input
          type="file"
          accept="image/*"
          className="hidden"
          id="fileInput"
          onChange={handleFileChange}
        />
        <label
          htmlFor="fileInput"
          className="cursor-pointer text-indigo-400 hover:underline"
        >
          {imageFile ? "Change Image" : "Click to Upload from Desktop"}
        </label>

        {preview && (
          <div className="mt-4">
            <img
              src={preview}
              alt="preview"
              className="w-full h-48 object-cover rounded-lg shadow-md"
            />
          </div>
        )}
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-indigo-600 hover:bg-indigo-700 py-2 rounded-lg font-semibold disabled:opacity-50"
      >
        {loading ? "Uploading..." : "Upload"}
      </button>

      {loading && (
        <p className="text-center text-sm text-gray-400 mt-2">
          Compressing & Uploading... Please wait ⏳
        </p>
      )}
    </form>
  );
}
