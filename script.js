const BASE_URL = "https://my-flexifile-backend.onrender.com";
let currentPath = "";

/* ===== Helper: API Fetch Wrapper ===== */
async function apiRequest(url, options = {}) {
  try {
    const res = await fetch(url, options);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error("API Error:", err);
    showToast("❌ Error: Check console for details.", "error");
    return null;
  }
}

/* ===== Helper: Join Paths Safely ===== */
function joinPath(base, extra) {
  return [base, extra].filter(Boolean).join("/").replace(/\/+/g, "/");
}

function showToast(message, type = "info") {
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);

  // ===== Play sound based on type =====
  const sounds = {
    success: "sounds/success.mp3",
    warning: "sounds/warning.mp3",
    error: "sounds/error2.mp3",
    info: "sounds/info.mp3",
  };

  if (sounds[type]) {
    const audio = new Audio(sounds[type]);
    audio.volume = 0.6; // optional: adjust loudness
    audio.play().catch(() => {}); // prevent autoplay errors
  }

  // ===== Toast animation =====
  setTimeout(() => toast.classList.add("show"), 10);
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 500);
  }, 3000);
}

/* ===== Load Files & Folders ===== */
async function listFiles(path) {
  currentPath = path;
  const ul = document.getElementById("fileList");
  ul.innerHTML = "<li>📂 Loading files...</li>";

  const data = await apiRequest(`${BASE_URL}/list/${path}`);
  if (!data) return;
  ul.innerHTML = "";

  // Go Up button
  if (path) {
    const liUp = document.createElement("li");
    liUp.className = "file-item";
    liUp.innerHTML = `
      <span class="file-name" title="Go up one level">
        ⬆️ .. (Go Up)
      </span>
    `;
    liUp.onclick = () => {
      const parts = path.split("/").filter(Boolean);
      parts.pop();
      listFiles(parts.join("/"));
    };
    ul.appendChild(liUp);
  }

  // List items
  data.forEach((item) => {
    const li = document.createElement("li");
    li.className = "file-item";

    const fileName = document.createElement("span");
    fileName.className = "file-name";
    fileName.title = item.name;
    fileName.innerHTML = item.is_dir
      ? `<i class="fa fa-folder"></i> ${item.name}`
      : `<i class="fa fa-file"></i> ${item.name}`;

    if (item.is_dir) fileName.onclick = () => listFiles(item.path);

    const actions = document.createElement("div");
    actions.className = "file-actions";

    const renameBtn = document.createElement("button");
    renameBtn.className = "edit-btn";
    renameBtn.title = "Rename";
    renameBtn.innerHTML = `<i class="fa fa-pencil"></i>`;
    renameBtn.onclick = () => renamePath(item.path);

    const delBtn = document.createElement("button");
    delBtn.className = "delete-btn";
    delBtn.title = "Delete";
    delBtn.innerHTML = `<i class="fa fa-trash"></i>`;
    delBtn.onclick = () => deletePath(item.path);

    actions.appendChild(renameBtn);
    actions.appendChild(delBtn);

    li.appendChild(fileName);
    li.appendChild(actions);
    ul.appendChild(li);
  });
}

/* ===== Create Folder ===== */
async function createFolder() {
  const folderName = document.getElementById("folderPath").value.trim();
  if (!folderName) return showToast("⚠️ Enter a folder name", "warning");

  const fullPath = joinPath(currentPath, folderName);
  const data = await apiRequest(`${BASE_URL}/create-folder`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path: fullPath }),
  });

  if (data) {
    showToast(`✅ Folder created: ${folderName}`, "success");
    listFiles(currentPath);
    document.getElementById("folderPath").value = "";
  }
}

/* ===== Upload File ===== */
async function uploadFile() {
  const uploadPath = document.getElementById("uploadPath").value.trim();
  const fileInput = document.getElementById("fileInput");
  const file = fileInput.files[0];

  if (!file) return showToast("📁 Please select a file", "warning");

  const targetPath = uploadPath ? uploadPath : "";
  const formData = new FormData();
  formData.append("file", file);

  try {
    const response = await fetch(`${BASE_URL}/upload-file/${targetPath}`, {
      method: "POST",
      body: formData,
    });
    const data = await response.json();
    showToast(`📤 ${data.message}`, "success");
    listFiles(currentPath);
    fileInput.value = "";
  } catch (err) {
    console.error(err);
    showToast("❌ Upload failed!", "error");
  }
}

/* ===== Delete Modal ===== */
function showDeleteModal(path, onConfirm) {
  const modal = document.createElement("div");
  modal.className = "custom-modal-overlay";
  modal.innerHTML = `
    <div class="custom-modal">
      <div class="modal-header">
        <i class="fa-solid fa-triangle-exclamation"></i>
        <h3>Delete Confirmation</h3>
      </div>
      <p>
        Are you sure you want to permanently delete?
        <span class="file-name-text">"${path}"</span>
      </p>
      <div class="modal-actions">
        <button class="confirm-btn">Delete</button>
        <button class="cancel-btn">Cancel</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  modal.querySelector(".confirm-btn").onclick = () => {
    onConfirm();
    modal.remove();
  };
  modal.querySelector(".cancel-btn").onclick = () => modal.remove();
}

/* ===== Rename Modal ===== */
function showRenameModal(oldPath, onConfirm) {
  const modal = document.createElement("div");
  modal.className = "custom-modal-overlay";
  modal.innerHTML = `
    <div class="custom-modal">
      <div class="modal-header">
        <i class="fa-solid fa-pen"></i>
        <h3>Rename Item</h3>
      </div>
      <p>
        Enter a new name for:
        <span class="file-name-text">"${oldPath}"</span>
      </p>
      <input type="text" id="renameInput" placeholder="New name..." autofocus />
      <div class="modal-actions">
        <button class="confirm-btn">Rename</button>
        <button class="cancel-btn">Cancel</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  const input = modal.querySelector("#renameInput");
  input.focus();

  modal.querySelector(".confirm-btn").onclick = () => {
    const newName = input.value.trim();
    if (newName) {
      onConfirm(newName);
      modal.remove();
    } else {
      showToast("⚠️ Enter a valid name", "warning");
    }
  };
  modal.querySelector(".cancel-btn").onclick = () => modal.remove();
}

/* ===== Delete → Move to Trash ===== */
async function deletePath(path) {
  showDeleteModal(path, async () => {
    const data = await apiRequest(`${BASE_URL}/trash/move/${path}`, { method: "POST" });
    if (data) {
      showToast(`🗑️ '${path.split('/').pop()}' moved to Trash`, "success");
      listFiles(currentPath);
      updateTrashBadge();
    }
  });
}

/* ===== Trash Panel ===== */
function openTrashPanel() {
  if (document.getElementById("trashPanel")) return;

  const panel = document.createElement("div");
  panel.id = "trashPanel";
  panel.className = "trash-panel-overlay";
  panel.innerHTML = `
    <div class="trash-panel">
      <div class="trash-panel-header">
        <span><i class="fa-solid fa-trash-can"></i> Trash</span>
        <div style="display:flex;gap:10px;align-items:center;">
          <button id="emptyTrashBtn" class="empty-trash-btn" onclick="emptyTrash()"><i class="fa-solid fa-fire"></i> Empty Trash</button>
          <button onclick="document.getElementById('trashPanel').remove()" style="background:none;border:none;color:#aaa;font-size:1.3rem;cursor:pointer;">✕</button>
        </div>
      </div>
      <div id="trashItems" class="trash-items-list">
        <div class="trash-loading"><i class="fa fa-spinner fa-spin"></i> Loading...</div>
      </div>
    </div>
  `;
  document.body.appendChild(panel);
  panel.addEventListener("click", e => { if (e.target === panel) panel.remove(); });
  loadTrashItems();
}

async function loadTrashItems() {
  const data = await apiRequest(`${BASE_URL}/trash/list`);
  const container = document.getElementById("trashItems");
  if (!data || !container) return;

  if (data.count === 0) {
    container.innerHTML = `
      <div class="trash-empty-state">
        <i class="fa-solid fa-trash-can" style="font-size:40px;color:#444;"></i>
        <p>Trash is empty</p>
      </div>`;
    return;
  }

  const formatDate = iso => new Date(iso).toLocaleString(undefined, {
    month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit"
  });

  container.innerHTML = data.items.map(item => `
    <div class="trash-item" id="trash-${item.trash_id}">
      <div class="trash-item-icon ${item.is_dir ? 'ti-folder' : 'ti-file'}">
        <i class="fa-solid ${item.is_dir ? 'fa-folder' : 'fa-file'}"></i>
      </div>
      <div class="trash-item-info">
        <div class="trash-item-name">${escapeHtml(item.name)}</div>
        <div class="trash-item-meta">
          <span><i class="fa-solid fa-location-dot"></i> ${escapeHtml(item.original_path)}</span>
          <span><i class="fa-regular fa-clock"></i> ${formatDate(item.deleted_at)}</span>
        </div>
      </div>
      <div class="trash-item-actions">
        <button class="restore-btn" onclick="restoreItem('${item.trash_id}')" title="Restore">
          <i class="fa-solid fa-rotate-left"></i> Restore
        </button>
        <button class="pdel-btn" onclick="permanentDeleteItem('${item.trash_id}', '${escapeHtml(item.name)}')" title="Delete Forever">
          <i class="fa-solid fa-skull"></i> Delete
        </button>
      </div>
    </div>
  `).join("");
}

async function restoreItem(trashId) {
  const data = await apiRequest(`${BASE_URL}/trash/restore/${trashId}`, { method: "POST" });
  if (data) {
    showToast(`✅ ${data.message}`, "success");
    loadTrashItems();
    listFiles(currentPath);
    updateTrashBadge();
  }
}

async function permanentDeleteItem(trashId, name) {
  const modal = document.createElement("div");
  modal.className = "custom-modal-overlay";
  modal.innerHTML = `
    <div class="custom-modal">
      <div class="modal-header"><i class="fa-solid fa-skull"></i><h3>Delete Forever?</h3></div>
      <p>"<b>${escapeHtml(name)}</b>" will be permanently deleted. This cannot be undone.</p>
      <div class="modal-actions">
        <button class="confirm-btn">Delete Forever</button>
        <button class="cancel-btn">Cancel</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
  modal.querySelector(".confirm-btn").onclick = async () => {
    modal.remove();
    const data = await apiRequest(`${BASE_URL}/trash/delete/${trashId}`, { method: "DELETE" });
    if (data) {
      showToast(`☠️ '${name}' permanently deleted`, "error");
      loadTrashItems();
      updateTrashBadge();
    }
  };
  modal.querySelector(".cancel-btn").onclick = () => modal.remove();
}

async function emptyTrash() {
  const modal = document.createElement("div");
  modal.className = "custom-modal-overlay";
  modal.innerHTML = `
    <div class="custom-modal">
      <div class="modal-header"><i class="fa-solid fa-fire"></i><h3>Empty Trash?</h3></div>
      <p>All items in Trash will be <b>permanently deleted</b>. This cannot be undone.</p>
      <div class="modal-actions">
        <button class="confirm-btn">Empty Trash</button>
        <button class="cancel-btn">Cancel</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
  modal.querySelector(".confirm-btn").onclick = async () => {
    modal.remove();
    const data = await apiRequest(`${BASE_URL}/trash/empty`, { method: "DELETE" });
    if (data) {
      showToast(`🗑️ Trash emptied`, "success");
      loadTrashItems();
      updateTrashBadge();
    }
  };
  modal.querySelector(".cancel-btn").onclick = () => modal.remove();
}

async function updateTrashBadge() {
  const data = await apiRequest(`${BASE_URL}/trash/list`);
  const badge = document.getElementById("trashBadge");
  if (!badge) return;
  if (data && data.count > 0) {
    badge.textContent = data.count;
    badge.style.display = "flex";
  } else {
    badge.style.display = "none";
  }
}

/* ===== Rename ===== */
async function renamePath(oldPath) {
  showRenameModal(oldPath, async (newName) => {
    const data = await apiRequest(`${BASE_URL}/rename`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ old_path: oldPath, new_name: newName }),
    });
    if (data) {
      showToast("✅ Renamed successfully", "success");
      listFiles(currentPath);
    }
  });
}

/* ===== Modern Search ===== */
let searchDebounceTimer = null;
let activeFilter = "all";

function debouncedSearch() {
  const input = document.getElementById("searchInput");
  const clearBtn = document.getElementById("searchClearBtn");
  clearBtn.style.display = input.value ? "flex" : "none";

  clearTimeout(searchDebounceTimer);
  searchDebounceTimer = setTimeout(() => runSearch(), 300);
}

function setFilter(filter) {
  activeFilter = filter;
  document.querySelectorAll(".filter-btn").forEach(btn => btn.classList.remove("active"));
  document.getElementById(`filter-${filter}`).classList.add("active");
  runSearch();
}

function clearSearch() {
  document.getElementById("searchInput").value = "";
  document.getElementById("searchClearBtn").style.display = "none";
  document.getElementById("searchResultsPanel").style.display = "none";
}

async function runSearch() {
  const query = document.getElementById("searchInput").value.trim();
  const panel = document.getElementById("searchResultsPanel");

  if (!query) {
    panel.style.display = "none";
    return;
  }

  panel.style.display = "block";
  panel.innerHTML = `<div class="search-loading"><i class="fa fa-spinner fa-spin"></i> Searching...</div>`;

  const url = `${BASE_URL}/search?query=${encodeURIComponent(query)}&type=${activeFilter}`;
  const data = await apiRequest(url);
  if (!data) { panel.style.display = "none"; return; }

  if (data.count === 0) {
    panel.innerHTML = `
      <div class="search-empty">
        <i class="fa-solid fa-magnifying-glass" style="font-size:28px;color:#555;"></i>
        <p>No results found for <b>"${escapeHtml(query)}"</b></p>
      </div>`;
    return;
  }

  const formatSize = bytes => {
    if (bytes === null || bytes === undefined) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = ts => {
    if (!ts) return "";
    return new Date(ts * 1000).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  };

  const extIcons = {
    pdf: "fa-file-pdf", jpg: "fa-file-image", jpeg: "fa-file-image", png: "fa-file-image",
    gif: "fa-file-image", mp4: "fa-file-video", mp3: "fa-file-audio",
    zip: "fa-file-zipper", rar: "fa-file-zipper",
    js: "fa-file-code", ts: "fa-file-code", py: "fa-file-code", html: "fa-file-code",
    css: "fa-file-code", json: "fa-file-code",
    txt: "fa-file-lines", md: "fa-file-lines", csv: "fa-file-csv",
    doc: "fa-file-word", docx: "fa-file-word",
    xls: "fa-file-excel", xlsx: "fa-file-excel",
  };

  const highlightMatch = (text, q) => {
    if (!q) return escapeHtml(text);
    const idx = text.toLowerCase().indexOf(q.toLowerCase());
    if (idx === -1) return escapeHtml(text);
    return escapeHtml(text.slice(0, idx))
      + `<mark class="search-highlight">${escapeHtml(text.slice(idx, idx + q.length))}</mark>`
      + escapeHtml(text.slice(idx + q.length));
  };

  const items = data.results.map(item => {
    const iconClass = item.is_dir
      ? "fa-folder"
      : (extIcons[item.extension?.toLowerCase()] || "fa-file");
    const colorClass = item.is_dir ? "icon-folder" : "icon-file";
    const pathParts = item.path.split("/");
    const displayPath = pathParts.length > 1 ? pathParts.slice(0, -1).join(" / ") : "root";

    return `
      <div class="search-result-item" onclick="${item.is_dir ? `listFiles('${item.path}'); clearSearch();` : ''}" title="${escapeHtml(item.path)}">
        <div class="result-icon ${colorClass}">
          <i class="fa-solid ${iconClass}"></i>
        </div>
        <div class="result-info">
          <div class="result-name">${highlightMatch(item.name, query)}</div>
          <div class="result-meta">
            <span class="result-path"><i class="fa-solid fa-location-dot"></i> ${escapeHtml(displayPath)}</span>
            ${item.size !== null ? `<span class="result-size">${formatSize(item.size)}</span>` : ""}
            ${item.modified ? `<span class="result-date">${formatDate(item.modified)}</span>` : ""}
          </div>
        </div>
        <div class="result-badge">${item.is_dir ? "Folder" : (item.extension?.toUpperCase() || "File")}</div>
      </div>
    `;
  }).join("");

  panel.innerHTML = `
    <div class="search-header">
      <span><i class="fa-solid fa-magnifying-glass"></i> <b>${data.count}</b> result${data.count !== 1 ? "s" : ""} for <b>"${escapeHtml(query)}"</b></span>
    </div>
    <div class="search-results-list">${items}</div>
  `;
}

function escapeHtml(str) {
  return String(str).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

// Keep old searchItems as alias for backward compatibility
async function searchItems() { runSearch(); }

function renderFiles(data) {
  const ul = document.getElementById("fileList");
  ul.innerHTML = "";
  if (!data.results || data.results.length === 0) {
    ul.innerHTML = "<li>No results found</li>";
    return;
  }
  data.results.forEach((item) => {
    const li = document.createElement("li");
    li.className = "file-item";
    const fileName = document.createElement("span");
    fileName.className = "file-name";
    fileName.title = item.name;
    fileName.innerHTML = item.is_dir
      ? `<i class="fa fa-folder"></i> ${item.name}`
      : `<i class="fa fa-file"></i> ${item.name}`;
    if (item.is_dir) fileName.onclick = () => listFiles(item.path);
    li.appendChild(fileName);
    ul.appendChild(li);
  });
}

/* ===== Spell Checker ===== */
async function spellCheckFile() {
  const filePath = document.getElementById("spellCheckPath").value.trim();
  if (!filePath) return showToast("⚠️ Please enter a file path", "warning");

  showToast("🧠 Checking spelling...", "info");

  const data = await apiRequest(`${BASE_URL}/spellcheck/${filePath}`);
  if (!data) return;

  if (data.error) {
    showToast(`❌ ${data.error}`, "error");
    return;
  }

  // Remove any existing spell check modal
  const existing = document.getElementById("spellCheckModal");
  if (existing) existing.remove();

  if (data.misspelled && data.misspelled.length > 0) {
    // Build a rich modal showing each misspelled word + suggestions
    const rows = data.misspelled.map(item => `
      <tr>
        <td style="color:#ff6b6b;font-weight:bold;padding:8px 12px;">❌ ${item.word}</td>
        <td style="padding:8px 12px;color:#a8e6cf;">
          ${item.suggestions.length > 0
            ? item.suggestions.map(s => `<span style="background:#2a2a4a;border-radius:4px;padding:2px 8px;margin:2px;display:inline-block;">✔ ${s}</span>`).join(" ")
            : "<span style='color:#888;'>No suggestions</span>"}
        </td>
      </tr>
    `).join("");

    const modal = document.createElement("div");
    modal.id = "spellCheckModal";
    modal.style.cssText = `
      position:fixed;top:0;left:0;width:100%;height:100%;
      background:rgba(0,0,0,0.7);display:flex;align-items:center;
      justify-content:center;z-index:9999;
    `;
    modal.innerHTML = `
      <div style="background:#1a1a2e;border-radius:12px;padding:28px;max-width:620px;width:90%;
                  max-height:80vh;overflow-y:auto;box-shadow:0 8px 32px rgba(0,0,0,0.5);
                  border:1px solid #3a3a5c;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
          <h3 style="color:#fff;margin:0;">🔤 Spell Check Results</h3>
          <button onclick="document.getElementById('spellCheckModal').remove()"
            style="background:none;border:none;color:#aaa;font-size:22px;cursor:pointer;">✕</button>
        </div>
        <p style="color:#aaa;margin:0 0 16px;">
          📄 <b style="color:#ccc;">${data.file}</b> &nbsp;|&nbsp;
          Total words: <b style="color:#ccc;">${data.total_words}</b> &nbsp;|&nbsp;
          Misspelled: <b style="color:#ff6b6b;">${data.misspelled_count}</b>
        </p>
        <table style="width:100%;border-collapse:collapse;font-size:14px;">
          <thead>
            <tr style="border-bottom:1px solid #3a3a5c;">
              <th style="text-align:left;padding:8px 12px;color:#888;">Wrong Word</th>
              <th style="text-align:left;padding:8px 12px;color:#888;">Suggestions</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `;
    document.body.appendChild(modal);
    modal.addEventListener("click", (e) => { if (e.target === modal) modal.remove(); });

  } else {
    showToast("✅ No spelling mistakes found!", "success");
  }

  document.getElementById("spellCheckPath").value = "";
}
