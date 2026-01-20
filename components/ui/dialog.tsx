"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { XIcon } from "lucide-react";

import { cn } from "@/lib/utils";

function Dialog({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />;
}

function DialogPortal({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />;
}

function DialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      className={cn(
        `
          data-[state=closed]:animate-out
          data-[state=open]:animate-in
        `,
        `
          data-[state=closed]:fade-out-0
          data-[state=open]:fade-in-0
        `,
        "fixed inset-0 z-50 bg-background/60 backdrop-blur-xl",
        className,
      )}
      {...props}
    />
  );
}

function DialogContent({
  className,
  children,
  showCloseButton = true,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  showCloseButton?: boolean;
}) {
  return (
    <DialogPortal data-slot="dialog-portal">
      <DialogOverlay />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        className={cn(
          "border-foreground/10 bg-background/95 backdrop-blur-2xl",
          `
            data-[state=closed]:animate-out
            data-[state=open]:animate-in
          `,
          `
            data-[state=closed]:fade-out-0
            data-[state=open]:fade-in-0
          `,
          `
            data-[state=closed]:zoom-out-95
            data-[state=open]:zoom-in-95
          `,
          `
            data-[state=closed]:slide-out-to-top-2
            data-[state=open]:slide-in-from-top-2
          `,
          "fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)]",
          "translate-[-50%] gap-4 rounded-2xl border p-6",
          `
            shadow-2xl shadow-foreground/10 duration-300 outline-none
            sm:max-w-lg
          `,
          className,
        )}
        {...props}
      >
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close
            data-slot="dialog-close"
            className="
              absolute top-4 right-4 flex size-8 items-center justify-center
              rounded-xl border border-foreground/5 bg-foreground/3
              text-muted-foreground/60 transition-all duration-200
              hover:border-foreground/10 hover:bg-foreground/8
              hover:text-foreground
              focus:ring-2 focus:ring-foreground/20 focus:outline-none
              disabled:pointer-events-none
              [&_svg]:pointer-events-none [&_svg]:shrink-0
              [&_svg:not([class*='size-'])]:size-4
            "
          >
            <XIcon />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPortal>
  );
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn(
        `
        flex flex-col gap-2 text-center
        sm:text-left
      `,
        className,
      )}
      {...props}
    />
  );
}

function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn("text-lg leading-none font-semibold", className)}
      {...props}
    />
  );
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  );
}

export { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle };
