import { useState, useEffect, useRef } from "react";
import Editor from "@monaco-editor/react";
import axios from "axios";
import io from "socket.io-client";


const menuItemStyle = {
  padding: "8px 14px",
  cursor: "pointer",
  color: "white",
  whiteSpace: "nowrap"
};

function FolderNode({ name, handle, openFile, currentFile, setMenu }) {

  const [open, setOpen] = useState(true);
  const [children, setChildren] = useState([]);

  useEffect(() => {

    const load = async () => {

      const list = [];

      for await (const entry of handle.values()) {
        list.push(entry);
      }

      setChildren(list);
    };

    load();

  }, [handle]);


  return (
    <div className="folder">

      {/* Folder Row */}
      <div
        className="folder-row"
        onClick={() => setOpen(!open)}
      >

        <span className="arrow">
          {open ? "⌄" : "▶"}
        </span>

        📁 {name}

      </div>


      {/* Children */}
      {open && (

        <div className="folder-children">

          {children.map((item) => (

            item.kind === "directory" ? (

              <FolderNode
                key={item.name}
                name={item.name}
                handle={item}
                openFile={openFile}
                currentFile={currentFile}
                setMenu={setMenu}
              />

            ) : (

              <div
                key={item.name}
                className={
                  "file " +
                  (currentFile === item.name ? "active" : "")
                }
                onClick={() => openFile(item.name)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setMenu({
                    visible: true,
                    x: e.clientX,
                    y: e.clientY,
                    file: item.name
                  });
                }}
              >

                📄 {item.name}

              </div>

            )

          ))}

        </div>

      )}

    </div>
  );
}


function App() {

  /* ================= STATES ================= */

  const [code, setCode] = useState("// Write code here");
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");
  const [running, setRunning] = useState(false);

  const [directoryHandle, setDirectoryHandle] = useState(null);
  const [files, setFiles] = useState([]);
  const [currentFile, setCurrentFile] = useState(null);

  // Collaboration states
  const [sessionId, setSessionId] = useState(null);
  const [shareUrl, setShareUrl] = useState("");
  const [isCollaborating, setIsCollaborating] = useState(false);
  const socketRef = useRef(null);
  const isRemoteUpdate = useRef(false);
  const sessionFilesRef = useRef({}); // Store session files for collaborators

  /* ================= CONTEXT MENU ================= */

  const [menu, setMenu] = useState({
    visible: false,
    x: 0,
    y: 0,
    file: null
  });

  /* ================= COLLABORATION - SETUP SOCKET ================= */

  useEffect(() => {
    console.log("Setting up socket connection...");
    
    // Prevent multiple connections
    if (socketRef.current?.connected) {
      console.log("Socket already connected, skipping setup");
      return;
    }
    
    socketRef.current = io("http://localhost:7009");
    
    socketRef.current.on("connect", () => {
      console.log("Socket connected!");
      
      // Check if there's a session in URL after connection
      const params = new URLSearchParams(window.location.search);
      const session = params.get("session");
      
      if (session) {
        console.log("Auto-joining session from URL:", session);
        socketRef.current.emit("join_session", { session_id: session });
      }
    });
    
    socketRef.current.on("session_joined", (data) => {
      console.log("=== SESSION JOINED ===");
      console.log("Session ID:", data.session_id);
      console.log("Files received:", data.files);
      console.log("File names:", Object.keys(data.files));
      
      setIsCollaborating(true);
      setSessionId(data.session_id);
      
      // Store all files in ref for collaborators
      sessionFilesRef.current = data.files;
      
      // Get all file names
      const fileList = Object.keys(data.files);
      setFiles(fileList);
      
      console.log("Files set to state:", fileList);
      
      // Open the same file the owner has open
      const fileToOpen = data.current_file || fileList[0];
      console.log("Opening file:", fileToOpen);
      
      if (fileToOpen && data.files[fileToOpen] !== undefined) {
        setCurrentFile(fileToOpen);
        setCode(data.files[fileToOpen]);
        console.log("File opened successfully. Content length:", data.files[fileToOpen].length);
      } else {
        console.error("File not found:", fileToOpen);
      }
      
      // Create a simple virtual directory handle for collaborators
      setDirectoryHandle({
        name: data.folder_name || "Shared Workspace",
        kind: "directory",
        isVirtual: true,
        values: async function* () {
          console.log("Generating virtual directory entries");
          for (const filename of fileList) {
            console.log("Yielding file:", filename);
            yield {
              name: filename,
              kind: "file"
            };
          }
        }
      });
      
      setOutput(`✅ Joined collaboration session: ${data.session_id}\n\n📝 You can now edit files in real-time!\nChanges will sync to all participants.`);
    });
    
    socketRef.current.on("error", (data) => {
      console.error("Socket error:", data);
      setError(`❌ ${data.message}`);
    });
    
    socketRef.current.on("code_update", (data) => {
      console.log("Received code update:", data.filename, "Content length:", data.content.length);
      
      // Update session files
      sessionFilesRef.current[data.filename] = data.content;
      
      if (data.filename === currentFile) {
        isRemoteUpdate.current = true;
        setCode(data.content);
        
        // If we have directory handle (owner), save the changes IMMEDIATELY
        if (directoryHandle && !directoryHandle.isVirtual) {
          console.log("Owner saving collaborator's changes to disk");
          saveFileContent(data.filename, data.content);
        }
      }
      
      // Update in-memory files for collaborators
      setFiles(prevFiles => {
        if (!prevFiles.includes(data.filename)) {
          return [...prevFiles, data.filename];
        }
        return prevFiles;
      });
    });
    
    socketRef.current.on("user_joined", () => {
      setOutput("👤 A user joined the session");
    });
    
    socketRef.current.on("user_left", () => {
      setOutput("👤 A user left the session");
    });
    
    socketRef.current.on("file_created", (data) => {
      setFiles(prevFiles => {
        if (!prevFiles.includes(data.filename)) {
          return [...prevFiles, data.filename];
        }
        return prevFiles;
      });
      setOutput(`📄 ${data.filename} was created`);
    });
    
    socketRef.current.on("file_deleted", (data) => {
      setFiles(prevFiles => prevFiles.filter(f => f !== data.filename));
      if (currentFile === data.filename) {
        setCurrentFile(null);
        setCode("");
      }
      setOutput(`🗑️ ${data.filename} was deleted`);
    });
    
    socketRef.current.on("file_renamed", (data) => {
      setFiles(prevFiles => 
        prevFiles.map(f => f === data.oldName ? data.newName : f)
      );
      if (currentFile === data.oldName) {
        setCurrentFile(data.newName);
      }
      setOutput(`✏️ ${data.oldName} renamed to ${data.newName}`);
    });
    
    socketRef.current.on("file_switched", (data) => {
      // Update session files
      sessionFilesRef.current[data.filename] = data.content;
      
      // When owner switches files, collaborators follow
      setCurrentFile(data.filename);
      setCode(data.content);
      setOutput(`📄 Owner opened ${data.filename}`);
    });
    
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []); // Empty dependency array - only run once on mount

  /* ================= COLLABORATION - SYNC CODE CHANGES ================= */

  useEffect(() => {
    if (isCollaborating && sessionId && currentFile && !isRemoteUpdate.current) {
      const timer = setTimeout(() => {
        console.log("Sending code change:", currentFile, code.substring(0, 50));
        socketRef.current?.emit("code_change", {
          session_id: sessionId,
          filename: currentFile,
          content: code
        });
        
        // Also save to local file if we have directory handle (owner only)
        if (directoryHandle && !directoryHandle.isVirtual) {
          saveFile();
        }
      }, 500);
      
      return () => clearTimeout(timer);
    }
    
    isRemoteUpdate.current = false;
  }, [code, isCollaborating, sessionId, currentFile]);

  /* ================= RESTORE FOLDER PERMISSION ================= */

  useEffect(() => {

    // Don't restore if there's a session in URL (collaborator joining)
    const params = new URLSearchParams(window.location.search);
    if (params.get("session")) {
      return;
    }

    // DISABLED: Auto-restore feature
    // Uncomment below to enable auto-restore of last opened folder
    /*
    const restore = async () => {

      const req = indexedDB.open("fs-db", 1);

      req.onupgradeneeded = () => {
        req.result.createObjectStore("handles");
      };

      req.onsuccess = async () => {

        const db = req.result;

        const getReq = db
          .transaction("handles", "readonly")
          .objectStore("handles")
          .get("dir");

        getReq.onsuccess = async () => {

          const dir = getReq.result;

          if (!dir) return;

          const perm = await dir.queryPermission({
            mode: "readwrite"
          });

          if (perm !== "granted") return;

          setDirectoryHandle(dir);

          const list = [];

          for await (const e of dir.values()) {
            if (e.kind === "file") list.push(e.name);
          }

          setFiles(list);

          setOutput("📂 Folder restored");

        };
      };
    };

    restore();
    */

  }, []);


  /* ================= COLLABORATION - CREATE SESSION ================= */

  const createSession = async () => {
    try {
      if (!directoryHandle) {
        setError("❌ Open a folder first");
        return;
      }
      
      // Collect all files recursively with full paths
      const filesData = {};
      const folderStructure = [];
      
      const collectFiles = async (handle, path = "") => {
        for await (const entry of handle.values()) {
          const fullPath = path ? `${path}/${entry.name}` : entry.name;
          
          if (entry.kind === "file") {
            try {
              const file = await entry.getFile();
              const content = await file.text();
              // Store with just filename for flat structure, or fullPath for nested
              const key = entry.name; // Use just filename for now
              filesData[key] = content;
              folderStructure.push({ name: key, type: "file" });
              console.log("Added file:", key, "Content length:", content.length);
            } catch (e) {
              console.error("Error reading file:", fullPath, e);
            }
          } else if (entry.kind === "directory") {
            folderStructure.push({ name: fullPath, type: "directory" });
            await collectFiles(entry, fullPath);
          }
        }
      };
      
      await collectFiles(directoryHandle);
      
      console.log("Total files collected:", Object.keys(filesData).length);
      console.log("Files:", Object.keys(filesData));
      
      const res = await axios.post("http://localhost:7009/api/session/create", {
        files: filesData,
        folder_structure: folderStructure,
        folder_name: directoryHandle.name,
        current_file: currentFile
      });
      
      setSessionId(res.data.session_id);
      setShareUrl(res.data.share_url);
      setIsCollaborating(true);
      
      // Join the session
      socketRef.current?.emit("join_session", {
        session_id: res.data.session_id
      });
      
      setOutput(`✅ Session created! Share this URL:\n${res.data.share_url}`);
      
      // Copy to clipboard
      navigator.clipboard.writeText(res.data.share_url);
      
      // Show notification
      setTimeout(() => {
        setOutput(`📋 Share URL copied to clipboard!\n${res.data.share_url}\n\nAnyone with this link can view and edit your files in real-time.`);
      }, 100);
      
    } catch (e) {
      setError("❌ Failed to create session");
      console.error(e);
    }
  };

  /* ================= COLLABORATION - JOIN SESSION ================= */

  const joinSession = (session_id) => {
    socketRef.current?.emit("join_session", { session_id });
  };

  /* ================= COLLABORATION - STOP SESSION ================= */

  const stopSession = () => {
    if (socketRef.current && sessionId) {
      socketRef.current.emit("leave_session", { session_id: sessionId });
    }
    setIsCollaborating(false);
    setSessionId(null);
    setShareUrl("");
    setOutput("❌ Collaboration stopped");
  };

  /* ================= CLEAR WORKSPACE ================= */

  const clearWorkspace = async () => {
    // Clear IndexedDB
    const req = indexedDB.open("fs-db", 1);
    req.onsuccess = () => {
      const db = req.result;
      const tx = db.transaction("handles", "readwrite");
      tx.objectStore("handles").clear();
    };
    
    // Clear state
    setDirectoryHandle(null);
    setFiles([]);
    setCurrentFile(null);
    setCode("// Write code here");
    setIsCollaborating(false);
    setSessionId(null);
    setShareUrl("");
    setOutput("🔄 Workspace cleared");
  };

  /* ================= OPEN FOLDER ================= */

  const openFolder = async () => {
    try {
      const dir = await window.showDirectoryPicker({
        mode: "readwrite"
      });

      // Request write permission
      const perm = await dir.requestPermission({
        mode: "readwrite"
      });

      if (perm !== "granted") {
        setError("❌ Write permission denied");
        return;
      }

      setDirectoryHandle(dir);
      // Save handle persistently
      const req = indexedDB.open("fs-db", 1);

      req.onupgradeneeded = () => {
        req.result.createObjectStore("handles");
      };

      req.onsuccess = () => {

        const db = req.result;

        const store = db
          .transaction("handles", "readwrite")
          .objectStore("handles");

        store.put(structuredClone(dir), "dir");
      };


      // Store in memory (browser keeps reference)
      window._lastDir = dir;


      const list = [];

      for await (const entry of dir.values()) {
        if (entry.kind === "file") {
          list.push(entry.name);
        }
      }

      setFiles(list);

      setOutput("📂 Folder opened (read/write)");
      setError("");

    } catch (e) {
      console.error(e);
      setError("❌ Folder access cancelled");
    }
    // Save handle to IndexedDB
  // Save directory handle (persistent)
  const req = indexedDB.open("fs-db", 1);

  req.onupgradeneeded = () => {
    req.result.createObjectStore("handles");
  };

  req.onsuccess = () => {

    const db = req.result;

    const tx = db
      .transaction("handles", "readwrite")
      .objectStore("handles");

    // IMPORTANT: structuredClone
    tx.put(structuredClone(dir), "dir");
  };


  };



  /* ================= OPEN FILE ================= */

  /* ================= OPEN FILE ================= */

  const openFile = async (name) => {
    console.log("=== OPEN FILE CALLED ===");
    console.log("File name:", name);
    console.log("Current file:", currentFile);
    console.log("Directory handle exists:", !!directoryHandle);
    console.log("Is virtual:", directoryHandle?.isVirtual);
    console.log("Is collaborating:", isCollaborating);
    console.log("Session files:", Object.keys(sessionFilesRef.current));
    
    try {
      // For collaborators (virtual directory)
      if (directoryHandle && directoryHandle.isVirtual) {
        console.log(">>> Collaborator path");
        const content = sessionFilesRef.current[name];
        console.log("File found in session:", content !== undefined);
        console.log("Content length:", content?.length);
        
        if (content !== undefined) {
          console.log("Setting state...");
          setCurrentFile(name);
          setCode(content);
          setOutput(`📄 Opened ${name}`);
          setError("");
          console.log("✅ File opened successfully!");
          return;
        } else {
          const error = `File ${name} not found. Available: ${Object.keys(sessionFilesRef.current).join(', ')}`;
          console.error("❌", error);
          setError(`❌ ${error}`);
          return;
        }
      }
      
      // For owner (real directory)
      if (!directoryHandle) {
        console.error("❌ No directory handle");
        setError("❌ No directory handle");
        return;
      }

      console.log(">>> Owner path");
      console.log("Getting file handle for:", name);
      
      const fileHandle = await directoryHandle.getFileHandle(name);
      console.log("File handle obtained");
      
      const file = await fileHandle.getFile();
      console.log("File object obtained, size:", file.size);
      
      const text = await file.text();
      console.log("File read successfully, length:", text.length);
      
      setCurrentFile(name);
      setCode(text);
      setOutput(`📄 Opened ${name}`);
      setError("");
      console.log("✅ File opened successfully!");

      // Notify collaborators when owner switches files
      if (isCollaborating && sessionId) {
        console.log("Notifying collaborators...");
        socketRef.current?.emit("file_switched", {
          session_id: sessionId,
          filename: name,
          content: text
        });
      }

    } catch (e) {
      console.error("❌ Error opening file:", e);
      console.error("Error details:", e.message, e.stack);
      setError(`❌ Cannot open file: ${e.message}`);
    }
  };


  /* ================= SAVE FILE ================= */

  const saveFile = async () => {
    try {
      if (!directoryHandle || !currentFile || directoryHandle.isVirtual) return;

      let fileHandle;
      
      // Handle nested paths
      if (currentFile.includes('/')) {
        const parts = currentFile.split('/');
        let currentHandle = directoryHandle;
        
        // Navigate through directories
        for (let i = 0; i < parts.length - 1; i++) {
          currentHandle = await currentHandle.getDirectoryHandle(parts[i]);
        }
        
        // Get the file
        fileHandle = await currentHandle.getFileHandle(
          parts[parts.length - 1],
          { create: true }
        );
      } else {
        fileHandle = await directoryHandle.getFileHandle(
          currentFile,
          { create: true }
        );
      }

      const writable = await fileHandle.createWritable();
      await writable.write(code);
      await writable.close();

      setError("");

    } catch (e) {
      console.error("Save failed:", e);
      // Don't show error for collaborators
      if (!directoryHandle?.isVirtual) {
        setError("❌ Save failed");
      }
    }
  };

  /* ================= SAVE FILE CONTENT (HELPER) ================= */

  const saveFileContent = async (filename, content) => {
    try {
      if (!directoryHandle) return;

      const fileHandle =
        await directoryHandle.getFileHandle(
          filename,
          { create: true }
        );

      const writable =
        await fileHandle.createWritable();

      await writable.write(content);
      await writable.close();

    } catch (e) {
      console.error("Failed to save file:", e);
    }
  };


  /* ================= LANGUAGE DETECTOR ================= */

  const detectLanguage = (file) => {

    if (!file) return "javascript";

    if (file.endsWith(".py")) return "python";
    if (file.endsWith(".java")) return "java";
    if (file.endsWith(".cpp")) return "cpp";
    if (file.endsWith(".c")) return "c";
    if (file.endsWith(".js")) return "javascript";
    if (file.endsWith(".ts")) return "typescript";

    return "text";
  };


  /* ================= RUN CODE ================= */

  const runCode = async () => {

    if (!currentFile) {
      setError("❌ Open a file first");
      return;
    }

    setRunning(true);
    setOutput("");
    setError("");

    try {
      const res = await axios.post(
        "http://localhost:7009/api/execute",
        {
          code,
          language: detectLanguage(currentFile)
        }
      );

      if (res.data.error) {
        setError(res.data.error);
      } else {
        setOutput(res.data.output || "✔ Done");
      }

    } catch {
      setError("❌ Backend not reachable");
    }

    setRunning(false);
  };


  /* ================= CTRL+S HANDLER ================= */

  useEffect(() => {

    const handler = (e) => {

      // Save
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        saveFile();
      }

      // New File
      if ((e.ctrlKey || e.metaKey) && e.key === "n") {
        e.preventDefault();
        createNewFile();
      }
    };

    window.addEventListener("keydown", handler);

    return () => {
      window.removeEventListener("keydown", handler);
    };

  }, [code, currentFile, directoryHandle]);

  /* ================= CLOSE MENU ON CLICK ================= */

  useEffect(() => {

    const close = () => {
      setMenu({ visible: false });
    };

    window.addEventListener("click", close);

    return () => window.removeEventListener("click", close);

  }, []);

  /* ================= AUTO SAVE ================= */

  useEffect(() => {
    console.log("Auto-save check:", { currentFile, hasDirectoryHandle: !!directoryHandle, isVirtual: directoryHandle?.isVirtual });

    if (!currentFile) return;

    const timer = setTimeout(() => {
      console.log("Auto-save triggered for:", currentFile);
      // Only auto-save for owner with real directory handle
      if (directoryHandle && !directoryHandle.isVirtual) {
        console.log("Saving to disk...");
        saveFile();
      } else {
        console.log("Skipping save (collaborator or no directory)");
      }
      // For collaborators, changes are already synced via socket
    }, 1200); // 1.2 seconds after typing stops

    return () => clearTimeout(timer);

  }, [code, currentFile, directoryHandle]);


  /* ================= OPEN SINGLE FILE ================= */

  const openSingleFile = async () => {
    try {
      const [fileHandle] = await window.showOpenFilePicker();

      const file = await fileHandle.getFile();

      const text = await file.text();

      const name = file.name;

      // Add to sidebar if not already there
      setFiles((prev) =>
        prev.includes(name) ? prev : [...prev, name]
      );

      setCurrentFile(name);
      setCode(text);

      // Store fake directory handle for saving
      setDirectoryHandle({
        getFileHandle: async () => fileHandle
      });

      setOutput(`📄 Opened ${name}`);
      setError("");

    } catch {
      setError("❌ File open cancelled");
    }
  };

  /* ================= CREATE NEW FILE ================= */

  const createNewFile = async () => {
    try {

      if (!directoryHandle) {
        setError("❌ Open a folder first");
        return;
      }

      const name = prompt("Enter new file name:");

      if (!name) return;

      const fileHandle =
        await directoryHandle.getFileHandle(name, {
          create: true
        });

      const writable =
        await fileHandle.createWritable();

      await writable.write("");
      await writable.close();

      // Add to sidebar
      setFiles((prev) =>
        prev.includes(name) ? prev : [...prev, name]
      );

      setCurrentFile(name);
      setCode("");

      setOutput(`✅ Created ${name}`);
      setError("");

      // Broadcast to collaborators
      if (isCollaborating && sessionId) {
        socketRef.current?.emit("file_operation", {
          session_id: sessionId,
          operation: "create",
          filename: name
        });
      }

    } catch {
      setError("❌ File creation failed");
    }
  };

  /* ================= RENAME FILE ================= */

  const renameFile = async (oldName) => {
    try {

      if (!directoryHandle) return;

      const newName = prompt("Rename file:", oldName);

      if (!newName || newName === oldName) return;

      const oldHandle =
        await directoryHandle.getFileHandle(oldName);

      const file = await oldHandle.getFile();

      const content = await file.text();

      // Create new file
      const newHandle =
        await directoryHandle.getFileHandle(newName, {
          create: true
        });

      const writable =
        await newHandle.createWritable();

      await writable.write(content);
      await writable.close();

      // Delete old file
      await directoryHandle.removeEntry(oldName);

      // Update UI
      setFiles((prev) =>
        prev.map((f) =>
          f === oldName ? newName : f
        )
      );

      setCurrentFile(newName);

      setOutput(`✏️ Renamed to ${newName}`);
      setError("");

      // Broadcast to collaborators
      if (isCollaborating && sessionId) {
        socketRef.current?.emit("file_operation", {
          session_id: sessionId,
          operation: "rename",
          oldName: oldName,
          newName: newName
        });
      }

    } catch {
      setError("❌ Rename failed");
    }
  };

  /* ================= DELETE FILE ================= */

  const deleteFile = async (name) => {
    try {

      if (!directoryHandle) return;

      const ok = window.confirm(
        `Delete ${name}?`
      );

      if (!ok) return;

      await directoryHandle.removeEntry(name);

      setFiles((prev) =>
        prev.filter((f) => f !== name)
      );

      if (currentFile === name) {
        setCurrentFile(null);
        setCode("");
      }

      setOutput(`🗑️ Deleted ${name}`);
      setError("");

      // Broadcast to collaborators
      if (isCollaborating && sessionId) {
        socketRef.current?.emit("file_operation", {
          session_id: sessionId,
          operation: "delete",
          filename: name
        });
      }

    } catch {
      setError("❌ Delete failed");
    }
  };


  /* ================= UI ================= */

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        background: "#1e1e1e",
        color: "white",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
      }}
    >
      {/* ================= SIDEBAR ================= */}
      <div
        className="sidebar"
        style={{
          width: "260px",
          flexShrink: 0,
          background: "#252526",
          borderRight: "1px solid #333",
          display: "flex",
          flexDirection: "column"
        }}
      >


        {/* HEADER */}
        <div
          className="sidebar-header"
          style={{
            padding: "12px 16px",
            fontSize: "11px",
            fontWeight: "600",
            letterSpacing: "0.5px",
            color: "#ccc",
            borderBottom: "1px solid #333",
            textTransform: "uppercase",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}
        >
          <span>Explorer</span>
          {isCollaborating && (
            <span style={{ 
              background: "#0e639c", 
              padding: "2px 8px", 
              borderRadius: "3px",
              fontSize: "10px"
            }}>
              🔗 LIVE
            </span>
          )}
        </div>

        {/* ================= NO FOLDER (WELCOME) ================= */}
        {!directoryHandle && (
          <div
            className="welcome"
            style={{
              padding: "20px 16px",
              display: "flex",
              flexDirection: "column",
              gap: "12px"
            }}
          >
            <h3 style={{ margin: "0 0 8px 0", fontSize: "14px", fontWeight: "500" }}>
              Get Started
            </h3>

            <button
              onClick={createNewFile}
              style={{
                background: "#0e639c",
                color: "white",
                border: "none",
                padding: "10px 14px",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "13px",
                textAlign: "left",
                transition: "background 0.2s"
              }}
            >
              ➕ New File
            </button>

            <button
              onClick={openSingleFile}
              style={{
                background: "#0e639c",
                color: "white",
                border: "none",
                padding: "10px 14px",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "13px",
                textAlign: "left",
                transition: "background 0.2s"
              }}
            >
              📄 Open File
            </button>

            <button
              onClick={openFolder}
              style={{
                background: "#0e639c",
                color: "white",
                border: "none",
                padding: "10px 14px",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "13px",
                textAlign: "left",
                transition: "background 0.2s"
              }}
            >
              📂 Open Folder
            </button>
          </div>
        )}

        {/* ================= COLLABORATION CONTROLS ================= */}
        {directoryHandle && !isCollaborating && (
          <div style={{ padding: "12px 16px", borderBottom: "1px solid #333" }}>
            <button
              onClick={createSession}
              style={{
                background: "#0e639c",
                color: "white",
                border: "none",
                padding: "8px 12px",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "12px",
                width: "100%",
                fontWeight: "500",
                marginBottom: "8px"
              }}
            >
              🔗 Share Workspace
            </button>
            <button
              onClick={clearWorkspace}
              style={{
                background: "#555",
                color: "white",
                border: "none",
                padding: "8px 12px",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "12px",
                width: "100%",
                fontWeight: "500"
              }}
            >
              ✖️ Close Workspace
            </button>
          </div>
        )}

        {isCollaborating && (
          <div style={{ padding: "12px 16px", borderBottom: "1px solid #333" }}>
            <div style={{ 
              fontSize: "11px", 
              color: "#4ec9b0", 
              marginBottom: "8px",
              wordBreak: "break-all"
            }}>
              Session: {sessionId}
            </div>
            <button
              onClick={stopSession}
              style={{
                background: "#d32f2f",
                color: "white",
                border: "none",
                padding: "8px 12px",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "12px",
                width: "100%",
                fontWeight: "500"
              }}
            >
              ❌ Stop Sharing
            </button>
          </div>
        )}


        {/* ================= FOLDER OPENED ================= */}
        {directoryHandle && (
          <div
            className="explorer"
            style={{
              flex: 1,
              overflow: "auto",
              padding: "8px"
            }}
          >
            <div>
              <div style={{ 
                padding: "6px 8px", 
                fontSize: "13px", 
                color: "#ccc",
                fontWeight: "500"
              }}>
                📁 {directoryHandle.name}
              </div>
              
              <div style={{ padding: "8px", color: "#888", fontSize: "11px" }}>
                Files: {files.length}
              </div>
              
              {files.map((filename) => (
                <button
                  key={filename}
                  onClick={() => openFile(filename)}
                  style={{
                    display: "block",
                    width: "100%",
                    textAlign: "left",
                    padding: "8px 12px",
                    margin: "4px 0",
                    background: currentFile === filename ? "#094771" : "transparent",
                    color: "white",
                    border: "1px solid #444",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontSize: "13px"
                  }}
                >
                  📄 {filename}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ================= MAIN AREA ================= */}
      <div
        className="editor-container"
        style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          minWidth: 0,
          minHeight: 0,
          overflow: "hidden",
          position: "relative"
        }}
      >
        {/* Run Button - Floating */}
        <button
          onClick={runCode}
          disabled={running}
          style={{
            position: "absolute",
            top: "16px",
            right: "16px",
            zIndex: 10,
            background: running ? "#555" : "#0e639c",
            color: "white",
            border: "none",
            padding: "8px 18px",
            borderRadius: "4px",
            cursor: running ? "not-allowed" : "pointer",
            fontSize: "13px",
            fontWeight: "500",
            transition: "background 0.2s",
            boxShadow: "0 2px 8px rgba(0,0,0,0.3)"
          }}
        >
          {running ? "⏳ Running..." : "▷ Run"}
        </button>




        {/* ================= EDITOR ================= */}
        <div
          style={{
            flex: 1,
            minHeight: 0,
            display: "flex",
            flexDirection: "column",
            background: "#1e1e1e"
          }}
        >
          <Editor
            height="100%"
            theme="vs-dark"
            language={detectLanguage(currentFile)}
            value={code}
            onChange={(v) => setCode(v || "")}
            options={{
              fontSize: 14,
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              padding: { top: 16, bottom: 16 }
            }}
          />
        </div>


        {/* ================= TERMINAL ================= */}
        <div
          className="terminal"
          style={{
            height: "180px",
            flexShrink: 0,
            background: "#1e1e1e",
            borderTop: "1px solid #333",
            display: "flex",
            flexDirection: "column"
          }}
        >
          {/* Header */}
          <div
            style={{
              height: "32px",
              borderBottom: "1px solid #333",
              display: "flex",
              alignItems: "center",
              paddingLeft: "16px",
              fontSize: "11px",
              fontWeight: "600",
              letterSpacing: "0.5px",
              color: "#ccc",
              textTransform: "uppercase",
              background: "#252526"
            }}
          >
            Terminal
          </div>

          {/* Output Area */}
          <div
            style={{
              flex: 1,
              overflow: "auto",
              padding: "12px 16px",
              fontFamily: "'Courier New', monospace",
              fontSize: "13px",
              lineHeight: "1.6"
            }}
          >
            {error && (
              <pre style={{ color: "#f48771", margin: 0, whiteSpace: "pre-wrap" }}>
                {error}
              </pre>
            )}

            {output && (
              <pre style={{ color: "#4ec9b0", margin: 0, whiteSpace: "pre-wrap" }}>
                {output}
              </pre>
            )}

            {!error && !output && (
              <div style={{ color: "#666", fontStyle: "italic" }}>
                Output will appear here...
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ================= RIGHT CLICK MENU ================= */}
      {menu.visible && (
        <div
          style={{
            position: "fixed",
            top: menu.y,
            left: menu.x,
            background: "#2d2d2d",
            border: "1px solid #454545",
            borderRadius: "6px",
            zIndex: 9999,
            boxShadow: "0 4px 16px rgba(0, 0, 0, 0.5)",
            minWidth: "180px",
            padding: "4px 0",
            fontSize: "13px"
          }}
          onMouseLeave={() => setMenu({ visible: false })}
        >
          {/* OPEN */}
          <div
            onClick={() => {
              openFile(menu.file);
              setMenu({ visible: false });
            }}
            style={{
              ...menuItemStyle,
              padding: "10px 16px"
            }}
            onMouseEnter={(e) => e.target.style.background = "#094771"}
            onMouseLeave={(e) => e.target.style.background = "transparent"}
          >
            📄 Open
          </div>

          {/* NEW FILE */}
          <div
            onClick={() => {
              createNewFile();
              setMenu({ visible: false });
            }}
            style={{
              ...menuItemStyle,
              padding: "10px 16px"
            }}
            onMouseEnter={(e) => e.target.style.background = "#094771"}
            onMouseLeave={(e) => e.target.style.background = "transparent"}
          >
            ➕ New File
          </div>

          <hr style={{ borderColor: "#454545", margin: "4px 0" }} />

          {/* RENAME */}
          <div
            onClick={() => {
              renameFile(menu.file);
              setMenu({ visible: false });
            }}
            style={{
              ...menuItemStyle,
              padding: "10px 16px"
            }}
            onMouseEnter={(e) => e.target.style.background = "#094771"}
            onMouseLeave={(e) => e.target.style.background = "transparent"}
          >
            ✏️ Rename
          </div>

          {/* DELETE */}
          <div
            onClick={() => {
              deleteFile(menu.file);
              setMenu({ visible: false });
            }}
            style={{
              ...menuItemStyle,
              padding: "10px 16px"
            }}
            onMouseEnter={(e) => e.target.style.background = "#094771"}
            onMouseLeave={(e) => e.target.style.background = "transparent"}
          >
            🗑️ Delete
          </div>
        </div>
      )}


    </div>
  );
}

export default App;
