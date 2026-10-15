/* =========================================================
   ShelfSearch — script.js
   Book search app using the Open Library API
   API docs: https://openlibrary.org/developers/api
   ========================================================= */

// ---------- 1. Constants ----------
const SEARCH_URL = "https://openlibrary.org/search.json";
const WORK_URL = "https://openlibrary.org";              // + /works/OL...W.json
const COVER_URL = "https://covers.openlibrary.org/b/id"; // + /{cover_id}-M.jpg
const RESULTS_PER_PAGE = 12;

// ---------- 2. Get elements from the page (DOM) ----------
const searchForm = document.getElementById("searchForm");
const searchInput = document.getElementById("searchInput");
const searchType = document.getElementById("searchType");
const searchBtn = document.getElementById("searchBtn");
const statusBox = document.getElementById("status");
const resultsBox = document.getElementById("results");
const pagination = document.getElementById("pagination");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const pageInfo = document.getElementById("pageInfo");
const recentBox = document.getElementById("recentSearches");
const modal = document.getElementById("modal");
const modalContent = document.getElementById("modalContent");
const modalClose = document.getElementById("modalClose");
const readingListBtn = document.getElementById("readingListBtn");
const readingCount = document.getElementById("readingCount");

// ---------- 3. App state ----------
let currentQuery = "";
let currentType = "q";
let currentPage = 1;
let totalResults = 0;
let lastBooks = [];   // books currently on screen

// ---------- 4. Helper functions ----------

// Prevents text from the API from being treated as HTML (security)
function escapeHTML(text) {
  const div = document.createElement("div");
  div.textContent = text ?? "";
  return div.innerHTML;
}

function showLoading(message) {
  statusBox.className = "status";
  statusBox.innerHTML = `<div class="spinner"></div><p>${escapeHTML(message)}</p>`;
}

function showError(message) {
  statusBox.className = "status error";
  statusBox.textContent = "⚠️ " + message;
}

function showInfo(message) {
  statusBox.className = "status muted";
  statusBox.textContent = message;
}

function coverImage(coverId, size, title) {
  if (coverId) {
    return `<img class="book-cover" src="${COVER_URL}/${coverId}-${size}.jpg"
                 alt="Cover of ${escapeHTML(title)}" loading="lazy">`;
  }
  return `<div class="no-cover">${escapeHTML(title)}</div>`;
}

// Turns technical errors into user-friendly messages
function friendlyError(error) {
  if (!navigator.onLine) {
    return "You appear to be offline. Please check your internet connection and try again.";
  }
  if (error.name === "AbortError") {
    return "The request took too long. Please try again.";
  }
  return "Could not fetch data. Please try again.";
}

// fetch() with a 15-second timeout, returns parsed JSON
async function fetchJSON(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }
    return await response.json(); // parse JSON
  } finally {
    clearTimeout(timer);
  }
}

// ---------- 5. MAIN FEATURE: search books ----------
async function searchBooks(query, type, page = 1) {
  // Build the API URL, e.g. search.json?title=rizal&page=1&limit=12
  const params = new URLSearchParams({
    [type]: query,
    page: page,
    limit: RESULTS_PER_PAGE,
    fields: "key,title,author_name,first_publish_year,cover_i,edition_count,subject",
  });

  showLoading(`Searching for "${query}"...`);
  resultsBox.innerHTML = "";
  pagination.hidden = true;
  searchBtn.disabled = true;

  try {
    const data = await fetchJSON(`${SEARCH_URL}?${params}`);

    currentQuery = query;
    currentType = type;
    currentPage = page;
    totalResults = data.numFound;
    lastBooks = data.docs;

    if (data.docs.length === 0) {
      showInfo(`No books found for "${query}". Try a different word or search type.`);
      return;
    }

    const totalPages = Math.ceil(totalResults / RESULTS_PER_PAGE);
    showInfo(`Found ${totalResults.toLocaleString()} books for "${query}"`);
    displayBooks(data.docs);
    updatePagination(totalPages);
    saveRecentSearch(query, type);
  } catch (error) {
    console.error("Search failed:", error);
    showError(friendlyError(error));
  } finally {
    searchBtn.disabled = false;
  }
}

// ---------- 6. Show results on the page (DOM update) ----------
function displayBooks(books) {
  resultsBox.innerHTML = books.map((book, index) => {
    const author = book.author_name ? book.author_name.slice(0, 2).join(", ") : "Unknown author";
    const year = book.first_publish_year || "Year unknown";
    const saved = isInReadingList(book.key);

    return `
      <article class="book">
        ${coverImage(book.cover_i, "M", book.title)}
        <div class="book-body">
          <h3 class="book-title">${escapeHTML(book.title)}</h3>
          <p class="book-meta">${escapeHTML(author)}</p>
          <p class="book-meta">First published: ${escapeHTML(String(year))}</p>
          <div class="book-actions">
            <button class="btn btn-outline" data-action="details" data-index="${index}">Details</button>
            <button class="btn ${saved ? "btn-gold" : ""}" data-action="save" data-index="${index}">
              ${saved ? "Saved ✓" : "+ Save"}
            </button>
          </div>
        </div>
      </article>`;
  }).join("");
}

function updatePagination(totalPages) {
  pagination.hidden = totalPages <= 1;
  pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
  prevBtn.disabled = currentPage <= 1;
  nextBtn.disabled = currentPage >= totalPages;
}

// ---------- 7. SECOND API CALL: book details ----------
async function showBookDetails(book) {
  openModal(`<div class="status"><div class="spinner"></div><p>Loading details...</p></div>`);

  try {
    // e.g. https://openlibrary.org/works/OL45804W.json
    const work = await fetchJSON(`${WORK_URL}${book.key}.json`);

    // description can be a string OR an object { value: "..." }
    let description = "No description available for this book.";
    if (typeof work.description === "string") description = work.description;
    else if (work.description?.value) description = work.description.value;

    const subjects = (work.subjects || book.subject || []).slice(0, 8);
    const authors = book.author_name ? book.author_name.join(", ") : "Unknown author";

    openModal(`
      <div class="detail">
        ${coverImage(book.cover_i, "L", book.title)}
        <div>
          <h2 id="modalTitle">${escapeHTML(book.title)}</h2>
          <p><strong>Author:</strong> ${escapeHTML(authors)}</p>
          <p><strong>First published:</strong> ${escapeHTML(String(book.first_publish_year || "Unknown"))}</p>
          <p><strong>Editions:</strong> ${escapeHTML(String(book.edition_count || "N/A"))}</p>
          <div class="subjects">
            ${subjects.map(s => `<span class="chip">${escapeHTML(s)}</span>`).join("")}
          </div>
          <p>${escapeHTML(description.split("\n")[0])}</p>
          <a href="https://openlibrary.org${escapeHTML(book.key)}" target="_blank" rel="noopener">
            View on Open Library →
          </a>
        </div>
      </div>`);
  } catch (error) {
    console.error("Details failed:", error);
    openModal(`<p class="status error">⚠️ ${escapeHTML(friendlyError(error))}</p>`);
  }
}

function openModal(html) {
  modalContent.innerHTML = html;
  modal.hidden = false;
}

function closeModal() {
  modal.hidden = true;
  modalContent.innerHTML = "";
}

// ---------- 8. EXTRA FEATURE: Reading list (localStorage) ----------
function getReadingList() {
  try {
    return JSON.parse(localStorage.getItem("readingList")) || [];
  } catch {
    return [];
  }
}

function setReadingList(list) {
  try {
    localStorage.setItem("readingList", JSON.stringify(list));
  } catch {
    /* storage may be blocked; app still works without it */
  }
  readingCount.textContent = list.length;
}

function isInReadingList(key) {
  return getReadingList().some(b => b.key === key);
}

function toggleReadingList(book) {
  let list = getReadingList();
  if (isInReadingList(book.key)) {
    list = list.filter(b => b.key !== book.key);
  } else {
    list.push({
      key: book.key,
      title: book.title,
      author: book.author_name ? book.author_name[0] : "Unknown author",
    });
  }
  setReadingList(list);
  displayBooks(lastBooks); // refresh buttons
}

function showReadingList() {
  const list = getReadingList();
  if (list.length === 0) {
    openModal(`<h2 id="modalTitle">My Reading List</h2><p class="muted">Your list is empty. Save books from your search results.</p>`);
    return;
  }
  openModal(`
    <h2 id="modalTitle">My Reading List (${list.length})</h2>
    ${list.map(b => `
      <div class="reading-item">
        <div>
          <strong>${escapeHTML(b.title)}</strong><br>
          <span class="muted">${escapeHTML(b.author)}</span>
        </div>
        <button class="btn btn-outline btn-small" data-remove="${escapeHTML(b.key)}">Remove</button>
      </div>`).join("")}
  `);
}

// ---------- 9. EXTRA FEATURE: Recent searches ----------
function getRecent() {
  try {
    return JSON.parse(localStorage.getItem("recentSearches")) || [];
  } catch {
    return [];
  }
}

function saveRecentSearch(query, type) {
  let recent = getRecent().filter(r => r.query.toLowerCase() !== query.toLowerCase());
  recent.unshift({ query, type });
  recent = recent.slice(0, 5);
  try { localStorage.setItem("recentSearches", JSON.stringify(recent)); } catch { /* ignore */ }
  renderRecent();
}

function renderRecent() {
  const recent = getRecent();
  if (recent.length === 0) {
    recentBox.innerHTML = "";
    return;
  }
  recentBox.innerHTML = `<span class="muted">Recent:</span>` +
    recent.map((r, i) => `<button class="chip" data-recent="${i}">${escapeHTML(r.query)}</button>`).join("");
}

// ---------- 10. Event listeners ----------

// Search form submit — with input validation
searchForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const query = searchInput.value.trim();

  if (query === "") {
    searchInput.classList.add("invalid");
    showError("Please type a book title, author, or subject before searching.");
    searchInput.focus();
    return;
  }
  if (query.length < 2) {
    searchInput.classList.add("invalid");
    showError("Please enter at least 2 characters.");
    return;
  }

  searchInput.classList.remove("invalid");
  searchBooks(query, searchType.value, 1);
});

searchInput.addEventListener("input", () => searchInput.classList.remove("invalid"));

// Buttons inside book cards (event delegation)
resultsBox.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  const book = lastBooks[Number(button.dataset.index)];
  if (button.dataset.action === "details") showBookDetails(book);
  if (button.dataset.action === "save") toggleReadingList(book);
});

// Pagination
prevBtn.addEventListener("click", () => {
  searchBooks(currentQuery, currentType, currentPage - 1);
  window.scrollTo({ top: 0, behavior: "smooth" });
});
nextBtn.addEventListener("click", () => {
  searchBooks(currentQuery, currentType, currentPage + 1);
  window.scrollTo({ top: 0, behavior: "smooth" });
});

// Recent search chips
recentBox.addEventListener("click", (event) => {
  const chip = event.target.closest("[data-recent]");
  if (!chip) return;
  const r = getRecent()[Number(chip.dataset.recent)];
  searchInput.value = r.query;
  searchType.value = r.type;
  searchBooks(r.query, r.type, 1);
});

// Reading list
readingListBtn.addEventListener("click", showReadingList);
modalContent.addEventListener("click", (event) => {
  const removeBtn = event.target.closest("[data-remove]");
  if (!removeBtn) return;
  setReadingList(getReadingList().filter(b => b.key !== removeBtn.dataset.remove));
  displayBooks(lastBooks);
  showReadingList();
});

// Close modal: X button, clicking outside, or Escape key
modalClose.addEventListener("click", closeModal);
modal.addEventListener("click", (event) => { if (event.target === modal) closeModal(); });
document.addEventListener("keydown", (event) => { if (event.key === "Escape" && !modal.hidden) closeModal(); });

// Internet connection changes
window.addEventListener("offline", () => showError("You are offline. Searches will not work until your connection returns."));
window.addEventListener("online", () => showInfo("Back online! You can search again."));

// ---------- 11. Start the app ----------
readingCount.textContent = getReadingList().length;
renderRecent();
showInfo("Type a keyword above to start searching.");
