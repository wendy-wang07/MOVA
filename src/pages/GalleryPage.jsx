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
    <div className="container gallery">
      <h1 className="header">Community Gallery</h1>
      <p className="subtitle">Scroll to see more.</p>

      {images.length > 0 && (
        <div className="gallery-grid">
          {images.map((image) => (
            <div
              key={image.image_key}
              className="gallery-item"
              onClick={() => setSelectedImage(image)}
            >
              <img
                src={image.url}
                alt={image.title || "Community upload"}
                loading="lazy"
                className="gallery-thumb"
              />
              <div className="gallery-info">
                <h3 className="gallery-title">{image.title || "Untitled"}</h3>
                <p className="gallery-desc">
                  {image.description || "No description provided."}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div ref={sentinelRef} style={{ height: 1 }} />

      {loading && <p className="status-text">Loading images...</p>}

      {error && (
        <p className="error-text">
          {error}{" "}
          <button className="button wide" onClick={loadMore}>Try again</button>
        </p>
      )}

      {!loading && !error && images.length === 0 && !hasMore && (
        <p className="status-text">No images have been shared yet.</p>
      )}

      {selectedImage && (
        <div className="modal-overlay" onClick={() => setSelectedImage(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <button
              className="modal-close"
              onClick={() => setSelectedImage(null)}
              aria-label="Close"
            >
              ✕
            </button>

            <img
              src={selectedImage.url}
              alt={selectedImage.title || "Selected upload"}
              className="modal-img"
            />
            <h2 className="header">{selectedImage.title}</h2>
            <p className="subtitle">{selectedImage.description}</p>
          </div>
        </div>
      )}
    </div>
  );
}