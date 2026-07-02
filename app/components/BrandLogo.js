export default function BrandLogo({ size = "sidebar" }) {
  const sizeClass =
    size === "login"
      ? "h-28 w-28"
      : size === "large"
      ? "h-20 w-20"
      : "h-16 w-16";

  return (
    <div
      className={`${sizeClass} shrink-0 overflow-hidden rounded-2xl shadow-md`}
    >
      <img
        src="/coffee-logo.png"
        alt="โลโก้ร้านค้า"
        className="h-full w-full object-cover"
      />
    </div>
  );
}