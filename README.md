# EduTrack

EduTrack is a role-based online learning platform for students and instructors. Students browse and take courses, review learning materials, track progress, ask questions, and contact instructors. Instructors manage courses, lessons, PDFs, student questions, and teaching analytics.

## Features

### Students
- Browse, search, filter, and enroll in published courses.
- View lessons, quizzes, course notes, resources, and uploaded PDFs.
- Track course progress, learning activity, and analytics.
- Ask the course assistant questions grounded in lesson notes and extracted PDF text.
- Start a doubt conversation with a course instructor, follow up, attach links, and review replies.

### Instructors
- Create, edit, publish, and manage courses, lessons, quizzes, and learning resources.
- Upload PDF materials or provide a Google Drive/HTTPS link.
- Review and prioritize student doubts, reply, share references, and update session status.
- Review enrollment, student activity, completion, and course analytics.

### Platform
- JWT authentication with student, instructor, and admin roles.
- MongoDB persistence through Mongoose.
- Role-based API authorization and notification support.

## Technologies

- Frontend: React 18, React Router, Axios, Recharts, React Toastify
- Backend: Node.js, Express, Mongoose, Multer, `pdf-parse`
- Database: MongoDB
- Authentication: JWT and bcryptjs

## Prerequisites

- Node.js 18 or newer and npm
- MongoDB locally or a MongoDB Atlas database
- Optional: a Gemini or OpenAI API key for generated AI explanations

## Local Setup

1. Configure the backend environment:

   ```sh
   cd backend
   npm install
   cp .env.example .env
   ```

   On Windows Command Prompt, use `copy .env.example .env` instead of `cp`.

2. Edit `backend/.env` and set `MONGO_URI` and a long, unique `JWT_SECRET`. AI keys are optional; without one, the assistant returns relevant excerpts from course material and reports when it cannot find an answer.

3. Start the API from the repository root:

   ```sh
   npm --prefix backend run dev
   ```

   The API listens on port 5000 by default.

4. In another terminal, install and start the frontend:

   ```sh
   npm --prefix frontend install
   npm --prefix frontend start
   ```

   The frontend runs at <http://localhost:3000> and proxies API requests to <http://localhost:5000> in development.

5. Create a student or instructor account through the registration page. Demo data can be loaded with `node backend/seed.js` only in a disposable development database. **The seed script deletes existing users, courses, and progress before inserting demo data. Do not run it against data you need to keep.**

## Environment Variables

Set these in `backend/.env`. Do not commit that file.

| Variable | Required | Purpose |
| --- | --- | --- |
| `PORT` | No | API port; defaults to 5000. |
| `MONGO_URI` | Yes | MongoDB connection string. |
| `JWT_SECRET` | Yes | Long, random secret for signing authentication tokens. |
| `NODE_ENV` | No | Runtime mode, for example `development` or `production`. |
| `API_PUBLIC_URL` | For separate/public API hosts | Public base URL used when generating uploaded PDF links. |
| `GEMINI_API_KEY` | No | Enables Google Gemini responses for the course assistant. |
| `GEMINI_MODEL` | No | Gemini model name; defaults to `gemini-2.5-flash`. |
| `OPENAI_API_KEY` | No | Enables OpenAI responses if Gemini is not configured or unavailable. |
| `OPENAI_MODEL` | No | OpenAI model name; defaults to `gpt-4o-mini`. |

Use either AI provider or both. Provider keys remain on the backend and must never be added to frontend source or Git.

## Build and Verification

Build the production frontend:

```sh
npm --prefix frontend run build
```

Run the frontend test runner in CI mode:

```sh
npm --prefix frontend test -- --watchAll=false
```

The repository currently has no dedicated automated test files. Start the backend with `npm --prefix backend start` or `npm --prefix backend run dev` to verify its database connection and API startup.

## Deployment Notes

- Deploy the backend and frontend as separate services only after configuring the backend CORS origin for the deployed frontend. The current development CORS setting allows `http://localhost:3000`.
- Configure the frontend host and backend so `/api` requests reach the API. If the frontend and API use different public hosts, set `API_PUBLIC_URL` to the public API origin.
- Uploaded PDFs are stored on the backend filesystem. Use persistent storage or object storage in production; ephemeral application filesystems can discard uploads during redeploys.
- Set MongoDB and AI provider variables in the hosting provider's secret/environment settings, not in Git.
- The backend package's `start` script runs `node server.js`. The frontend package's `build` script creates the production static bundle.

## Repository Hygiene

`.gitignore` excludes environment files, uploaded PDFs, dependency folders, generated builds, logs, caches, and local editor/OS files. The `.env.example` file contains placeholder values and is safe to commit. Keep package manifests and lockfiles committed for reproducible installs.
