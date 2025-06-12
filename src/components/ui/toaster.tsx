"use client";

import { Toaster } from "react-hot-toast";

export default function ToastProvider() {
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        className:
          "bg-white text-gray-800 shadow-lg border border-gray-200 rounded-md",
      }}
    />
  );
}
