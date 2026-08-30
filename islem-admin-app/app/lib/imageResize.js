"use client";

// Resizes an image File down to maxWidth (preserving aspect ratio) and
// returns a JPEG Blob. Used to generate a lightweight thumbnail so the
// public gallery never has to load full-resolution originals just to
// render a grid or an early scroll frame.
export function makeThumbnail(file, maxWidth = 480, quality = 0.8) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, maxWidth / img.width);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(url);
          if (blob) resolve(blob);
          else reject(new Error("Thumbnail generation failed"));
        },
        "image/jpeg",
        quality
      );
    };
    img.onerror = reject;
    img.src = url;
  });
}
