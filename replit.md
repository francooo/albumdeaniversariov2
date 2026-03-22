# Photo Album App

A React + Vite + TypeScript frontend application for managing photo albums.

## Architecture

- **Frontend**: React 19, TypeScript, Vite 6, Tailwind CSS v4
- **Routing**: React Router DOM v7
- **Database**: Neon PostgreSQL (serverless, via `@neondatabase/serverless`)
- **AI**: Google Gemini API (`@google/genai`)
- **Animations**: Framer Motion (`motion`)
- **Icons**: Lucide React

## Project Structure

```
src/
  App.tsx          - Main app with routing
  main.tsx         - Entry point
  index.css        - Global styles
  components/      - Reusable UI components
  pages/           - Page components (Login, Register, Dashboard, etc.)
  db/              - Database connection and init scripts
  services/api/    - API service layer
```

## Environment Variables

Copy `.env.example` to `.env` and fill in:

- `GEMINI_API_KEY` - Google Gemini API key
- `GROQ_API_KEY` - Groq AI API key (optional)
- `VITE_DATABASE_URL` - Neon PostgreSQL connection string

## Development

```bash
npm install
npm run dev      # Starts on port 5000
```

## Database Setup

```bash
npx tsx src/db/init.ts   # Initializes database schema
```

## Mobile Responsiveness (Task #3)

All pages are fully responsive:
- **Dashboard**: Hamburger menu (☰) on mobile — sidebar becomes a slide-in drawer. Header buttons collapse to icon-only on small screens. Table scrolls horizontally. Some columns hidden on mobile (`sm:table-cell`, `md:table-cell`).
- **Viewer**: Navigation arrows moved below the flipbook card (no more `absolute -left-16`/`-right-20` off-screen positioning). Header nav links hidden on mobile, action buttons collapse to icon-only.
- **PublicAlbumViewer**: Compact banner on mobile (shorter text, fewer buttons). Album viewer uses same below-card navigation pattern. Title scales with `text-3xl md:text-5xl`.
- **Modal (base component)**: Slides up from bottom on mobile (bottom sheet UX), centered dialog on `sm+`.
- **Overview / Account / Uploads / Privacy**: Headers now use `px-4 md:px-8` and `py-4 md:py-6`. Main content uses `px-4 md:px-8`.
- **AlbumsList**: Storage widget is full-width on mobile, right-aligned from `sm` up.

## Deployment

Configured as a static site:
- Build: `npm run build`
- Output: `dist/`
