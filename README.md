# Chronos

A modern productivity application built with React, TypeScript, Vite, and Supabase.

## Tech Stack

- **Frontend:** React 18, TypeScript, Vite
- **Styling:** Tailwind CSS, Shadcn UI, Lucide Icons
- **Backend/Database:** Supabase
- **Internationalization:** i18next
- **State Management & Data Fetching:** TanStack Query (React Query)
- **Forms:** React Hook Form, Zod
- **Testing:** Vitest

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher)
- [Bun](https://bun.sh/) (Optional, but recommended as `bun.lockb` is present)

### Installation

1. Clone the repository.
2. Install dependencies:

```bash
# Using Bun (Recommended)
bun install

# Using npm
npm install
```

### Running the Project

To start the development server:

```bash
# Using Bun
bun run dev

# Using npm
npm run dev
```

The application will be available at `http://localhost:8080` (or the port specified in your terminal).

### Environment Configuration

The project uses Supabase for authentication and database services. Ensure you have a `.env` file in the root directory with the following variables:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
```

A default `.env` is provided in the repository for initial setup.

## Available Scripts

- `npm run dev`: Starts the Vite development server.
- `npm run build`: Builds the project for production.
- `npm run preview`: Locally previews the production build.
- `npm run lint`: Runs ESLint for code quality checks.
- `npm run test`: Runs the test suite using Vitest.

## Supabase Edge Functions

The project includes Edge Functions located in `supabase/functions/`. To run these locally, you will need the [Supabase CLI](https://supabase.com/docs/guides/cli):

1. Install Supabase CLI.
2. Run `supabase start`.
3. Run functions locally using `supabase functions serve`.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
