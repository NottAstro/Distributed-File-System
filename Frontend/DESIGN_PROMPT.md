# DFS — Distributed File System Frontend Design Prompt

> A comprehensive design specification for a secure, elegant file management web application.  
> **Design Reference**: [Cofounder.co](https://cofounder.co/) — dark-first, typographically refined, glassmorphic, premium.

---

## 1. PRODUCT OVERVIEW

**What it is:**  
A web-based Distributed File System where any user can sign up, securely upload files, and retrieve/download them from anywhere. Files are split, distributed across storage nodes, and reassembled on demand — all abstracted behind a clean, premium interface.

**Core user flows:**
1. **Landing** → Learn what DFS is, get impressed, sign up
2. **Sign Up / Sign In** → Secure authentication (JWT-based)
3. **Dashboard** → View all uploaded files, storage metrics, recent activity
4. **Upload** → Drag-and-drop or browse to upload, with encryption & chunk distribution
5. **Download** → One-click file retrieval from distributed nodes
6. **File Management** → Rename, delete, share, view metadata
7. **Settings / Profile** → Account management, security preferences

---

## 2. DESIGN SYSTEM — Inspired by Cofounder.co

### 2.1 Color Palette

| Token                  | Value                            | Usage                                      |
|------------------------|----------------------------------|---------------------------------------------|
| `--bg-primary`         | `#0a0a0a`                        | Page background, primary canvas             |
| `--bg-elevated`        | `#141414`                        | Elevated surfaces (modals, panels)          |
| `--bg-surface`         | `#1a1a1a`                        | Table rows, input fields, sidebar           |
| `--bg-hover`           | `rgba(255,255,255,0.04)`         | Hover states on interactive rows            |
| `--text-primary`       | `#FBFBF8`                        | Main headings, prominent labels             |
| `--text-secondary`     | `rgba(255,255,255,0.64)`         | Body text, descriptions, secondary info     |
| `--text-faint`         | `rgba(255,255,255,0.36)`         | Timestamps, metadata, placeholder text      |
| `--accent-primary`     | `#c8ff00`                        | Primary CTA highlight, active states        |
| `--accent-teal`        | `#2dd4bf`                        | Success states, upload complete, online      |
| `--accent-amber`       | `#fbbf24`                        | Warnings, storage nearing limit             |
| `--accent-red`         | `#f87171`                        | Errors, delete actions, failed uploads      |
| `--border-subtle`      | `rgba(255,255,255,0.08)`         | Dividers, table borders, input outlines     |
| `--border-interactive` | `rgba(255,255,255,0.16)`         | Focused input borders, hovered elements     |
| `--glass-bg`           | `rgba(255,255,255,0.06)`         | Glassmorphic panel backgrounds              |
| `--glass-blur`         | `16px`                           | Backdrop-filter blur amount                 |

### 2.2 Typography

| Element             | Font                | Size     | Weight    | Tracking   | Line Height |
|---------------------|---------------------|----------|-----------|------------|-------------|
| Hero heading        | Inter / Geist Sans  | 46px     | 400       | -0.02em    | 108%        |
| Section heading     | Inter / Geist Sans  | 32–40px  | 400       | -0.01em    | 115%        |
| Card/Panel title    | Inter               | 20–24px  | 500       | 0          | 130%        |
| Body text           | Inter               | 15–16px  | 410–460   | 0.15px     | 150%        |
| Button label        | Inter               | 15px     | 460       | 0.15px     | 150%        |
| Caption / Metadata  | IBM Plex Mono       | 12–13px  | 400       | 0.13px     | 140%        |
| Overline / Tag      | Inter               | 11–12px  | 520       | 1.2px      | 100%        |

> Use **Google Fonts**: `Inter` for UI, `IBM Plex Mono` for code/metadata/file sizes.

### 2.3 Spacing & Layout

- **Max content width**: `1200px`, centered with `auto` margins
- **Section padding**: `80px` vertical on desktop, `48px` on mobile
- **Grid gutter**: `24px`
- **Component padding**: `16–24px` internal
- **Border radius**: `8px` for buttons/inputs, `12–16px` for panels, `9999px` for pills/badges
- **NO random rounded-edge rectangular cards floating around** — layouts should feel structured and intentional

### 2.4 Effects & Interactions

- **Glassmorphism**: Use on nav bar, modals, and floating panels — `backdrop-filter: blur(16px)` with `rgba(255,255,255,0.06)` backgrounds
- **Inner text shadows**: Subtle `drop-shadow(0 1px 3px rgba(0,0,0,0.12))` on hero headings
- **Hover transitions**: All interactive elements should transition `color`, `background`, `opacity`, `transform` with `200ms ease-out`
- **Micro-animations**: Fade-in stagger on page load, subtle scale on button hover (`transform: scale(1.02)`), smooth file upload progress
- **NO generic upload boxes** with dashed borders and cloud icons — the upload experience should feel integrated and premium

---

## 3. PAGE-BY-PAGE SPECIFICATION

### 3.1 Landing Page (Public)

**Purpose**: Convince visitors this is a serious, secure, distributed file system.

#### Header / Navigation Bar
- **Position**: Fixed top, full-width, glassmorphic background
- **Left**: Logo wordmark — "DFS" in a clean pixel/geometric font or custom SVG
- **Center/Right Nav Links** (inside a single glassmorphic pill):
  - `How It Works`
  - `Security`
  - `Pricing` *(optional for future)*
- **Right CTA**: Primary button — `Get Started` (solid light surface, dark text, `rounded-[8px]`, `h-[41px]`)

#### Hero Section
- **Layout**: Full viewport height, dark background with subtle animated gradient mesh or particle effect
- **Content** (left-aligned, max-width 720px):
  - **Overline**: `DISTRIBUTED · ENCRYPTED · FAST` (uppercase, `11px`, letter-spaced, faint text)
  - **H1**: `"Your files, distributed across the world. Always accessible."` — large (46px), `font-weight: 400`, with subtle inner shadow filter
  - **Subtitle**: `"Upload once. DFS splits, encrypts, and distributes your files across multiple storage nodes. Download from anywhere, anytime."` — `16px`, `rgba(255,255,255,0.8)`, max-width 540px
  - **CTA Row**:
    - **Primary**: `Start Uploading` — light surface button (white bg, dark text)
    - **Secondary**: `See How It Works` — glassmorphic pill button (transparent, white text, backdrop-blur)

#### How It Works Section
- **Background**: Solid `--bg-primary` transitioning from hero
- **Heading**: Two-tone approach:
  - Bold line: `"Upload. Distribute. Retrieve."` (full ink color)
  - Faint line: `"Your files are never stored in one place."` (faint ink)
- **Visual**: A circular orchestration diagram (SVG/canvas), like Cofounder's agent diagram, showing:
  - Center: `Your File` node
  - Spokes radiating to: `Node A`, `Node B`, `Node C`, `Node N...`
  - Dotted connector lines with subtle dot endpoints
  - Labels: `Encrypted Chunk 1`, `Chunk 2`, etc.
- **NO cards with descriptions below** — keep it diagrammatic and clean

#### Features Section
- **Layout**: 2-column grid, text + live-preview-style visual (like Cofounder's dashboard mockups)
- **Feature rows** (alternate text left/right):

  1. **Secure Upload**
     - Text: Heading + one-liner + subtle caption
     - Visual: A simulated upload interface showing file name, progress bar, encryption badge

  2. **Distributed Storage**
     - Text: Heading + one-liner
     - Visual: A node map visualization showing file chunks spread across locations

  3. **Instant Download**
     - Text: Heading + one-liner
     - Visual: A simulated download interface with reassembly progress indicator

#### Social Proof / Stats Section
- **Layout**: Horizontal row of metrics, centered
- **Metrics** (monospaced numbers with shimmer animation):
  - `10,000+ Files Distributed`
  - `99.9% Uptime`
  - `256-bit AES Encryption`
  - `< 200ms Retrieval`

#### Footer
- **Background**: Same as page, separated by a `1px` border-subtle line
- **Columns**:
  - **DFS** (logo + tagline)
  - **Product**: Upload, Download, Dashboard, Security
  - **Resources**: Documentation, API, Status
  - **Legal**: Privacy, Terms
- **Bottom row**: `© 2025 DFS — Distributed File System` + social icons

---

### 3.2 Authentication Pages (Sign Up / Sign In)

**Layout**: Centered single-column form, max-width `420px`, vertically centered on viewport

#### Sign In Page
- **Elements**:
  - Logo at top center
  - **H2**: `"Welcome back"` (section heading size, center-aligned)
  - **Subtitle**: `"Sign in to access your distributed files"` (text-secondary)
  - **Inputs** (vertically stacked, `16px` gap):
    - `Email` — text input with label above
    - `Password` — password input with show/hide toggle icon
  - **Action Row**:
    - `Forgot password?` — text link, right-aligned, text-faint
  - **Primary Button**: `Sign In` — full-width, light surface (white bg, dark text), `h-[48px]`
  - **Divider**: `or` with horizontal lines
  - **Bottom text**: `"Don't have an account?"` + `Sign Up` link

#### Sign Up Page
- **Same layout**, different fields:
  - `Full Name`
  - `Email`
  - `Password` (with strength indicator bar — color transitions from red → amber → teal)
  - `Confirm Password`
  - **Primary Button**: `Create Account`
  - **Bottom text**: `"Already have an account?"` + `Sign In` link

**Input styling**:
- Background: `--bg-surface`
- Border: `1px solid --border-subtle`, transitions to `--border-interactive` on focus
- Text: `--text-primary`
- Placeholder: `--text-faint`
- Height: `44px`
- Font: `15px Inter`
- Rounded: `8px`
- **NO** floating labels — use static labels above inputs

---

### 3.3 Dashboard (Authenticated)

**Layout**: Sidebar + main content area

#### Sidebar
- **Width**: `260px` (collapsible to `64px` icon-only on mobile)
- **Background**: `--bg-elevated` with right border `--border-subtle`
- **Top**: Logo + app name
- **Navigation items** (vertical stack, `8px` gap):
  - `📁 My Files` — active state uses `--bg-hover` + left accent bar
  - `⬆ Upload`
  - `⬇ Downloads`
  - `📊 Storage`
  - `⚙ Settings`
- **Bottom**: User avatar circle (initials) + name + `Sign Out` link
- **Style**: Each nav item is a full-width row, `40px` height, `8px` border-radius, with icon + label. Active item gets a `2px` left border in `--accent-primary`

#### Main Content — Files View
- **Top Bar**:
  - **H2**: `"My Files"` (left-aligned)
  - **Right**: `Search` input (inline, icon-prefixed) + `Upload File` button (primary CTA)
  
- **File List** (table-style, NOT cards):
  - **Column headers**: `Name` | `Size` | `Type` | `Uploaded` | `Status` | `Actions`
  - **Row style**: Full-width rows with bottom border `--border-subtle`, `52px` height
  - **Row hover**: Background transitions to `--bg-hover`
  - **File icon**: Small SVG icon based on file type (document, image, archive, etc.)
  - **Status column**: 
    - `Distributed` — teal dot + label
    - `Processing` — amber dot + pulsing animation + label
    - `Failed` — red dot + label
  - **Actions column** (appear on hover):
    - `⬇ Download` — icon button
    - `🔗 Share` — icon button
    - `🗑 Delete` — icon button (red on hover)
  - **Empty state**: Centered text — `"No files yet"` + `"Upload your first file to get started"` + `Upload` CTA

- **Storage Meter** (bottom of sidebar or top of main content):
  - Thin horizontal bar showing usage
  - Label: `"2.4 GB of 10 GB used"` in mono font
  - Color: Teal fill, transitions to amber at 75%, red at 90%

---

### 3.4 Upload Experience

> **CRITICAL: No generic file uploader widget. No dashed-border box with a cloud icon. No "Drag files here" card.**

**Approach**: Upload is a **full-page takeover** or a **slide-in panel** from the right.

#### Upload Panel
- **Header**: `"Upload to DFS"` + close button (×)
- **Drop Zone** (full panel area):
  - **Default state**: The entire panel acts as a drop zone. Subtle text in the center: `"Drop files anywhere on this panel"` with a small arrow-down icon. Background is just `--bg-elevated` — no box, no dashed border.
  - **Drag-over state**: Full panel background shifts to `rgba(200,255,0,0.04)` with a `1px` border of `--accent-primary` appearing at the edges. Text changes to `"Release to upload"`
  - **Browse fallback**: A small text link at the bottom: `"or browse from your device"` — triggers native file picker
  
- **File Queue** (appears below once files are selected):
  - Each file is a horizontal row:
    - File type icon | File name (truncated) | File size (mono) | Progress bar | Status label
  - **Progress bar**: Thin (`4px`), no border-radius, fills from left in `--accent-teal`. Below the file name, integrated — not a separate component
  - **Status labels**:
    - `Encrypting...` → `Chunking...` → `Distributing...` → `Complete ✓`
  - **Action per file**: `✕ Cancel` (during upload) or `✕ Remove` (before upload)

- **Bottom action bar**:
  - `Upload All` — primary CTA button
  - `Clear Queue` — ghost/text button

---

### 3.5 Download / File Detail View

When a user clicks a file in the dashboard:

#### File Detail Panel (slide-in from right, or modal overlay)
- **Header**: File name as title + file type badge (pill: `PDF`, `PNG`, `ZIP`, etc.)
- **Metadata block** (monospaced, stacked labels):
  - `Size`: `12.4 MB`
  - `Uploaded`: `Jul 28, 2025 at 14:32`
  - `Chunks`: `4 across 3 nodes`
  - `Encryption`: `AES-256-CBC`
  - `Status`: Teal dot + `Distributed`
- **Actions** (button row):
  - `Download` — primary CTA (light surface)
  - `Share Link` — secondary (glassmorphic)
  - `Delete` — danger ghost button (text turns red on hover)
- **Download progress**: When initiated, a thin full-width progress bar appears at the top of the panel
  - Labels below: `Reassembling chunks...` → `Decrypting...` → `Ready`

---

### 3.6 Settings Page

**Layout**: Same sidebar, main content area with stacked setting sections

#### Sections:
1. **Profile**
   - Avatar (initials circle, editable)
   - Full Name input
   - Email input (read-only, grayed)
   - `Save Changes` button

2. **Security**
   - Change Password (old + new + confirm)
   - Two-Factor Authentication toggle
   - Active Sessions list (with `Revoke` buttons)

3. **Storage**
   - Storage usage meter (same as sidebar)
   - Breakdown by file type (horizontal stacked bar)
   - `Request More Storage` text link

4. **Danger Zone**
   - `Delete All Files` — outlined red button
   - `Delete Account` — outlined red button with confirmation modal

---

## 4. INTERACTIVE ELEMENTS — BUTTON INVENTORY

### Primary Buttons (Light Surface)
- **Style**: `background: #FBFBF8`, `color: #1a1a1a`, `border: none`
- **Size**: `height: 41–48px`, `padding: 0 16px`, `border-radius: 8px`
- **Hover**: Subtle inner shadow or brightness increase, optional `scale(1.02)` transform
- **Usage**: `Get Started`, `Sign In`, `Create Account`, `Upload All`, `Download`, `Save Changes`

### Secondary Buttons (Glassmorphic Pill)
- **Style**: `background: rgba(255,255,255,0.06)`, `backdrop-filter: blur(16px)`, `color: #FBFBF8`, `border: 1px solid rgba(255,255,255,0.1)`
- **Size**: Same as primary
- **Hover**: Glass layer opacity increases, text brightens
- **Usage**: `See How It Works`, `Share Link`, `Clear Queue`

### Ghost / Text Buttons
- **Style**: No background, no border, `color: --text-secondary`
- **Hover**: `color: --text-primary`, optional underline
- **Usage**: `Forgot password?`, `Sign Up`, `or browse from your device`, `Sign Out`

### Danger Buttons
- **Style**: `background: transparent`, `border: 1px solid --accent-red`, `color: --accent-red`
- **Hover**: `background: rgba(248,113,113,0.1)`
- **Usage**: `Delete`, `Delete Account`, `Delete All Files`

### Icon Buttons (Action Row)
- **Style**: `32×32px`, `border-radius: 8px`, `background: transparent`
- **Hover**: `background: --bg-hover`
- **Content**: Single SVG icon, `16–18px`, `color: --text-faint` → `--text-primary` on hover
- **Usage**: Download, Share, Delete, Close, Collapse sidebar

### Navigation Items
- **Style**: Full-width row, `height: 40px`, `padding: 0 12px`, `border-radius: 8px`, `background: transparent`
- **Hover**: `background: --bg-hover`
- **Active**: `background: --bg-hover` + `2px` left border in `--accent-primary` + `font-weight: 500` + `color: --text-primary`

---

## 5. COMPONENT INVENTORY

| Component              | Variants                                     | Notes                                               |
|------------------------|----------------------------------------------|------------------------------------------------------|
| **NavBar**             | Landing (glassmorphic), Dashboard (solid)     | Fixed position, responsive collapse                  |
| **Button**             | Primary, Secondary, Ghost, Danger, Icon       | See Section 4                                        |
| **Input**              | Text, Password (with toggle), Search          | Consistent sizing and border treatment               |
| **FileRow**            | Normal, Hover, Uploading, Processing          | Table row, not a card                                |
| **ProgressBar**        | Upload, Download, Storage                     | Thin (4px), no border-radius, color-coded            |
| **StatusDot**          | Distributed (teal), Processing (amber), Failed (red) | 8px circle + label                            |
| **Avatar**             | Initials circle                               | 32–40px, `--bg-surface` with text                    |
| **Modal**              | Confirmation (delete), Alert                  | Glassmorphic overlay with centered panel             |
| **SidePanel**          | Upload panel, File detail panel               | Slides in from right, 400–480px wide                 |
| **StorageMeter**       | Sidebar (thin), Settings (full-width)         | Color transitions at 75% and 90%                     |
| **DiagramNode**        | File node, Storage node                       | For "How It Works" visualization                     |
| **Badge/Pill**         | File type, Status                             | `border-radius: 9999px`, mono font                   |
| **Divider**            | Horizontal rule                               | `1px solid --border-subtle`                          |
| **Toast/Notification** | Success, Error, Info                          | Slides in from top-right, auto-dismisses             |

---

## 6. RESPONSIVE BREAKPOINTS

| Breakpoint    | Width         | Adjustments                                                        |
|---------------|---------------|--------------------------------------------------------------------|
| Desktop       | `≥ 1000px`    | Full sidebar + content, hero at 46px                               |
| Tablet        | `768–999px`   | Sidebar collapses to icons, hero at 38px, 1-column features       |
| Mobile        | `< 768px`     | No sidebar (hamburger menu), hero at 34px, stacked everything     |

---

## 7. ANTI-PATTERNS — What NOT to Do

> These are explicitly forbidden in this design system:

1. ❌ **No random floating rounded-rectangle cards** with shadows scattered across the page
2. ❌ **No generic "file uploader" widget** — no dashed border box, no cloud-with-arrow icon in a rectangle, no "Drag & Drop your files here" card
3. ❌ **No bright/neon color accents** that clash with the refined dark palette
4. ❌ **No default browser-style form elements** — everything must be custom styled
5. ❌ **No gratuitous gradients** on buttons — keep them flat with subtle depth
6. ❌ **No card grids for file display** — use structured table rows
7. ❌ **No stock illustrations** or cartoon-style graphics
8. ❌ **No light mode** — dark theme only (matching Cofounder.co's dark-first approach)
9. ❌ **No rounded cards with "Upload" text and a big plus icon** — the upload experience is a panel, not a card

---

## 8. ANIMATION GUIDELINES

| Animation              | Property              | Duration  | Easing                        |
|------------------------|-----------------------|-----------|-------------------------------|
| Button hover           | `background`, `scale` | `200ms`   | `ease-out`                    |
| Page section fade-in   | `opacity`, `translateY` | `400ms` | `cubic-bezier(0.23,1,0.32,1)` |
| Panel slide-in         | `translateX`          | `300ms`   | `cubic-bezier(0.23,1,0.32,1)` |
| Progress bar fill      | `width`               | `150ms`   | `linear`                      |
| Status dot pulse       | `opacity`             | `1500ms`  | `ease-in-out` (infinite)      |
| Row hover              | `background-color`    | `150ms`   | `ease-in-out`                 |
| Toast notification     | `translateY`, `opacity` | `250ms` | `ease-out`                    |
| Stagger delay per item | —                     | `+60ms`   | Per child index               |

---

## 9. TECH STACK ALIGNMENT

This frontend will consume the existing backend built with:
- **Server**: Node.js + Express
- **Database**: MySQL (via mysql2)
- **Auth**: JWT (jsonwebtoken) + bcryptjs
- **File handling**: Server-side upload/download with chunking

**Frontend expectations:**
- Static HTML/CSS/JS or a framework like React/Vite in the `Frontend/` directory
- API calls to Express endpoints for auth, upload, download, file listing
- JWT stored in `httpOnly` cookies or `localStorage` with proper handling
- File uploads via `FormData` with progress tracking using `XMLHttpRequest` or `fetch` with `ReadableStream`

---

## 10. REFERENCE SCREENSHOTS

The following Cofounder.co screenshots were captured for design reference and should be consulted when implementing the visual language:

- **Hero section**: Dark bg, large elegant headline, dual CTA buttons (one solid light, one glass pill), video/animation background
- **Middle sections**: Two-tone headings (solid + faint), orchestration diagrams, simulated dashboard panels
- **Navigation**: Glassmorphic fixed header with pill-grouped links and dividers
- **Typography**: Thin-weight headlines, generous line-height, subtle tracking adjustments
- **Footer**: Minimal, dark, multi-column with border-top separator

---

*This prompt should be used as the definitive design specification when building out the DFS frontend. Every component, page, and interaction described here should be implemented with the premium, dark-first, typographically refined aesthetic inspired by Cofounder.co.*
