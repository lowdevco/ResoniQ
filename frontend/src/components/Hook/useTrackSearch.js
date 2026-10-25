import { useEffect, useState } from "react";
import { apiFetch } from "../../api";

const DEFAULT_QUERIES = [
  "Top Global Hits",
  "Viral Pop Songs 2026",
  "Lo-Fi Beats to Relax",
  "Trending Hip Hop",
  "EDM Party Anthems",
  "Acoustic Covers",
  "Chill Vibes",
  "Best RnB Hits",
];

function useTrackSearch(query) {
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const trimmed = query?.trim();
    const q = trimmed || DEFAULT_QUERIES[Math.floor(Math.random() * DEFAULT_QUERIES.length)];
    let cancelled = false;

    setLoading(true);
    setError("");
    apiFetch(`/music/search?q=${encodeURIComponent(q)}`)
      .then(async (response) => {
        const data = await response.json();
        if (cancelled) return;
        if (!response.ok) {
          setError(
            response.status === 429
              ? "Too many searches. Please wait a moment."
              : data.error || "Search failed."
          );
          return;
        }
        setTracks(data);
      })
      .catch(() => {
        if (!cancelled) setError("Could not reach the server.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [query]);

  return { tracks, loading, error };
}

export default useTrackSearch;
