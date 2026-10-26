import * as Dialog from "@radix-ui/react-dialog";
import { useEffect, useState, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/** Shared modal frame matching the dashboard's glass style. */
export function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="data-[state=open]:animate-in data-[state=open]:fade-in-0 fixed inset-0 z-[60] bg-[#05060f]/70 backdrop-blur-[3px]" />
        <Dialog.Content
          className="data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 fixed left-1/2 top-1/2 z-[61] w-[calc(100%-32px)] max-w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-2xl border p-6 focus:outline-none"
          style={{
            background: "rgba(10,12,26,0.98)",
            borderColor: "rgba(186,215,247,0.12)",
            boxShadow: "var(--ak-shadow-card)",
          }}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="text-[17px] font-medium text-white">{title}</Dialog.Title>
              {description ? (
                <Dialog.Description className="mt-1.5 text-[14px] leading-relaxed text-[var(--ak-fog)]">
                  {description}
                </Dialog.Description>
              ) : (
                <Dialog.Description className="sr-only">{title}</Dialog.Description>
              )}
            </div>
            <Dialog.Close
              className="-mr-1 -mt-1 flex size-8 items-center justify-center rounded-full text-[var(--ak-fog)] transition-colors hover:bg-white/5 hover:text-white"
              aria-label="Close"
            >
              <X className="size-4" />
            </Dialog.Close>
          </div>
          <div className="mt-5">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function DialogButton({
  tone = "neutral",
  className,
  ...props
}: React.ComponentProps<"button"> & { tone?: "neutral" | "primary" | "danger" }) {
  return (
    <button
      className={cn(
        "inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-[14px] font-medium transition-all disabled:pointer-events-none disabled:opacity-50",
        tone === "neutral" && "text-[var(--ak-moon)] hover:bg-white/5 hover:text-white",
        tone === "primary" && "bg-[#663af3] text-white hover:bg-[#7450f5]",
        tone === "danger" && "bg-[#dc4a4a] text-white hover:bg-[#e25a5a]",
        className,
      )}
      {...props}
    />
  );
}

/** Ask for a single name (new folder, rename). */
export function PromptDialog({
  open,
  onOpenChange,
  title,
  label,
  initialValue = "",
  submitLabel,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  label: string;
  initialValue?: string;
  submitLabel: string;
  onSubmit: (value: string) => Promise<void>;
}) {
  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setValue(initialValue);
      setError(null);
      setBusy(false);
    }
  }, [open, initialValue]);

  const trimmed = value.trim();
  const localError = /[\\/]/.test(trimmed) ? "Names can't contain / or \\" : null;

  return (
    <Modal open={open} onOpenChange={onOpenChange} title={title}>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (!trimmed || localError) return;
          setBusy(true);
          setError(null);
          try {
            await onSubmit(trimmed);
            onOpenChange(false);
          } catch (err) {
            setError(err instanceof Error ? err.message : "Something went wrong");
          } finally {
            setBusy(false);
          }
        }}
      >
        <label className="block">
          <span className="text-[13px] text-[var(--ak-fog)]">{label}</span>
          <input
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onFocus={(e) => e.currentTarget.select()}
            maxLength={255}
            className="ak-input mt-2 h-11 w-full px-3 text-[15px]"
          />
        </label>
        {(localError || error) && (
          <p className="mt-2 text-[13px] text-[#fca5a5]" role="alert">
            {localError || error}
          </p>
        )}
        <div className="mt-6 flex justify-end gap-2">
          <DialogButton type="button" onClick={() => onOpenChange(false)}>
            Cancel
          </DialogButton>
          <DialogButton
            tone="primary"
            type="submit"
            disabled={!trimmed || Boolean(localError) || busy}
          >
            {busy ? "Saving…" : submitLabel}
          </DialogButton>
        </div>
      </form>
    </Modal>
  );
}

/** Confirm a destructive action. */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  onConfirm: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <Modal open={open} onOpenChange={onOpenChange} title={title} description={description}>
      <div className="flex justify-end gap-2">
        <DialogButton onClick={() => onOpenChange(false)}>Cancel</DialogButton>
        <DialogButton
          tone="danger"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await onConfirm();
              onOpenChange(false);
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? "Deleting…" : confirmLabel}
        </DialogButton>
      </div>
    </Modal>
  );
}
