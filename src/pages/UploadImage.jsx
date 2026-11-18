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
    <div className="container">
      <h1 className="header">Share</h1>
      <p className="subtitle">Share your workout with the community!</p>

      <form onSubmit={handleUpload}>
        <div className="inputs">
          <div>
            <label htmlFor="image-upload" className="field-label">Choose an image</label>
            <input
              id="image-upload"
              className="file-input"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileChange}
            />
          </div>

          {preview && (
            <img src={preview} alt="Upload preview" className="preview" />
          )}

          <div className="input">
            <input
              type="text"
              placeholder="Title"
              aria-label="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
            />
          </div>

          <div className="input textarea">
            <textarea
              placeholder="Enter a short description"
              aria-label="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={1000}
            />
          </div>
        </div>

        <button
          type="submit"
          className="button wide"
          disabled={!selectedFile || uploading}
        >
          {uploading ? "Uploading..." : "Upload Image"}
        </button>
      </form>

      {message && <p className="success-text">{message}</p>}
      {error && <p className="error-text">{error}</p>}
    </div>
  );
}