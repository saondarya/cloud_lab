# Cloud Lab - Real-Time Collaborative Code Editor

A Google Docs-style collaborative coding environment where you can share your workspace with others in real-time.

## 🚀 Quick Start

### 1. Install Backend Dependencies
```bash
cd backend
pip3 install -r requirements.txt
```

### 2. Install Frontend Dependencies
```bash
npm install
```

### 3. Start Backend
```bash
cd backend
python3 app.py
```

### 4. Start Frontend (in a new terminal)
```bash
npm run dev
```

### 5. Open Browser
Navigate to `http://localhost:5173`

## ✨ Features

### Code Editor
- Monaco Editor (VS Code's editor)
- Syntax highlighting for multiple languages
- File explorer with folder support
- Auto-save functionality
- Right-click context menu (rename, delete files)

### Real-Time Collaboration 🔗
- **Share your entire workspace** with a single link
- **Real-time code synchronization** - see changes as others type
- **Multiple users** can edit simultaneously
- **Live indicators** showing active collaboration
- **Instant file sharing** - all files accessible to collaborators

### Code Execution
- Run Python, JavaScript, C, C++, Java code
- Real-time output in terminal
- Error handling and display

## 🔗 How to Collaborate

### As the Owner:
1. Open a folder with your code files
2. Click **"🔗 Share Workspace"** in the sidebar
3. Share URL is automatically copied to clipboard
4. Send the URL to your collaborators

### As a Collaborator:
1. Open the shared URL (e.g., `http://localhost:5173?session=abc123`)
2. You'll see all files from the shared workspace
3. Edit any file - changes sync in real-time
4. Run code and see output

### Features During Collaboration:
- ✅ Real-time code editing (500ms sync)
- ✅ All files accessible
- ✅ Code execution works for everyone
- ✅ See when users join/leave
- ✅ Changes persist during the session

## 🎯 Use Cases

- **Pair Programming**: Code together in real-time
- **Code Review**: Share code and review together
- **Teaching**: Demonstrate code to students
- **Debugging**: Collaborate on fixing bugs
- **Interviews**: Conduct live coding interviews

## 📁 Project Structure

```
cloud_lab/
├── backend/
│   ├── app.py              # Flask + Socket.IO server
│   └── requirements.txt    # Python dependencies
├── src/
│   ├── App.jsx            # Main React component
│   ├── App.css            # Styles
│   └── main.jsx           # Entry point
├── public/
├── index.html
└── package.json
```

## 🛠️ Technologies

- **Frontend**: React, Monaco Editor, Socket.IO Client
- **Backend**: Flask, Flask-SocketIO, Python
- **Real-time**: WebSocket (Socket.IO)
- **Code Execution**: Subprocess (Python, Node, GCC, G++, Java)

## ⚠️ Important Notes

- Sessions are stored in memory (lost on server restart)
- No authentication - anyone with the link can access
- Designed for trusted collaborators
- For production, add authentication and persistent storage

## 🔧 Keyboard Shortcuts

- `Ctrl/Cmd + S` - Save file
- `Ctrl/Cmd + N` - New file
- Right-click on file - Context menu

## 📝 Supported Languages

- Python (.py)
- JavaScript (.js)
- TypeScript (.ts)
- C (.c)
- C++ (.cpp)
- Java (.java)

## 🐛 Troubleshooting

**Backend not starting?**
- Make sure Python 3 is installed
- Install dependencies: `pip3 install -r backend/requirements.txt`

**Frontend not connecting?**
- Check backend is running on port 7009
- Check browser console for errors

**Code not executing?**
- Ensure compilers are installed (gcc, g++, java, node, python3)
- Check terminal output for errors

## 📚 Learn More

See [COLLABORATION.md](COLLABORATION.md) for detailed collaboration documentation.

## 🎉 Example Workflow

```
1. User A opens folder with Python files
2. User A clicks "Share Workspace"
3. User A sends link to User B
4. User B opens link
5. Both see the same files
6. User B edits main.py
7. User A sees changes instantly
8. User A runs the code
9. Both see the output
```

Enjoy collaborative coding! 🚀
