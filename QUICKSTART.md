# ⚡ Quick Start Guide

Get up and running in 5 minutes!

## Prerequisites

- Python 3.7+
- Node.js 14+
- Modern browser (Chrome/Edge recommended)

## Installation

### Option 1: Automated Setup

**macOS/Linux:**
```bash
./setup.sh
```

**Windows:**
```bash
setup.bat
```

### Option 2: Manual Setup

```bash
# Install backend dependencies
cd backend
pip3 install -r requirements.txt
cd ..

# Install frontend dependencies
npm install
```

## Running the Application

### Terminal 1 - Backend
```bash
cd backend
python3 app.py
```

Wait for: `Backend running on http://localhost:7009`

### Terminal 2 - Frontend
```bash
npm run dev
```

Wait for: `Local: http://localhost:5173`

### Browser
Open: `http://localhost:5173`

## First Steps

### 1. Open a Folder
- Click **"📂 Open Folder"**
- Select a folder with code files
- Files appear in sidebar

### 2. Edit Code
- Click any file to open
- Start typing
- Auto-saves after 1.2 seconds

### 3. Run Code
- Click **"▷ Run"** button
- See output in terminal

## Collaboration in 30 Seconds

### Share Your Workspace

1. Open a folder
2. Click **"🔗 Share Workspace"**
3. URL is copied to clipboard
4. Send URL to collaborator

### Join a Workspace

1. Receive share URL
2. Open URL in browser
3. See all files instantly
4. Start editing together!

## Example Test

Create a test folder with this file:

**test.py:**
```python
print("Hello, World!")
print("Collaboration works!")
```

1. Open the folder
2. Click test.py
3. Click Run
4. See output!

## Troubleshooting

**Backend won't start?**
```bash
pip3 install flask flask-cors flask-socketio pexpect
```

**Frontend won't start?**
```bash
npm install
```

**Can't run code?**
- Install Python: `python3 --version`
- Install Node: `node --version`

**Collaboration not working?**
- Check backend is running
- Check browser console (F12)
- Try refreshing the page

## Next Steps

- Read [README.md](README.md) for full documentation
- Try [DEMO.md](DEMO.md) for a guided demo
- Check [FEATURES.md](FEATURES.md) for all features
- See [COLLABORATION.md](COLLABORATION.md) for collaboration details

## Common Commands

```bash
# Start backend
cd backend && python3 app.py

# Start frontend
npm run dev

# Install dependencies
pip3 install -r backend/requirements.txt
npm install

# Check versions
python3 --version
node --version
npm --version
```

## Quick Tips

- Use Ctrl/Cmd + S to save
- Right-click files for options
- Share URL is auto-copied
- Changes sync in 500ms
- Sessions are temporary

## Support

Having issues? Check:
1. Both backend and frontend are running
2. No port conflicts (7009, 5173)
3. Browser console for errors
4. Backend terminal for errors

## That's It! 🎉

You're ready to code collaboratively!

Open `http://localhost:5173` and start coding!
