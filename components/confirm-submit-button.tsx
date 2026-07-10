"use client";

import type { ReactNode } from "react";

type ConfirmSubmitButtonProps = {
  children: ReactNode;
  className?: string;
  disabled?: boolean;
  message: string;
  submitAction?: (formData: FormData) => void | Promise<void>;
  title?: string;
};

export function ConfirmSubmitButton({
  children,
  className,
  disabled,
  message,
  submitAction,
  title
}: ConfirmSubmitButtonProps) {
  return (
    <button
      className={className}
      disabled={disabled}
      formAction={submitAction}
      title={title}
      type="submit"
      onClick={(event) => {
        if (!window.confirm(message)) {
          event.preventDefault();
        }
      }}
    >
      {children}
    </button>
  );
}
