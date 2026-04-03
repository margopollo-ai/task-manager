# TaskFlow

A task management app built with Next.js 16, Prisma, and Neon Postgres. Organize work around goals, manage tasks inline, and schedule meetings directly to Google Calendar.

## Features

- **Goals** — Create and prioritize goals with drag-and-drop reordering. Tag tasks to goals and see linked tasks at a glance.
- **Task backlog** — Inline editing for title, status, priority, assignee, and due date. No modals needed for quick edits.
- **Task detail panel** — Edit labels, description, scheduling, and goal assignment from a slide-in panel.
- **Scheduling** — Set a start/end time and recurrence (daily, weekly, monthly), then add it directly to Google Calendar with one click.
- **Dashboard (Tasks tab)** — See your open tasks across all projects with inline goal tagging.
- **Authentication** — Email/password sign up and login via NextAuth.

## Tech Stack

- **Framework**: Next.js 16 (App Router, Turbopack)
- **Database**: Neon Postgres via Prisma ORM
- **Auth**: NextAuth v5
- **UI**: Tailwind CSS, Lucide icons, dnd-kit (drag & drop)
- **Data fetching**: TanStack Query

## Getting Started

### Prerequisites

- Node.js 20+
- A [Neon](https://neon.tech) Postgres database

### Setup

1. Clone the repo:

```bash
git clone https://github.com/margopollo-ai/task-manager.git
cd task-manager
```

2. Install dependencies:

```bash
npm install
```

3. Create a `.env.local` file with the following variables:

```env
DATABASE_URL=your_neon_connection_string
NEXTAUTH_SECRET=your_secret   # generate with: openssl rand -base64 32
NEXTAUTH_URL=http://localhost:3000
```

4. Run database migrations:

```bash
npx prisma migrate dev
```

5. Start the dev server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to get started.

## Project Structure

```
app/
├── (app)/              # Authenticated app routes
│   ├── dashboard/      # Tasks tab — your open tasks
│   ├── goals/          # Goals management page
│   └── [orgSlug]/[projectKey]/
│       └── backlog/    # Inline-editable task table
├── (auth)/             # Login & signup pages
└── api/                # API routes (tasks, goals, projects, auth)

components/
├── tasks/              # TaskDetailPanel, TaskBadges
├── dashboard/          # DashboardTaskList
└── layout/             # Sidebar, Navbar

lib/
├── hooks/              # useGoals, useTasks (TanStack Query)
├── validations/        # Zod schemas
└── prisma.ts           # Prisma client
```

## License

MIT
