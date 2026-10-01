"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, Loader2 } from "lucide-react";

export default function SearchInput({ defaultValue }: { defaultValue?: string }) {
  const [value, setValue] = useState(defaultValue ?? "");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const searchParams = useSearchParams();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = value.trim();
    if (!q) return;
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("q", q);
      router.push(`/search?${params.toString()}`);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="relative">
      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-bark-400 pointer-events-none" />
      <input
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search transcripts, names, topics…"
        className="input pl-10 pr-10"
        autoFocus
      />
      {isPending && (
        <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-bark-400 animate-spin" />
      )}
    </form>
  );
}
