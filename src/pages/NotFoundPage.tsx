import { Link } from "react-router";

export default function NotFoundPage() {
  return (
    <div className="py-16 text-center">
      <h1 className="text-2xl font-bold">Page not found</h1>
      <Link to="/" className="btn btn-secondary mt-4">
        Back to browse
      </Link>
    </div>
  );
}
