---
name: Ethos & Hearth
colors:
  surface: '#fbf9f8'
  surface-dim: '#dcd9d9'
  surface-bright: '#fbf9f8'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f6f3f2'
  surface-container: '#f0eded'
  surface-container-high: '#eae8e7'
  surface-container-highest: '#e4e2e1'
  on-surface: '#1b1c1c'
  on-surface-variant: '#594139'
  inverse-surface: '#303030'
  inverse-on-surface: '#f3f0f0'
  outline: '#8d7167'
  outline-variant: '#e1bfb4'
  surface-tint: '#a93700'
  primary: '#973100'
  on-primary: '#ffffff'
  primary-container: '#c04000'
  on-primary-container: '#ffe9e3'
  inverse-primary: '#ffb59b'
  secondary: '#7a5642'
  on-secondary: '#ffffff'
  secondary-container: '#fecdb4'
  on-secondary-container: '#795541'
  tertiary: '#535542'
  on-tertiary: '#ffffff'
  tertiary-container: '#6c6d59'
  on-tertiary-container: '#efefd7'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdbcf'
  primary-fixed-dim: '#ffb59b'
  on-primary-fixed: '#380d00'
  on-primary-fixed-variant: '#812800'
  secondary-fixed: '#ffdbca'
  secondary-fixed-dim: '#ecbda4'
  on-secondary-fixed: '#2e1506'
  on-secondary-fixed-variant: '#603f2d'
  tertiary-fixed: '#e4e4cc'
  tertiary-fixed-dim: '#c8c8b0'
  on-tertiary-fixed: '#1b1d0e'
  on-tertiary-fixed-variant: '#474836'
  background: '#fbf9f8'
  on-background: '#1b1c1c'
  surface-variant: '#e4e2e1'
typography:
  display-lg:
    fontFamily: Playfair Display
    fontSize: 48px
    fontWeight: '600'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Playfair Display
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1.2'
  headline-md:
    fontFamily: Playfair Display
    fontSize: 32px
    fontWeight: '500'
    lineHeight: '1.3'
  headline-md-mobile:
    fontFamily: Playfair Display
    fontSize: 24px
    fontWeight: '500'
    lineHeight: '1.3'
  title-sm:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: '1.5'
    letterSpacing: 0.01em
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
  label-caps:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: '1.0'
    letterSpacing: 0.1em
  price-lg:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '500'
    lineHeight: '1.2'
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  container-max: 1280px
  gutter-desktop: 32px
  margin-desktop: 64px
  gutter-mobile: 16px
  margin-mobile: 20px
---

## Brand & Style

The design system is anchored in **Tactile Minimalism**. It targets a discerning audience seeking comfort, quality, and timeless elegance in their living spaces. The UI must evoke the sensation of high-quality linen: breathable, structured yet soft, and inherently premium.

The aesthetic blends **Modern Minimalism** with **Editorial Sophistication**. It prioritizes high-quality lifestyle photography, using generous whitespace as a luxury signifier. Every element is designed to feel calm and intentional, avoiding digital noise to focus on the materiality of the products.

## Colors

The palette is inspired by natural pigments and raw fibers.

- **Primary (Terracotta):** Used sparingly for key calls-to-action and meaningful highlights to provide a warm, earthy focal point.
- **Secondary (Dusty Rose):** A soft, complementary accent for secondary interactions, badges, or subtle hover states.
- **Neutral (Deep Charcoal):** Applied to all typography and iconography to ensure high legibility and a grounded, authoritative feel.
- **Backgrounds:** The interface utilizes **Off-white (#FAF9F6)** as the primary canvas, with **Warm Beige (#F5F5DC)** used for container backgrounds and section dividers to create a subtle layered depth without relying on harsh lines.

## Typography

This design system employs a classic serif/sans-serif pairing to balance editorial beauty with functional clarity.

**Playfair Display** is reserved for headlines and storytelling elements. Its high-contrast strokes and elegant apertures provide the "luxury" voice of the brand.

**Inter** handles all utilitarian tasks. It is used for body copy, product descriptions, navigation, and prices. The generous x-height of Inter ensures readability even at smaller sizes on mobile devices. **Label-caps** should be used for category headers and overlines to add a structured, organized feel to the page layout.

## Layout & Spacing

The layout philosophy follows a **Fixed-Fluid hybrid grid**. Content is contained within a maximum width of 1280px on desktop to maintain readability and premium white space.

- **Desktop:** 12-column grid with 32px gutters and 64px outer margins.
- **Mobile:** 4-column grid with 16px gutters and 20px outer margins.

Spacing follows an 8px linear scale. For luxury positioning, use "excessive" padding (e.g., 80px or 120px) between major homepage sections to allow the eye to rest. Product grids should prioritize image aspect ratios, typically using a 3:4 vertical crop to emphasize textile drapes.

## Elevation & Depth

This design system avoids heavy shadows and skeuomorphism in favor of **Tonal Layering**. Depth is primarily communicated through the contrast between the Off-white background and Warm Beige surfaces.

When physical depth is required (e.g., for modals or hovering over product cards), use **Ambient Shadows**. These should be highly diffused, using a low-opacity Deep Charcoal (#333333) with a hint of the Primary color mixed in to maintain warmth. Shadows should have a large blur radius (20px+) and very low offset to mimic soft, overhead gallery lighting.

Avoid "floating" elements; everything should feel like it is resting on a soft, matte surface.

## Shapes

To reflect the softness of home textiles, the design system utilizes **Rounded** geometry. Sharp corners are avoided as they feel too industrial or aggressive for a home brand.

- **Standard Elements (Buttons, Inputs):** 0.5rem (8px) corner radius.
- **Large Containers (Cards, Modals):** 1rem (16px) corner radius.
- **Interactive Tags:** Use the maximum rounded-xl setting (1.5rem) to create soft, pill-shaped chips for categories.

Icons should feature rounded terminals and a consistent 1.5px or 2px stroke weight to match the weight of the Inter typeface.

## Components

### Buttons
Primary buttons use a solid Terracotta background with White text. Secondary buttons use a Deep Charcoal outline (1px) with no fill. For a "text-only" button used in navigation, use the Label-caps style with a subtle underline that expands on hover.

### Cards
Product cards are borderless. They rely on the Off-white background and soft ambient shadows on hover. The product title (Playfair) and price (Inter) should be center-aligned beneath the image to maintain a boutique feel.

### Input Fields
Inputs use the Warm Beige (#F5F5DC) as a subtle fill. The border is invisible until focused, at which point a 1px Deep Charcoal border appears. Labels always sit above the field in the Label-caps style.

### Chips & Filters
Filter chips should be pill-shaped with a 1px Dusty Rose border. When active, they fill with Dusty Rose and the text changes to Deep Charcoal.

### Lists & Navigation
Desktop navigation uses a wide-spaced horizontal list in Inter Medium. Mobile navigation uses a full-screen overlay with large Playfair Display links, emphasizing the editorial nature of the brand even in functional menus.
