"use client";

import SubmitButton from "@/components/SubmitButton";

export default function ConfirmButton({ action, message, className, children }: {
  action: () => Promise<void>; message: string; className?: string; children: React.ReactNode;
}) {
  return (
    <form action={action} onSubmit={(e) => { if (!confirm(message)) e.preventDefault(); }}>
      <SubmitButton className={className}>{children}</SubmitButton>
    </form>
  );
}
