import Link from "next/link";
import { BookOpen } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="card max-w-sm w-full text-center space-y-4 py-10">
        <BookOpen className="w-10 h-10 text-bark-300 mx-auto" />
        <h1 className="font-serif text-2xl text-bark-700">Page not found</h1>
        <p className="text-sm text-bark-500">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Link href="/tree" className="btn-primary inline-flex mx-auto">
          Go to family tree
        </Link>
      </div>
    </div>
  );
}
