import { useCallback, useEffect, useRef, useState } from "react";
import { API_URL } from "../config";

const PAGE_SIZE = 12;

export default function GalleryPage() {
  const [images, setImages] = useState([]);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedImage, setSelectedImage] = useState(null);

  const loadingRef = useRef(false);  
  const sentinelRef = useRef(null);   

  const loadMore = useCallback(async () => {
    if (loadingRef.current || !hasMore) return;

    loadingRef.current = true;
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `${API_URL}/get-images?offset=${offset}&limit=${PAGE_SIZE}`
      );

      if (!response.ok) throw new Error("Failed to fetch images.");

      const data = await response.json();

      setImages((prev) => {
        const seen = new Set(prev.map((img) => img.image_key));
        return [...prev, ...data.images.filter((img) => !seen.has(img.image_key))];
      });

      setOffset(data.next_offset);
      setHasMore(data.has_more);
    } catch (err) {
      console.error("Error fetching images:", err);
      setError("Unable to load images.");
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [offset, hasMore]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore();
      },
      { rootMargin: "300px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [loadMore]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") setSelectedImage(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div style={{ padding: 20 }}>
      <h1>Community Gallery</h1>

      {images.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
            gap: 20,
          }}
        >
          {images.map((image) => (
            <div
              key={image.image_key}
              onClick={() => setSelectedImage(image)}
              style={{ cursor: "pointer" }}
            >
              <img
                src={image.url}
                alt={image.title || "Community upload"}
                loading="lazy"
                style={{
                  width: "100%",
                  height: 180,
                  objectFit: "cover",
                  borderRadius: 8,
                  background: "#ddd",
                }}
              />
              <strong>{image.title || "Untitled"}</strong>
              <p style={{ fontSize: 12, marginTop: 4 }}>
                {image.description || "No description provided."}
              </p>
            </div>
          ))}
        </div>
      )}

      <div ref={sentinelRef} style={{ height: 1 }} />

      {loading && <p>Loading images...</p>}

      {error && (
        <p style={{ color: "red" }}>
          {error} <button onClick={loadMore}>Try again</button>
        </p>
      )}

      {!loading && !error && images.length === 0 && !hasMore && (
        <p>No images have been shared yet.</p>
      )}

      {selectedImage && (
        <div
          onClick={() => setSelectedImage(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.85)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: 20,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "relative",
              background: "#fff",
              borderRadius: 12,
              maxWidth: 900,
              width: "100%",
              maxHeight: "90vh",
              overflow: "auto",
              padding: 20,
            }}
          >
            <button
              onClick={() => setSelectedImage(null)}
              aria-label="Close"
              style={{ position: "absolute", top: 10, right: 10 }}
            >
              ✕
            </button>

            <img
              src={selectedImage.url}
              alt={selectedImage.title || "Selected upload"}
              style={{ width: "100%", maxHeight: "65vh", objectFit: "contain" }}
            />
            <h2>{selectedImage.title}</h2>
            <p>{selectedImage.description}</p>
          </div>
        </div>
      )}
    </div>
  );
}