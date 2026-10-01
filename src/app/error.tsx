"use client";

import { useEffect } from "react";
import { AlertCircle } from "lucide-react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="card max-w-sm w-full text-center space-y-4 py-10">
        <AlertCircle className="w-10 h-10 text-red-400 mx-auto" />
        <h2 className="font-serif text-xl text-bark-700">Something went wrong</h2>
        <p className="text-sm text-bark-500">{error.message}</p>
        <button onClick={reset} className="btn-primary inline-flex mx-auto">
          Try again
        </button>
      </div>
    </div>
  );
}
