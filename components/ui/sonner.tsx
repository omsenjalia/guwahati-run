"use client"

import { Toaster as Sonner, type ToasterProps } from "sonner"

// Follows the phone's light/dark setting (no theme provider needed).
const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="system"
      position="top-center"
      className="toaster group"
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "calc(var(--radius) * 1.4)",
        } as React.CSSProperties
      }
      toastOptions={{ classNames: { toast: "cn-toast" } }}
      {...props}
    />
  )
}

export { Toaster }
