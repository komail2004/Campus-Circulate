import { Link } from "react-router";
import { useTitle } from "../lib/useTitle.ts";

export default function NotFoundPage() {
  useTitle("Page not found");
  return (
    <div className="py-16 text-center">
      <h1 className="heading text-3xl">Page not found</h1>
      <Link to="/" className="btn btn-outline mt-6">
        Back to listings
      </Link>
    </div>
  );
}
