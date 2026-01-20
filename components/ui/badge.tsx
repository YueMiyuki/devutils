import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  `
    inline-flex w-fit shrink-0 items-center justify-center gap-1.5
    overflow-hidden rounded-lg border px-2.5 py-1 text-xs font-medium
    whitespace-nowrap transition-all duration-200
    [&>svg]:pointer-events-none [&>svg]:size-3
  `,
  {
    variants: {
      variant: {
        default: `
            border-foreground/10 bg-foreground/5 text-foreground/80
            [a&]:hover:bg-foreground/10
          `,
        secondary: `
            border-foreground/5 bg-foreground/2 text-foreground/60
            [a&]:hover:bg-foreground/5
          `,
        destructive: `
            border-destructive/20 bg-destructive/10 text-destructive
            [a&]:hover:bg-destructive/20
          `,
        outline: `
            border-foreground/10 bg-transparent text-foreground/70
            [a&]:hover:bg-foreground/5
          `,
        success: `
            border-success/20 bg-success/10 text-success
            [a&]:hover:bg-success/20
          `,
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span";

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Badge };
