import React from "react";

const FALLBACK = "https://placehold.co/400x400/121212/535353?text=No+Image";

function TrackImage(props) {
  return (
    <img
      {...props}
      onError={(e) => {
        e.target.onerror = null;
        e.target.src = FALLBACK;
      }}
    />
  );
}

export default TrackImage;
