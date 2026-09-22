"use client";

export default function ConfirmButton({ action, message, className, children }: {
  action: () => Promise<void>; message: string; className?: string; children: React.ReactNode;
}) {
  return (
    <form action={action} onSubmit={(e) => { if (!confirm(message)) e.preventDefault(); }}>
      <button className={className}>{children}</button>
    </form>
  );
}
