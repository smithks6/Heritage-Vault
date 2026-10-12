"use client";

import { useState } from "react";
import { UserPlus } from "lucide-react";
import AddPersonModal from "./AddPersonModal";
import type { FamilyGraph } from "@/types";

export default function AddPersonButton({ graph }: { graph: FamilyGraph }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-primary text-sm">
        <UserPlus className="w-4 h-4" />
        Add person
      </button>
      {open && <AddPersonModal graph={graph} onClose={() => setOpen(false)} />}
    </>
  );
}
