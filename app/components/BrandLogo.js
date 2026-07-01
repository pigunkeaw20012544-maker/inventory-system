export default function BrandLogo({ size = "sidebar" }) {
  const sizeClass =
    size === "login"
      ? "h-20 w-20"
      : size === "large"
      ? "h-16 w-16"
      : "h-12 w-12";

  return (
    <div
      className={`${sizeClass} shrink-0 overflow-hidden rounded-2xl bg-white p-1 shadow-sm ring-1 ring-white/30`}
    >
      <img
        src="/coffee-logo.png"
        alt="โลโก้ร้านค้าปลีกอุปกรณ์เครื่องดื่ม"
        className="https://chatgpt.com/c/6a3945b8-cacc-83ec-85f6-82bfb9a6f6b4
https://chatgpt.com/backend-api/estuary/content?id=file_00000000b5b871faae52acc7aec512e2&ts=495257&p=fs&cid=1&sig=2ed190e6dcad7141f10e27c334ce5c6e7b2384445769c0762465fd5f905923dd&v=0"
      />
    </div>
  );
}