import "./globals.css";
import AuthGuard from "./components/AuthGuard";

export const metadata = {
  title: "ระบบบริหารจัดการร้านค้าปลีกอุปกรณ์เครื่องดื่ม",
  description: "ระบบจัดการสินค้าและตัดสต็อก",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="th" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <AuthGuard>{children}</AuthGuard>
      </body>
    </html>
  );
}
