
# Video Editor Api

Backend for a video editor: upload videos, generate thumbnails, extract audio and resize with FFmpeg. Built with Express and TypeScript, with an optional cluster mode.

## Features

- Cookie-based login with file-backed sessions
- Video upload, streamed straight to disk (`mp4`, `mov`)
- Thumbnail and dimensions detected on upload
- One-time audio extraction
- Resizing through a sequential job queue that resumes unfinished jobs after a restart
- Cluster mode: one worker per CPU core, with resize jobs handled by the primary process

## Requirements

- Node.js 18+
- FFmpeg and FFprobe available in your `PATH`

## Getting started

```bash
npm install
```

Create these folders in the project root:

```
public/     # frontend files, served statically (index.html is used for /, /login and /profile)
storage/    # uploaded videos and generated assets
data/       # JSON files used as the database
```

The `data/` folder needs three files:

| File | Initial content |
| --- | --- |
| `data/users` | `[{"id":1,"name":"Liam Brown","username":"liam23","password":"string"}]` |
| `data/sessions` | `[]` |
| `data/videos` | `[]` |

Run the server on port 8060:

```bash
npm run dev            # development, restarts on changes
npm run dev:cluster    # development, cluster mode
```

Or build and run:

```bash
npm run build
npm start              # node dist/src/index.js
npm run start:cluster  # node dist/src/cluster.js
```

Run all commands from the project root, since `data/`, `storage/` and `public/` are resolved from the working directory.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | server with `tsx watch` |
| `npm run dev:cluster` | cluster mode with `tsx watch` |
| `npm run build` | compile to `dist/` |
| `npm start` | run the compiled server |
| `npm run start:cluster` | run the compiled cluster |
| `npm run typecheck` | type check only |

## API

| Method | Route | Auth | Description |
| --- | --- | --- | --- |
| `POST` | `/api/login` | no | log in, sets a `token` cookie |
| `DELETE` | `/api/logout` | yes | remove the session and clear the cookie |
| `GET` | `/api/user` | yes | username and name of the current user |
| `PUT` | `/api/user` | yes | update username, name and, optionally, password |
| `GET` | `/api/videos` | yes | videos uploaded by the current user |
| `POST` | `/api/upload-video` | yes | upload a video, file name passed in the `filename` header |
| `PATCH` | `/api/video/extract-audio?videoId=` | no | extract the audio track (once per video) |
| `PUT` | `/api/video/resize` | no | queue a resize, body: `{ "videoId", "width", "height" }` |
| `GET` | `/get-video-asset?videoId=&type=` | no | download an asset: `thumbnail`, `original`, `audio` or `resize` (add `&dimensions=160x120`) |

Example:

```bash
# log in and keep the cookie
curl -c cookies.txt -X POST -H "Content-Type: application/json" \
  -d '{"username":"liam23","password":"string"}' \
  http://localhost:8060/api/login

# upload a video
curl -b cookies.txt -X POST -H "filename: clip.mp4" \
  --data-binary @clip.mp4 http://localhost:8060/api/upload-video

# list videos
curl -b cookies.txt http://localhost:8060/api/videos
```

## Project structure

```
src/
├── index.ts           # Express app and error handler
├── cluster.ts         # cluster entry point
├── router.ts          # all routes
├── DB.ts              # JSON file database
├── types.ts           # shared types
├── express.d.ts       # adds req.userId to the Express request type
├── middleware/        # authentication and index.html routes
└── controllers/       # user and video handlers
lib/
├── FF.ts              # FFmpeg and FFprobe wrappers
├── JobQueue.ts        # sequential queue for resize jobs
└── util.ts            # file and folder helpers
```

Each upload gets its own folder:

```
storage/<videoId>/
├── original.mp4
├── thumbnail.jpg
├── audio.aac          # after extracting audio
└── 160x120.mp4        # after resizing
```

## Known limitations

- Authentication matches the exact `METHOD /url` string, so a query string (`/api/videos?x=1`) skips it.
- Requesting an asset that does not exist, for example the audio before it was extracted, crashes the server.
- The token is read as the first value of the `Cookie` header, so it only works when `token` is the only cookie.
- Passwords are stored in plain text and sessions live in a JSON file. This is demo-level security.
- Extract, resize and asset routes are not authenticated.
````
