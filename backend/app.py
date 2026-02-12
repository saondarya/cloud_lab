from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_socketio import SocketIO, emit, join_room, leave_room

import subprocess
import tempfile
import os
import pexpect
import uuid
import json
from datetime import datetime


app = Flask(__name__)
CORS(app)

socketio = SocketIO(app, cors_allowed_origins="*")

# In-memory storage for sessions (use Redis/DB in production)
sessions = {}
# Structure: { session_id: { files: {}, folder_structure: [], owner: str, created_at: str } }


# ============================
# COLLABORATION API
# ============================

@app.route("/api/session/create", methods=["POST"])
def create_session():
    """Create a new collaboration session"""
    session_id = str(uuid.uuid4())[:8]
    
    data = request.json
    files = data.get("files", {})
    folder_structure = data.get("folder_structure", [])
    folder_name = data.get("folder_name", "Workspace")
    current_file = data.get("current_file", None)
    
    sessions[session_id] = {
        "files": files,
        "folder_structure": folder_structure,
        "folder_name": folder_name,
        "owner": "user",
        "created_at": datetime.now().isoformat(),
        "current_file": current_file
    }
    
    return jsonify({
        "session_id": session_id,
        "share_url": f"http://localhost:5173?session={session_id}"
    })


@app.route("/api/session/<session_id>", methods=["GET"])
def get_session(session_id):
    """Get session data"""
    if session_id not in sessions:
        return jsonify({"error": "Session not found"}), 404
    
    return jsonify(sessions[session_id])


@app.route("/api/session/<session_id>/file", methods=["POST"])
def update_file(session_id):
    """Update a file in the session"""
    if session_id not in sessions:
        return jsonify({"error": "Session not found"}), 404
    
    data = request.json
    filename = data.get("filename")
    content = data.get("content")
    
    sessions[session_id]["files"][filename] = content
    
    # Broadcast to all connected clients
    socketio.emit("file_updated", {
        "filename": filename,
        "content": content
    }, room=session_id)
    
    return jsonify({"success": True})


# ============================
# IN-MEMORY STORAGE (Sessions)
# ============================

sessions = {}
# Structure: {
#   "session_id": {
#     "files": {"filename": "content"},
#     "currentFile": "filename",
#     "owner": "socket_id",
#     "viewers": ["socket_id1", "socket_id2"],
#     "created": timestamp
#   }
# }


# ============================
# CODE EXECUTION API (RUN)
# ============================

@app.route("/api/execute", methods=["POST"])
def execute_code():

    data = request.json

    code = data.get("code")
    language = data.get("language")

    if not code or not language:
        return jsonify({"error": "Code and language required"}), 400


    try:

        suffix = ""
        command = []


        # JavaScript
        if language == "javascript":
            suffix = ".js"
            command = ["node"]


        # Python
        elif language == "python":
            suffix = ".py"
            command = ["python3"]


        # C
        elif language == "c":
            suffix = ".c"


        # C++
        elif language == "cpp":
            suffix = ".cpp"


        # Java
        elif language == "java":
            suffix = ".java"


        else:
            return jsonify({"error": "Unsupported language"}), 400


        # Create temp file
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as f:
            f.write(code.encode())
            filename = f.name


        output = ""
        error = ""


        # JS / Python
        if language in ["javascript", "python"]:

            result = subprocess.run(
                command + [filename],
                capture_output=True,
                text=True,
                timeout=10
            )

            output = result.stdout
            error = result.stderr


        # C
        elif language == "c":

            exe = filename + ".out"

            compile = subprocess.run(
                ["gcc", filename, "-o", exe],
                capture_output=True,
                text=True
            )

            if compile.returncode != 0:
                error = compile.stderr

            else:

                run = subprocess.run(
                    [exe],
                    capture_output=True,
                    text=True,
                    timeout=10
                )

                output = run.stdout
                error = run.stderr


        # C++
        elif language == "cpp":

            exe = filename + ".out"

            compile = subprocess.run(
                ["g++", filename, "-o", exe],
                capture_output=True,
                text=True
            )

            if compile.returncode != 0:
                error = compile.stderr

            else:

                run = subprocess.run(
                    [exe],
                    capture_output=True,
                    text=True,
                    timeout=10
                )

                output = run.stdout
                error = run.stderr


        # Java
        elif language == "java":

            temp_dir = tempfile.mkdtemp()

            java_file = os.path.join(temp_dir, "Main.java")

            with open(java_file, "w") as f:
                f.write(code)


            compile = subprocess.run(
                ["javac", "Main.java"],
                cwd=temp_dir,
                capture_output=True,
                text=True
            )


            if compile.returncode != 0:

                error = compile.stderr

            else:

                run = subprocess.run(
                    ["java", "Main"],
                    cwd=temp_dir,
                    capture_output=True,
                    text=True,
                    timeout=10
                )

                output = run.stdout
                error = run.stderr


        # Cleanup
        for f in [filename, filename + ".out"]:
            if os.path.exists(f):
                os.remove(f)


        return jsonify({
            "output": output,
            "error": error
        })


    except Exception as e:

        return jsonify({"error": str(e)})



# ============================
# REAL TERMINAL (SHELL)
# ============================


# Start real shell (Mac/Linux)
shell = pexpect.spawn("/bin/zsh", encoding="utf-8")


@socketio.on("connect")
def connect():
    emit("output", "Connected to terminal\n")


@socketio.on("join_session")
def join_session(data):
    """Join a collaboration session"""
    session_id = data.get("session_id")
    
    print(f"Join request for session: {session_id}")
    print(f"Available sessions: {list(sessions.keys())}")
    
    if session_id in sessions:
        join_room(session_id)
        print(f"User joined session {session_id}")
        emit("session_joined", {
            "session_id": session_id,
            "files": sessions[session_id]["files"],
            "folder_structure": sessions[session_id]["folder_structure"],
            "folder_name": sessions[session_id].get("folder_name", "Workspace"),
            "current_file": sessions[session_id].get("current_file")
        })
        
        # Notify others
        emit("user_joined", {"message": "A user joined"}, room=session_id, include_self=False)
    else:
        print(f"Session {session_id} not found!")
        emit("error", {"message": "Session not found"})


@socketio.on("code_change")
def handle_code_change(data):
    """Real-time code synchronization"""
    session_id = data.get("session_id")
    filename = data.get("filename")
    content = data.get("content")
    
    if session_id in sessions:
        sessions[session_id]["files"][filename] = content
        
        # Broadcast to all except sender
        emit("code_update", {
            "filename": filename,
            "content": content
        }, room=session_id, include_self=False)


@socketio.on("file_opened")
def handle_file_opened(data):
    """Notify when someone opens a file"""
    session_id = data.get("session_id")
    filename = data.get("filename")
    
    emit("file_opened_by_user", {
        "filename": filename
    }, room=session_id, include_self=False)


@socketio.on("file_operation")
def handle_file_operation(data):
    """Handle file operations (create, rename, delete)"""
    session_id = data.get("session_id")
    operation = data.get("operation")
    
    if session_id not in sessions:
        return
    
    if operation == "create":
        filename = data.get("filename")
        sessions[session_id]["files"][filename] = ""
        sessions[session_id]["folder_structure"].append(filename)
        emit("file_created", {"filename": filename}, room=session_id, include_self=False)
        
    elif operation == "rename":
        old_name = data.get("oldName")
        new_name = data.get("newName")
        if old_name in sessions[session_id]["files"]:
            content = sessions[session_id]["files"].pop(old_name)
            sessions[session_id]["files"][new_name] = content
            sessions[session_id]["folder_structure"] = [
                new_name if f == old_name else f 
                for f in sessions[session_id]["folder_structure"]
            ]
        emit("file_renamed", {"oldName": old_name, "newName": new_name}, room=session_id, include_self=False)
        
    elif operation == "delete":
        filename = data.get("filename")
        if filename in sessions[session_id]["files"]:
            del sessions[session_id]["files"][filename]
            sessions[session_id]["folder_structure"].remove(filename)
        emit("file_deleted", {"filename": filename}, room=session_id, include_self=False)


@socketio.on("file_switched")
def handle_file_switched(data):
    """When owner switches files, notify collaborators"""
    session_id = data.get("session_id")
    filename = data.get("filename")
    content = data.get("content")
    
    if session_id in sessions:
        sessions[session_id]["current_file"] = filename
        emit("file_switched", {
            "filename": filename,
            "content": content
        }, room=session_id, include_self=False)


@socketio.on("leave_session")
def leave_session(data):
    """Leave a collaboration session"""
    session_id = data.get("session_id")
    leave_room(session_id)
    emit("user_left", {"message": "A user left"}, room=session_id)


@socketio.on("command")
def handle_command(cmd):

    try:

        shell.sendline(cmd)

        shell.expect(["% ", "$ ", "# "], timeout=1)

        output = shell.before

        emit("output", output)

    except Exception as e:

        emit("output", str(e))



# ============================
# START SERVER
# ============================

if __name__ == "__main__":

    print("Backend running on http://localhost:7009")

    socketio.run(
        app,
        host="0.0.0.0",
        port=7009,
        debug=False
    )
