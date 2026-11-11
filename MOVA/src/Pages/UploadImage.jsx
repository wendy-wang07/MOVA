import { useState } from "react";
import { API_URL } from "../config";

export default function UploadImage() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [preview, setPreview] = useState(null);

  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleFileChange = (e) => {
    const file = e.target.files[0];

    setMessage("");
    setError("");
    setSelectedFile(null);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);

    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

    if (!allowedTypes.includes(file.type)) {
      setError("Please select a JPG, PNG, or WEBP image.");
      e.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be smaller than 5 MB.");
      e.target.value = "";
      return;
    }

    setSelectedFile(file);
    setPreview(URL.createObjectURL(file));
  };

  const handleUpload = async (e) => {
    e.preventDefault();

    if (!selectedFile) {
      setError("Please select an image first.");
      return;
    }

    setUploading(true);
    setMessage("");
    setError("");

    try {
      const formData = new FormData();
      formData.append("image", selectedFile);
      formData.append("title", title);
      formData.append("description", description);

      const response = await fetch(`${API_URL}/upload-image`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Image upload failed.");
      }

      setMessage("Image uploaded successfully!");

      // Clear the form
      setSelectedFile(null);
      setTitle("");
      setDescription("");
      if (preview) URL.revokeObjectURL(preview);
      setPreview(null);

      const fileInput = document.getElementById("image-upload");
      if (fileInput) fileInput.value = "";
    } catch (err) {
      console.error("Upload error:", err);
      setError(err.message || "Something went wrong uploading your image.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>Share</h1>
      <p>Share your workout with the community!</p>

      <form onSubmit={handleUpload} style={{ maxWidth: 600 }}>
        <label htmlFor="image-upload"><strong>Choose an image</strong></label>
        <br />
        <input
          id="image-upload"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileChange}
        />

        {preview && (
          <div style={{ margin: "15px 0" }}>
            <img
              src={preview}
              alt="Upload preview"
              style={{ maxWidth: "100%", maxHeight: 250, objectFit: "contain" }}
            />
          </div>
        )}

        <div style={{ margin: "15px 0" }}>
          <label htmlFor="title"><strong>Title</strong></label>
          <br />
          <input
            id="title"
            type="text"
            placeholder="Give it a title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={100}
            style={{ width: "100%" }}
          />
        </div>

        <div style={{ margin: "15px 0" }}>
          <label htmlFor="description"><strong>Description</strong></label>
          <br />
          <textarea
            id="description"
            placeholder="Enter a short description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={1000}
            style={{ width: "100%", minHeight: 90 }}
          />
        </div>

        <button type="submit" disabled={!selectedFile || uploading}>
          {uploading ? "Uploading..." : "Upload Image"}
        </button>
      </form>

      {message && <p style={{ color: "green" }}>{message}</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}
    </div>
  );
}