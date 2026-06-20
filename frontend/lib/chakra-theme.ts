import { createSystem, defaultConfig, defineConfig } from "@chakra-ui/react";

const config = defineConfig({
  theme: {
    tokens: {
      colors: {
        primary: {
          50: { value: "#fdf1ec" },
          100: { value: "#ffdbcf" },
          200: { value: "#ffb59b" },
          300: { value: "#ff8a5c" },
          400: { value: "#e8551c" },
          500: { value: "#973100" },
          600: { value: "#812800" },
          700: { value: "#6a2000" },
          800: { value: "#541900" },
          900: { value: "#380d00" },
          950: { value: "#240800" },
        },
        secondary: {
          50: { value: "#fdf3ef" },
          100: { value: "#ffdbca" },
          200: { value: "#ecbda4" },
          300: { value: "#d99c7c" },
          400: { value: "#a37659" },
          500: { value: "#7a5642" },
          600: { value: "#603f2d" },
          700: { value: "#4a3022" },
          800: { value: "#352016" },
          900: { value: "#2e1506" },
          950: { value: "#1c0c03" },
        },
      },
      fonts: {
        heading: { value: "var(--font-playfair-display), serif" },
        body: { value: "var(--font-inter), sans-serif" },
      },
      radii: {
        sm: { value: "0.25rem" },
        md: { value: "0.5rem" },
        lg: { value: "1rem" },
        xl: { value: "1.5rem" },
      },
    },
    semanticTokens: {
      colors: {
        bg: {
          DEFAULT: { value: "#fbf9f8" },
          panel: { value: "#ffffff" },
          muted: { value: "#f6f3f2" },
          subtle: { value: "#f0eded" },
        },
        fg: {
          DEFAULT: { value: "#1b1c1c" },
          muted: { value: "#594139" },
        },
        border: {
          DEFAULT: { value: "#e1bfb4" },
          emphasized: { value: "#8d7167" },
        },
        primary: {
          solid: { value: "{colors.primary.500}" },
          contrast: { value: "{colors.primary.50}" },
          fg: { value: "{colors.primary.600}" },
          muted: { value: "{colors.primary.100}" },
          subtle: { value: "{colors.primary.50}" },
          emphasized: { value: "{colors.primary.200}" },
          focusRing: { value: "{colors.primary.500}" },
        },
        secondary: {
          solid: { value: "{colors.secondary.500}" },
          contrast: { value: "{colors.secondary.50}" },
          fg: { value: "{colors.secondary.600}" },
          muted: { value: "{colors.secondary.100}" },
          subtle: { value: "{colors.secondary.50}" },
          emphasized: { value: "{colors.secondary.200}" },
          focusRing: { value: "{colors.secondary.500}" },
        },
      },
    },
  },
});

export const system = createSystem(defaultConfig, config);
