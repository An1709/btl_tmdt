import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

export default {
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        canvas: "hsl(var(--canvas))",
        surface: {
          DEFAULT: "hsl(var(--surface))",
          subtle: "hsl(var(--surface-subtle))",
          elevated: "hsl(var(--surface-elevated))",
        },
        text: {
          strong: "hsl(var(--text-strong))",
          DEFAULT: "hsl(var(--text))",
          muted: "hsl(var(--text-muted))",
          subtle: "hsl(var(--text-subtle))",
          inverse: "hsl(var(--text-inverse))",
        },
        border: {
          DEFAULT: "hsl(var(--border))",
          strong: "hsl(var(--border-strong))",
          divider: "hsl(var(--divider))",
        },
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        focus: "hsl(var(--focus-ring))",
        overlay: "hsl(var(--overlay) / var(--overlay-opacity))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          glow: "hsl(var(--primary-glow))",
          hover: "hsl(var(--primary-hover))",
          active: "hsl(var(--primary-active))",
          subtle: "hsl(var(--primary-subtle))",
          "subtle-foreground": "hsl(var(--primary-subtle-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
          hover: "hsl(var(--secondary-hover))",
          active: "hsl(var(--secondary-active))",
          subtle: "hsl(var(--secondary-subtle))",
          "subtle-foreground": "hsl(var(--secondary-subtle-foreground))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
          subtle: "hsl(var(--success-subtle))",
          "subtle-foreground": "hsl(var(--success-subtle-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
          subtle: "hsl(var(--warning-subtle))",
          "subtle-foreground": "hsl(var(--warning-subtle-foreground))",
        },
        info: {
          DEFAULT: "hsl(var(--info))",
          foreground: "hsl(var(--info-foreground))",
          subtle: "hsl(var(--info-subtle))",
          "subtle-foreground": "hsl(var(--info-subtle-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
          subtle: "hsl(var(--destructive-subtle))",
          "subtle-foreground": "hsl(var(--destructive-subtle-foreground))",
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
        chat: {
          "bubble-sent": "hsl(var(--chat-bubble-sent))",
          "bubble-sent-fg": "hsl(var(--chat-bubble-sent-foreground))",
          "bubble-received": "hsl(var(--chat-bubble-received))",
          "bubble-received-fg": "hsl(var(--chat-bubble-received-foreground))",
        },
        status: {
          online: "hsl(var(--online))",
          offline: "hsl(var(--offline))",
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
      fontFamily: {
        sans: ["var(--font-sans)"],
        heading: ["var(--font-heading)"],
        nunito: ["var(--font-heading)"],
      },
      fontSize: {
        caption: ["var(--text-caption)", { lineHeight: "var(--leading-caption)" }],
        label: ["var(--text-label)", { lineHeight: "var(--leading-label)" }],
        body: ["var(--text-body)", { lineHeight: "var(--leading-body)" }],
        "body-lg": ["var(--text-body-lg)", { lineHeight: "var(--leading-body)" }],
        "heading-sm": ["var(--text-heading-sm)", { lineHeight: "var(--leading-heading)" }],
        "heading-md": ["var(--text-heading-md)", { lineHeight: "var(--leading-heading)" }],
        "heading-lg": ["var(--text-heading-lg)", { lineHeight: "var(--leading-heading)" }],
        display: ["var(--text-display)", { lineHeight: "1.1", letterSpacing: "-0.02em" }],
      },
      spacing: {
        page: "var(--space-page-inline)",
        section: "var(--space-section)",
      },
      maxWidth: {
        content: "var(--content-max)",
        prose: "var(--prose-max)",
      },
      borderRadius: {
        xs: "var(--radius-xs)",
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
        xl: "var(--radius-xl)",
      },
      boxShadow: {
        "elevation-1": "var(--shadow-1)",
        "elevation-2": "var(--shadow-2)",
        "elevation-3": "var(--shadow-3)",
        overlay: "var(--shadow-overlay)",
      },
      zIndex: {
        sticky: "var(--z-sticky)",
        dropdown: "var(--z-dropdown)",
        overlay: "var(--z-overlay)",
        dialog: "var(--z-dialog)",
        toast: "var(--z-toast)",
        assistant: "var(--z-assistant)",
      },
      transitionDuration: {
        instant: "var(--duration-instant)",
        fast: "var(--duration-fast)",
        base: "var(--duration-base)",
        slow: "var(--duration-slow)",
      },
      transitionTimingFunction: {
        standard: "var(--ease-standard)",
        emphasized: "var(--ease-emphasized)",
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
  plugins: [tailwindcssAnimate],
} satisfies Config;
