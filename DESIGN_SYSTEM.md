# GrokCode Design System
**Last Updated:** January 9, 2026

## Color Palette

### Primary Colors
- `--bg-primary`: #0f0f23 (Main background)
- `--bg-secondary`: #1a1a2e (Secondary background)
- `--bg-tertiary`: #2a2a3e (Tertiary background)
- `--text-primary`: #ffffff (Primary text)
- `--text-secondary`: #9ca3af (Secondary text)
- `--accent-primary`: #6841e7 (Claude Purple - Primary accent)
- `--accent-hover`: #7c5cff (Hover state for accent)
- `--border-color`: #404050 (Border color)

### Semantic Colors
- `--success`: #10b981 (Success states)
- `--warning`: #f59e0b (Warning states)
- `--danger`: #ef4444 (Error/danger states)

## Typography

### Font Family
- **Primary**: Inter (via next/font/google)
- **Code**: Monaco or Fira Code (monospace)

### Font Weights
- Headings: 600-700
- Body: 400-500
- Code: 400

## Layout Grid

### Structure
- Sidebar: 20% width (min 240px, max 320px)
- Main Content: 80% width
- Max content width: 1440px
- Base spacing unit: 4px (8px increments)

### Component Heights
- Header Bar: 60px
- Input Bar: Auto (sticky bottom)

## Viewport Breakpoints

- **Mobile**: < 640px (hide sidebar, full-width editor)
- **Tablet**: 640px - 1024px (collapsible sidebar)
- **Desktop**: > 1024px (fixed layout)

## Component Specifications

### Header
- Height: 60px
- Background: --bg-secondary
- Border-bottom: 1px solid --border-color

### Sidebar
- Width: 20% (240px-320px)
- Resizable: Yes
- Scrollable: Yes
- Background: --bg-secondary

### Editor Pane
- Syntax highlighting: Yes
- Line numbers: Yes
- Minimap: Yes
- Theme: Dark (Claude-inspired)

### Chat Pane
- Scrollable: Yes
- Markdown support: Yes
- Message bubbles with shadows

### Input Bar
- Position: Sticky bottom
- File upload: Supported
- Keyboard shortcuts: Cmd+Enter to send

## States

### Loading States
- Skeleton loaders
- Spinner animations
- Progress indicators

### Error States
- Error messages with --danger color
- Retry buttons
- Error boundaries

### Active/Inactive States
- Hover effects on interactive elements
- Focus states with --accent-primary
- Disabled states with reduced opacity
