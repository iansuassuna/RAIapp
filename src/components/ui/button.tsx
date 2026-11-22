import { cva, type VariantProps } from "class-variance-authority";
import { LoaderCircle } from "lucide-react";
import { type ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/cn";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-field font-display font-semibold tracking-tight transition-all duration-200 disabled:pointer-events-none disabled:opacity-60 active:scale-[0.98] cursor-pointer",
  {
    variants: {
      variant: {
        primary: "bg-brand-900 text-white shadow-raised hover:bg-brand-800 hover:shadow-glow",
        accent: "bg-accent-500 text-brand-950 hover:bg-accent-400 shadow-glow",
        secondary: "bg-surface text-brand-900 ring-1 ring-line hover:bg-surface-muted",
        ghost: "text-brand-700 hover:bg-brand-50",
        danger: "bg-danger-50 text-danger-700 ring-1 ring-danger-500/30 hover:bg-danger-500 hover:text-white",
        link: "h-auto px-0 text-brand-600 underline-offset-4 hover:text-accent-600 hover:underline",
      },
      size: {
        sm: "h-9 px-3 text-sm",
        md: "h-11 px-5 text-sm",
        lg: "h-13 px-6 text-base",
      },
      block: { true: "w-full" },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & { loading?: boolean };

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, block, loading, disabled, children, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size, block }), className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && <LoaderCircle className="size-4 animate-spin" aria-hidden />}
      {children}
    </button>
  ),
);
Button.displayName = "Button";
