# 🎬 Demo: Real-Time Collaboration

## Quick Demo Steps

### Setup (2 minutes)

1. **Terminal 1 - Start Backend:**
```bash
cd backend
python3 app.py
```
You should see: `Backend running on http://localhost:7009`

2. **Terminal 2 - Start Frontend:**
```bash
npm run dev
```
You should see: `Local: http://localhost:5173`

### Demo Scenario (5 minutes)

#### Part 1: Create a Workspace

1. Open `http://localhost:5173` in Chrome
2. Click **"📂 Open Folder"**
3. Select any folder with code files (or create a test folder)
4. You'll see files in the sidebar

#### Part 2: Share the Workspace

1. Click **"🔗 Share Workspace"** button
2. You'll see:
   - "LIVE" indicator in the header
   - Session ID displayed
   - Share URL copied to clipboard
   - Terminal shows the share URL

#### Part 3: Join as Collaborator

1. Open a **new incognito window** (or different browser)
2. Paste the share URL (e.g., `http://localhost:5173?session=abc123`)
3. You'll instantly see:
   - All files from the shared workspace
   - Same folder structure
   - "LIVE" indicator

#### Part 4: Real-Time Editing

**In Window 1 (Owner):**
- Open a file
- Start typing code

**In Window 2 (Collaborator):**
- Open the same file
- Watch the code appear in real-time!
- Start typing yourself

**Both windows:**
- See each other's changes within 500ms
- Changes are synchronized automatically

#### Part 5: Run Code Together

**Either window:**
1. Click **"▷ Run"** button
2. See output in terminal

**Both windows:**
- See the same output
- Can run code independently
- Results visible to all

### What You'll See

✅ **Real-time typing** - Like Google Docs
✅ **File synchronization** - All files shared
✅ **Live indicators** - Know when you're collaborating
✅ **Instant updates** - No refresh needed
✅ **Code execution** - Run and see results together

### Test Files to Try

Create a test folder with these files:

**test.py:**
```python
print("Hello from collaboration!")
for i in range(5):
    print(f"Count: {i}")
```

**test.js:**
```javascript
console.log("Real-time coding!");
for (let i = 0; i < 5; i++) {
    console.log(`Count: ${i}`);
}
```

### Expected Behavior

| Action | Owner Sees | Collaborator Sees |
|--------|-----------|-------------------|
| Owner types | Immediate | 500ms delay |
| Collaborator types | 500ms delay | Immediate |
| Owner runs code | Output instantly | Output instantly |
| User joins | "User joined" | Files load |
| User leaves | "User left" | - |

### Troubleshooting Demo

**"Session not found" error:**
- Backend might have restarted
- Create a new session

**Changes not syncing:**
- Check browser console for errors
- Verify backend is running
- Check network tab for WebSocket connection

**Can't run code:**
- Ensure Python/Node is installed
- Check backend terminal for errors

### Advanced Demo

**Multiple Collaborators:**
1. Open 3+ browser windows
2. All join the same session
3. Everyone can edit simultaneously
4. Changes sync to all windows

**File Operations:**
1. Right-click files
2. Rename/delete files
3. Create new files
4. All operations sync in real-time

### Clean Up

1. Click **"❌ Stop Sharing"** in any window
2. Session ends for everyone
3. Files remain on owner's computer

## 🎥 Video Demo Script

1. "Let me show you real-time collaboration"
2. Open folder, show files
3. Click Share, copy URL
4. Open incognito, paste URL
5. Type in one window, show it appearing in other
6. Run code, show output in both
7. "That's collaborative coding!"

## 💡 Demo Tips

- Use a simple Python/JS file for clarity
- Type slowly to show the sync effect
- Point out the "LIVE" indicator
- Show the session ID
- Demonstrate the 500ms sync delay
- Run code to show it works for everyone
