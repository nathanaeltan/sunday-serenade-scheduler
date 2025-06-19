# Sunday Serenade Scheduler

A web application for managing worship team schedules, song rotations, and service planning for Sunday services. Built for Singapore churches, with support for manual overrides, swap requests, and a searchable song database.

---

## Features

- **Dynamic Sunday Schedule**: Auto-generates all Sundays for the current year, with 2-week team rotations.
- **Manual Mode**: Override the auto-rotation to assign teams to specific Sundays.
- **Swap Requests**: Request and approve swaps between teams for any Sunday.
- **Calendar View**: Visualize the schedule in a monthly calendar (Sundays only), or use the classic list view.
- **Song Management**: Add, edit, delete, and search a unique song database with links (YouTube, CCLI, etc.).
- **Song Schedule**: View and manage songs assigned to each Sunday, with fuzzy matching for song titles.
- **Special Dates**: Christmas (Dec 25) is always included as a special date, even if not a Sunday.
- **Singapore Timezone**: All dates and schedules are calculated in Singapore local time.
- **Firebase Integration**: Real-time sync and persistent storage using Firebase Realtime Database.

---

## Getting Started

### Prerequisites
- Node.js (v18+ recommended)
- npm or yarn
- Firebase project (Realtime Database enabled)

### Installation
1. **Clone the repository:**
   ```bash
   git clone <your-repo-url>
   cd sunday-serenade-scheduler
   ```
2. **Install dependencies:**
   ```bash
   npm install
   # or
   yarn install
   ```
3. **Firebase Setup:**
   - Create a Firebase project and enable Realtime Database.
   - Download your service account key as `serviceAccountKey.json` and place it in the project root.
   - Copy `.env.example` to `.env` and fill in your Firebase credentials.
   - See `FIREBASE_SETUP.md` for detailed instructions.

4. **Run the app locally:**
   ```bash
   npm run dev
   # or
   yarn dev
   ```
   The app will be available at `http://localhost:5173`.

---

## Usage

- **Schedule Tab**: View, assign, or swap teams for each Sunday. Toggle between List and Calendar views.
- **Manual Mode**: Click "Manual Mode" to override the auto-rotation and assign teams directly.
- **Calendar View**: Click "Calendar View" to see the schedule in a monthly grid. Only Sundays are interactive.
- **Songs Tab**: Manage your unique song list. Add, edit (with pencil icon), or delete (with trash icon) songs. Use the search bar to quickly find songs by title or link.
- **Song Schedule**: Click the "Songs" button for any Sunday to view the assigned songs and their links.


---

## Environment Variables

Copy `.env.example` to `.env` and fill in your Firebase credentials:
```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_DATABASE_URL=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

---

## Contributing

Pull requests are welcome! For major changes, please open an issue first to discuss what you would like to change.

---

## License

MIT