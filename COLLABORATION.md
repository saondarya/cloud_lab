# 🔗 Real-Time Collaboration Feature

## How It Works

This is a Google Docs-style real-time collaboration system for code editing.

### Features
- ✅ Share entire workspace with a single link
- ✅ Real-time code synchronization (like Google Docs)
- ✅ Multiple users can edit simultaneously
- ✅ See when users join/leave
- ✅ All files in the folder are shared
- ✅ Run code collaboratively

## Usage

### 1. Start the Backend
```bash
cd backend
python3 app.py
```

### 2. Start the Frontend
```bash
npm run dev
```

### 3. Share Your Workspace

1. Open a folder with your code files
2. Click **"🔗 Share Workspace"** button in the sidebar
3. A share URL will be generated and copied to clipboard
4. Share the URL with anyone (e.g., `http://localhost:5173?session=abc123`)

### 4. Collaborator Joins

1. Collaborator opens the shared URL
2. They see all your files automatically
3. They can:
   - View all files
   - Edit code in real-time
   - Run the code
   - See changes instantly

### 5. Real-Time Sync

- When you type, others see changes within 500ms
- When they type, you see their changes
- File selection is synchronized
- Terminal output is visible to all

### 6. Stop Sharing

Click **"❌ Stop Sharing"** to end the session

## Technical Details

- **Backend**: Flask + Socket.IO for WebSocket connections
- **Frontend**: React + Socket.IO Client
- **Storage**: In-memory (sessions lost on restart)
- **Sync Delay**: 500ms debounce for performance

## Production Considerations

For production use, you should:
- Use Redis or a database instead of in-memory storage
- Add authentication and permissions
- Implement user cursors/presence indicators
- Add conflict resolution for simultaneous edits
- Use operational transformation or CRDT for better sync
- Add SSL/TLS for secure connections
- Implement session expiration
- Add rate limiting

## Example Flow

```
User A (Owner):
1. Opens folder with files
2. Clicks "Share Workspace"
3. Gets URL: http://localhost:5173?session=abc123
4. Shares URL with User B

User B (Collaborator):
1. Opens the URL
2. Sees all files from User A's workspace
3. Can edit any file
4. Changes sync in real-time

Both users:
- See each other's edits instantly
- Can run code
- See terminal output
```

## Limitations

- Sessions are temporary (lost on server restart)
- No user authentication
- No permission controls
- No edit history/undo across users
- No cursor position sharing
