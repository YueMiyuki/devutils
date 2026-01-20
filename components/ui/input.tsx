import * as React from "react";

import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        `
          selection:bg-foreground/10 selection:text-foreground
          file:text-foreground
          placeholder:text-muted-foreground/50
        `,
        `
          h-10 w-full min-w-0 rounded-xl border border-foreground/10
          bg-foreground/2 px-4 py-2 text-base
        `,
        "transition-all duration-200 outline-none",
        `
          file:inline-flex file:h-7 file:border-0 file:bg-transparent
          file:text-sm file:font-medium
        `,
        `
          disabled:pointer-events-none disabled:cursor-not-allowed
          disabled:opacity-50
          md:text-sm
        `,
        "hover:border-foreground/15 hover:bg-foreground/3",
        `
          focus-visible:border-foreground/20 focus-visible:bg-foreground/4
          focus-visible:ring-2 focus-visible:ring-foreground/10
        `,
        `
          aria-invalid:border-destructive aria-invalid:ring-destructive/20
          dark:aria-invalid:ring-destructive/40
        `,
        className,
      )}
      {...props}
    />
  );
}

export { Input };
