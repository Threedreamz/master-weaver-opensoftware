import Link from "next/link";
export default function NotFound() {
  return (
    <div style={{ padding: 32, fontFamily: "system-ui" }}>
      <h2>Not found</h2>
      <p>The page you're looking for doesn't exist.</p>
      <Link href="/">Go home</Link>
    </div>
  );
}
