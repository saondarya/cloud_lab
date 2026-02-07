from flask import Flask, request, jsonify
from flask_cors import CORS

from flask_socketio import SocketIO, emit

import subprocess
import tempfile
import os
import pexpect


app = Flask(__name__)
CORS(app)

socketio = SocketIO(app, cors_allowed_origins="*")


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
