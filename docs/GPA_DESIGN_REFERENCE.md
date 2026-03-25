# Ghost Pro Academy — Design Reference
> Feed this file to Claude Code to generate UI components consistent with the GPA design system.

---

## Project context

- **App name**: Ghost Pro Academy
- **Type**: Angular SPA — billiard drill training platform
- **Primary language**: English
- **Style direction**: Dark Pro — dark background, green accent, minimal, competitive/gaming feel

---

## Color palette

```scss
// ── Backgrounds
$bg-base:        #0d120d;   // page background
$bg-surface:     #111811;   // cards, navbar, inputs
$bg-surface-2:   #0d120d;   // nested surfaces, list items
$bg-hover:       #162016;   // hover state on rows/cards

// ── Borders
$border-subtle:  #1e2e1e;   // default border — cards, dividers
$border-medium:  #2a3a2a;   // hover border, secondary emphasis
$border-strong:  #2a4a2a;   // active/selected border

// ── Accent — Green (primary action)
$green-bright:   #4caf6e;   // CTA buttons, active states, icons
$green-dim:      #1e5030;   // badge border
$green-fill:     #0d2a1a;   // badge background
$green-text:     #c8e8c8;   // primary text on dark
$green-muted:    #6a8a6a;   // nav links, secondary text
$green-faint:    #4a6a4a;   // labels, tertiary text

// ── Accent — Gold (XP, streaks, level)
$gold-bright:    #f0b840;   // XP values, streak counter
$gold-fill:      #2a200a;   // gold badge background
$gold-border:    #4a3a1a;   // gold badge border

// ── Accent — Red (expert difficulty)
$red-text:       #e05050;
$red-fill:       #2a0a0a;
$red-border:     #4a1a1a;

// ── Accent — Blue (intermediate, rank badges)
$blue-text:      #7a8ad4;
$blue-fill:      #1a1a2a;
$blue-border:    #2a3a5a;

// ── Accent — Orange (advanced difficulty)
$orange-text:    #e09040;
$orange-fill:    #2a1a0a;
$orange-border:  #4a3a1a;

// ── Text
$text-primary:   #e8f5e8;   // headings, main content
$text-secondary: #c8e8c8;   // body text
$text-muted:     #6a8a6a;   // nav links, inactive
$text-faint:     #4a6a4a;   // labels, metadata
```

---

## Typography

```scss
// ── Display / logo — Bebas Neue (Google Fonts)
// Use for: logo, drill titles, large stat numbers
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap');
font-family: 'Bebas Neue', sans-serif;

// ── Body — DM Sans (Google Fonts)
// Use for: all UI text, labels, buttons, inputs
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&display=swap');
font-family: 'DM Sans', sans-serif;

// ── Scale
// Logo:         Bebas Neue, 22px, letter-spacing 0.16em
// Page title:   Bebas Neue, 34px, letter-spacing 0.06em
// Card title:   Bebas Neue, 26px
// Stat number:  Bebas Neue, 32px
// Body:         DM Sans, 13-14px, weight 400
// Label:        DM Sans, 10-11px, weight 600, uppercase, letter-spacing 0.06-0.1em
// Button:       DM Sans, 13px, weight 600
// Nav link:     DM Sans, 13px, weight 400
```

---

## Spacing & radius

```scss
$radius-sm:   6px;    // badges, small pills
$radius-md:   8px;    // inputs, small buttons
$radius-lg:   10-12px; // cards
$radius-full: 50%;    // avatars

$border-width: 0.5px; // all borders — cards, inputs, dividers
```

---

## Component specs

### Navbar
```
height: ~52px
background: $bg-surface (#111811)
border-bottom: 0.5px solid $border-subtle
padding: 14px 24px

Left:   Logo — "GHOST PRO ACADEMY" in Bebas Neue, white + green accent on "PRO"
Center: Nav links — Drills / Leaderboard / Progress / Community
Right:  XP counter pill + avatar circle + CTA button
```

### Buttons

```scss
// Primary CTA
background: #4caf6e;
color: #0a0f0a;
font: DM Sans 13px 600;
padding: 10px 22px;
border-radius: 7px;
border: none;

// Secondary / ghost
background: transparent;
color: #6a8a6a;
border: 0.5px solid #2a3a2a;
padding: 10px 18px;
border-radius: 7px;

// Hover states: lighten bg by ~10%, add border-color shift to $border-strong
```

### Input fields

```scss
background: #0d120d;       // $bg-surface-2
border: 0.5px solid #1e2e1e;
border-radius: 8px;
padding: 10px 14px;
color: #e8f5e8;
font: DM Sans 13px 400;

&::placeholder { color: #4a6a4a; }
&:focus {
  border-color: #4caf6e;
  outline: none;
  box-shadow: 0 0 0 2px rgba(76, 175, 110, 0.15);
}
```

### Cards

```scss
background: #111811;
border: 0.5px solid #1e2e1e;
border-radius: 12px;
padding: 20px;

// Section label above card group
font: DM Sans 10px 600, uppercase, letter-spacing 0.14em;
color: #4a6a4a;
```

### Badges / pills

```scss
// Base
font: DM Sans 10px 600, uppercase, letter-spacing 0.05-0.08em;
padding: 3px 8-9px;
border-radius: 4-6px;

// By difficulty
.beginner  { bg: #0d2a1a; color: #4caf6e; border: 0.5px solid #1e4a2a; }
.intermediate { bg: #1a1a2a; color: #7a8ad4; border: 0.5px solid #2a3a5a; }
.advanced  { bg: #2a1a0a; color: #e09040; border: 0.5px solid #4a3a1a; }
.expert    { bg: #2a0a0a; color: #e05050; border: 0.5px solid #4a1a1a; }

// By type
.tag-green { bg: #0d2a1a; color: #4caf6e; border: 0.5px solid #1e5030; }
.tag-gold  { bg: #2a200a; color: #f0b840; border: 0.5px solid #4a3a1a; }
```

### Progress bar

```scss
track: { height: 4-6px; background: #1e2e1e; border-radius: 4px; }
fill:  { background: #4caf6e; border-radius: 4px; } // for XP: #f0b840
```

### Avatar circle

```scss
width: 32-44px; height: 32-44px;
border-radius: 50%;
background: #1a2e1a;
border: 1.5px solid #4caf6e;
color: #4caf6e;
font: DM Sans 12-14px 600;
```

---

## Login page — spec

### Layout
```
Full viewport, centered vertically and horizontally.
Background: #0d120d (same as app)
Optional: subtle dark green diagonal stripe or grid pattern for depth.

Left panel (optional, 50%): branding / visual — logo large, tagline, feature bullets
Right panel (or centered card): login form
```

### Login card
```scss
background: #111811;
border: 0.5px solid #1e2e1e;
border-radius: 16px;
padding: 36px 40px;
width: 400px max;

// Header
Logo:    "GHOST PRO ACADEMY" — Bebas Neue 28px, white + green "PRO"
Tagline: "Train like a ghost. Play like a pro." — DM Sans 13px, color #5a7a5a

// Form fields
Label:   DM Sans 11px 600 uppercase, color #4a6a4a, margin-bottom 6px
Input:   full width, spec above
Gap between fields: 16px

// Fields needed
- Email address
- Password  (with show/hide toggle)

// Forgot password link: DM Sans 12px, color #4caf6e, text-align right, below password field

// Submit button: full width, primary style, text "Sign in"

// Divider: "or" with lines, color #2a3a2a

// Social / alternative: optional (Google OAuth etc.)

// Bottom link: "Don't have an account? Sign up" — color #6a8a6a, "Sign up" in #4caf6e
```

### Error states
```scss
// Input error
border-color: #e05050;
// Error message below input
font: DM Sans 12px; color: #e05050; margin-top: 4px;
```

### Angular notes
```
- Use ReactiveFormsModule for the login form
- Validators: Validators.required, Validators.email
- Show validation errors only after field is touched
- Loading state on submit button: disable + show spinner (border-color animate on ::after pseudo)
- Route to /dashboard on success
- Component: AuthLoginComponent (auth/login/)
- Styles: scoped SCSS using variables above
- The backend auth service already exists — inject it and call login(email, password)
```

---

## Logo rendering

```html
<!-- HTML -->
<span class="logo">GHOST <em>PRO</em> ACADEMY</span>

<!-- CSS -->
.logo {
  font-family: 'Bebas Neue', sans-serif;
  font-size: 22px;
  letter-spacing: 0.16em;
  color: #e8f5e8;
}
.logo em {
  color: #4caf6e;
  font-style: normal;
}
```

---

## Tone & copy style

- Short, sharp, confident — billiard / gaming culture
- Action verbs: "Start drill", "Sign in", "Track your game"
- Tagline: *"Train like a ghost. Play like a pro."*
- Error messages: direct, not apologetic — e.g. "Invalid credentials" not "Sorry, we couldn't log you in"
