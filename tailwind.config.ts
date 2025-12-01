import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      /* Mobile-first responsive padding */
      padding: {
        DEFAULT: "1rem", /* 16px on mobile */
        sm: "1.5rem", /* 24px on small tablets */
        md: "2rem", /* 32px on tablets */
        lg: "2.5rem", /* 40px on desktop */
        xl: "3rem", /* 48px on large desktop */
        "2xl": "4rem", /* 64px on extra large */
      },
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      /* Custom fluid spacing scale */
      spacing: {
        "fluid-xs": "clamp(0.25rem, 0.5vw, 0.5rem)",
        "fluid-sm": "clamp(0.5rem, 1vw, 1rem)",
        "fluid-md": "clamp(1rem, 2vw, 2rem)",
        "fluid-lg": "clamp(1.5rem, 3vw, 3rem)",
        "fluid-xl": "clamp(2rem, 4vw, 4rem)",
        "fluid-2xl": "clamp(3rem, 6vw, 6rem)",
      },
      /* Mobile-first font sizes using rem */
      fontSize: {
        "xs": ["0.75rem", { lineHeight: "1.5" }], /* 12px */
        "sm": ["0.875rem", { lineHeight: "1.5" }], /* 14px */
        "base": ["1rem", { lineHeight: "1.6" }], /* 16px - base mobile size */
        "lg": ["1.125rem", { lineHeight: "1.6" }], /* 18px */
        "xl": ["1.25rem", { lineHeight: "1.5" }], /* 20px */
        "2xl": ["1.5rem", { lineHeight: "1.4" }], /* 24px */
        "3xl": ["1.875rem", { lineHeight: "1.3" }], /* 30px */
        "4xl": ["2.25rem", { lineHeight: "1.2" }], /* 36px */
        "5xl": ["3rem", { lineHeight: "1.2" }], /* 48px */
        "6xl": ["3.75rem", { lineHeight: "1.1" }], /* 60px */
        /* Fluid text sizes */
        "fluid-sm": ["clamp(0.875rem, 1.5vw, 1rem)", { lineHeight: "1.6" }],
        "fluid-base": ["clamp(1rem, 2vw, 1.125rem)", { lineHeight: "1.6" }],
        "fluid-lg": ["clamp(1.125rem, 2.5vw, 1.5rem)", { lineHeight: "1.5" }],
        "fluid-xl": ["clamp(1.25rem, 3vw, 2rem)", { lineHeight: "1.4" }],
        "fluid-2xl": ["clamp(1.5rem, 4vw, 2.5rem)", { lineHeight: "1.3" }],
        "fluid-3xl": ["clamp(1.75rem, 5vw, 3.5rem)", { lineHeight: "1.2" }],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
