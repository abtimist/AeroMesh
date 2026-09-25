# 📘 Day 5: UI/UX Rebuild & Design System Alignment

**Date:** Sept 26, 2026

## 1. What Did We Do?

We performed a complete UI/UX rebuild of the frontend to align perfectly with the `DESIGN_SYSTEM.md` and the initial mockups. We replaced the mismatched dark/glassmorphic interface with a clean, high-performance command center dashboard and a separate, mobile-optimized citizen reporting portal.

## 2. Why Did We Do It?

The previous frontend implementation drifted from the agreed-upon design system. Specifically:
- It was enforcing a dark, glassmorphism theme that was explicitly rejected in the design system (which favors calm, readable interfaces for high-pressure emergency command centers).
- The map was squished by overly large sidebars, violating the "Map-First" layout philosophy.
- The mobile UI (Citizen Portal) was leaking into the desktop dashboard navigation.
- Map tiles were broken due to missing API keys (CartoDB watermark).

A complete rebuild ensures the platform looks professional, operates smoothly, and handles the "two audiences" (Command Center Operators vs. Citizens) appropriately.

## 3. How Did We Do It?

### Architecture & Routing Separation
- **Smart Root (`App.jsx`)**: We implemented a `useDeviceType` hook that dynamically serves the `DashboardPage` (Command Center) to desktop users, and automatically falls back to the `CitizenPortalPage` for mobile devices.
- Removed all "Report" / "Camera" navigation links from the desktop UI to cleanly separate the operator view from the citizen view.

### Theming & Styling
- **CSS Custom Properties**: Replaced hardcoded Tailwind colors with CSS variables in `index.css` to enable dynamic theming.
- **Dark Mode**: Built a proper `useTheme` hook that toggles dark mode, persists the choice to `localStorage`, and handles the transition seamlessly.
- **EPA AQI Standards**: Implemented `data-aqi` attributes to strictly follow standard EPA color coding across both light and dark themes.

### Component Rebuilds
- **Topbar**: A clean `h-14` header with a logo, node switcher, role switcher (for hackathon demo purposes), dark mode toggle, and notification bell. Fixed `z-index` layering so dropdowns render over the map.
- **Sidebar**: Rebuilt as a 72px icon-only navigation bar. Features CSS-only tooltips on hover to save space while remaining accessible.
- **KPI Strip & StatCards**: Created compact, floating `backdrop-blur` data cards that overlay the top-left of the map, providing critical metrics (Active Events, PM2.5 Peak) without shifting the layout.
- **Alert Panel**: A 360px off-canvas drawer that slides in from the right edge containing an actionable feed of prioritized events.

### Map Refinements
- **Esri Canvas Tiles**: Replaced CartoDB tiles with free, no-API-key-required Esri Light/Dark Canvas basemaps. These switch dynamically based on the current UI theme.
- **Realistic Mock Data**: Replaced generic placeholders with highly plausible Indo-Gangetic Plain scenarios (e.g., Okhla Industrial Area spikes, Panipat Stubble Burning) to make the demo feel authentic.

## 4. Next Steps
With the UI framework solid, we are moving to **Day 6: Backend Integration**. We will replace the realistic mock data in the React components by wiring them directly to the FastAPI backend, querying PostGIS for live spatial data.
