"use client";

import { useFormStatus } from "react-dom";

/** Submit button that disables itself and shows `pendingText` while its form's action runs. */
export default function SubmitButton({ pendingText, children, disabled, ...props }:
  React.ButtonHTMLAttributes<HTMLButtonElement> & { pendingText?: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button {...props} disabled={pending || disabled} aria-busy={pending || undefined}>
      {pending && pendingText ? pendingText : children}
    </button>
  );
}
