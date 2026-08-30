import "./globals.css";

export const metadata = {
  title: "Islem Zrelli — Photographer, Filmmaker, Environmental Activist",
  description: "Islem Zrelli — visual stories from Tunisia's coasts, deserts and disappearing landscapes.",
};

export const viewport = {
  themeColor: "#050505",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
