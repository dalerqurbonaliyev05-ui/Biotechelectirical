"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { uz } from "../i18n/uz";
import Modal from "./Modal";

// Three.js faqat oyna ochilganda yuklanadi
const Transformer3D = dynamic(() => import("./Transformer3D"), { ssr: false, loading: () => <p className="p-6 text-center text-muted">{uz.mini.loading}</p> });

export default function Transformer3DButton({ className = "btn-ghost" }: { className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)}>
        🧊 {uz.view3d.open}
      </button>
      {open && (
        <Modal title={uz.view3d.title} onClose={() => setOpen(false)} wide>
          <Transformer3D />
        </Modal>
      )}
    </>
  );
}
