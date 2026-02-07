import { useState, useEffect } from "react";
import Editor from "@monaco-editor/react";
import axios from "axios";


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

  /* ================= CONTEXT MENU ================= */

  const [menu, setMenu] = useState({
    visible: false,
    x: 0,
    y: 0,
    file: null
  });

  /* ================= RESTORE FOLDER PERMISSION ================= */

  useEffect(() => {

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

  }, []);


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

  const openFile = async (name) => {
    try {
      if (!directoryHandle) return;

      const fileHandle =
        await directoryHandle.getFileHandle(name);

      const file = await fileHandle.getFile();

      const text = await file.text();

      setCurrentFile(name);
      setCode(text);

      setOutput(`📄 Opened ${name}`);
      setError("");

    } catch {
      setError("❌ Cannot open file");
    }
  };


  /* ================= SAVE FILE ================= */

  const saveFile = async () => {
    try {
      if (!directoryHandle || !currentFile) return;

      const fileHandle =
        await directoryHandle.getFileHandle(
          currentFile,
          { create: true }
        );

      const writable =
        await fileHandle.createWritable();

      await writable.write(code);
      await writable.close();

      setError("");

    } catch {
      setError("❌ Save failed");
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

    if (!currentFile || !directoryHandle) return;

    const timer = setTimeout(() => {
      saveFile();
    }, 1200); // 1.2 seconds after typing stops

    return () => clearTimeout(timer);

  }, [code]);


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
            textTransform: "uppercase"
          }}
        >
          Explorer
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
            {/* ROOT FOLDER */}
            <FolderNode
              name={directoryHandle.name}
              handle={directoryHandle}
              openFile={openFile}
              currentFile={currentFile}
              setMenu={setMenu}
            />
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
