
import React, { useEffect, useState, useCallback } from "react";

export default function GalleryPage() {
  const [images, setImages] = useState([]);
  const [selectedImage, setSelectedImage] = useState(null);

  // Upload form state
  const [selectedFile, setSelectedFile] = useState(null);
  const [description, setDescription] = useState("");
  const [preview, setPreview] = useState(null);

  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");


  // Fetch images from Flask / AWS S3
  const fetchImages = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);

    try {
      const response = await fetch("http://127.0.0.1:5000/get-images");

      if (!response.ok) {
        throw new Error("Failed to fetch images.");
      }

      const data = await response.json();
      setImages(data);
    } catch (err) {
      console.error("Error fetching images:", err);
      setError("Unable to load gallery images.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchImages();
  }, [fetchImages]);

  // Select an image and generate a preview
  const handleFileChange = (e) => {
    const file = e.target.files[0];

    setMessage("");
    setError("");
    setSelectedFile(null);
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

  // Upload image to Flask, which saves it to AWS S3
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
      formData.append("description", description);

      const response = await fetch(
        "http://127.0.0.1:5000/upload-image",
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Image upload failed.");
      }

      setMessage("Image uploaded successfully!");

      // Clear the upload form
      setSelectedFile(null);
      setDescription("");
      setPreview(null);

      const fileInput = document.getElementById("image-upload");
      if (fileInput) fileInput.value = "";

      // Refresh gallery so the new image appears
      await fetchImages(false);

    } catch (err) {
      console.error("Upload error:", err);
      setError(err.message || "Something went wrong uploading your image.");
    } finally {
      setUploading(false);
    }
  };

  // Styling
  const cardStyle = {
    border: "1px solid #2f2f2f",
    borderRadius: 12,
    padding: 12,
    background: "#101010",
    color: "#fff",
    cursor: "pointer",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    minWidth: 0,
  };

  const lightCardStyle = {
    border: "1px solid rgba(0,0,0,.15)",
    background: "#fff",
    color: "#111",
    boxShadow: "0 2px 8px rgba(0,0,0,.08)",
  };

  const inputStyle = {
    width: "100%",
    padding: 10,
    borderRadius: 8,
    boxSizing: "border-box",
    marginTop: 6,
    marginBottom: 14,
  };

  const buttonStyle = {
    padding: "10px 18px",
    borderRadius: 8,
    border: "none",
    background: "#3977d5",
    color: "#fff",
    cursor: "pointer",
    fontWeight: "bold",
  };

  const modalOverlay = {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100vw",
    height: "100vh",
    backgroundColor: "rgba(0,0,0,0.85)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
    padding: 20,
    boxSizing: "border-box",
  };

  const modalContent = {
    display: "flex",
    position: "relative",
    borderRadius: 12,
    overflow: "hidden",
    maxWidth: "95%",
    maxHeight: "90%",
    width: "95%",
    height: "90%",
  };

  const thumbnailStyle = {
    width: "100%",
    height: 180,
    objectFit: "cover",
    borderRadius: 8,
    marginBottom: 8,
    background: "#333",
  };

  return (
    <div
      className="page"
      style={{
        padding: 20,
      }}
    >
      <h1>CCCare Online Portal!</h1>

      <p>
        Share your workout with the community!
      </p>

      <div
        style={{
          padding: 20,
          marginTop: 25,
          marginBottom: 35,
          borderRadius: 12,
          border: "1px solid",
          maxWidth: 600,
        }}
      >
        <h2 style={{ marginTop: 0 }}>Upload</h2>

        <form onSubmit={handleUpload}>
          <label>
            <strong>Choose an image</strong>
          </label>

          <input
            id="image-upload"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileChange}
            style={inputStyle}
          />

          {/* Image preview */}
          {preview && (
            <div style={{ marginBottom: 15 }}>
              <img
                src={preview}
                alt="Upload preview"
                style={{
                  maxWidth: "100%",
                  maxHeight: 250,
                  objectFit: "contain",
                  borderRadius: 8,
                }}
              />
            </div>
          )}

          <label>
            <strong>Description</strong>
          </label>

          <textarea
            placeholder="Entire a short description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            style={{
              ...inputStyle,
              minHeight: 90,
              resize: "vertical",
            }}
            maxLength={1000}
          />

          <button
            type="submit"
            disabled={!selectedFile || uploading}
            style={{
              ...buttonStyle,
              opacity: !selectedFile || uploading ? 0.5 : 1,
            }}
          >
            {uploading ? "Uploading..." : "Upload Image"}
          </button>
        </form>

        {message && (
          <p style={{ color: "green", marginBottom: 0 }}>
            {message}
          </p>
        )}

        {error && (
          <p style={{ color: "red", marginBottom: 0 }}>
            {error}
          </p>
        )}
      </div>

      {/* <h2>Community Gallery</h2>

      <button
        onClick={() => fetchImages()}
        style={{
          ...buttonStyle,
          marginBottom: 20,
        }}
      >
        Refresh Gallery
      </button>

      {loading && <p>Loading images...</p>}

      {!loading && images.length === 0 && (
        <p>No images have been uploaded yet.</p>
      )}

      {!loading && images.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: 20,
          }}
        >
          {images.map((image, i) => (
            <div
              key={image.image_key || image.url || i}
              onClick={() => setSelectedImage(image)}
            >
              <img
                src={image.url}
                alt={image.title || "Community creation"}
                style={thumbnailStyle}
                loading="lazy"
              />

              <strong>{image.title || "Untitled"}</strong>

              <p
                style={{
                  fontSize: 12,
                  marginTop: 4,
                  textAlign: "center",
                }}
              >
                {image.description || "No description provided."}
              </p>
            </div>
          ))}
        </div>
      )} */}

      {/* ENLARGED IMAGE MODAL */}
      {selectedImage && (
        <div
          style={modalOverlay}
          onClick={() => setSelectedImage(null)}
        >
          <div
            style={modalContent}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedImage(null)}
              style={{
                position: "absolute",
                top: 10,
                right: 10,
                zIndex: 10000,
                fontSize: 28,
                cursor: "pointer",
                background: "rgba(0,0,0,.6)",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                padding: "2px 10px",
              }}
            >
              
            </button>

            <img
              src={selectedImage.url}
              alt={selectedImage.title || "Selected creation"}
              style={{
                width: "70%",
                height: "100%",
                objectFit: "contain",
                background: "#080808",
              }}
            />

            <div
              style={{
                padding: 20,
                width: "30%",
                overflowY: "auto",
                boxSizing: "border-box",
              }}
            >
              <h2 style={{ marginTop: 0 }}>
                {selectedImage.title}
              </h2>

              <p>
                {selectedImage.description}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}