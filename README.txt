GROUP NAME:  Dunkin

MEMBERS & ROLES:
  1. Rose Lindy A. Cabilan — JavaScript Logic & API Integration
  2. Honey Jane E. Panogaling — HTML Structure & Semantics, CSS Styling & Layout
  3. Santhia Faye D. Perlado — Project Management & Documentation
  
PROJECT DESCRIPTION

ShelfSearch is a single-page application (SPA) that lets users
search for books by keyword, title, author, or subject. Results
show the cover, title, author, and first publication year. Users
can open a details view, save books to a reading list, revisit
recent searches, and browse results page by page.

Category: Others — Book Search / Library Application

API USED

Name:           Open Library API (by the Internet Archive)
Documentation:  https://openlibrary.org/developers/api
Endpoints used:
  - Search API:  https://openlibrary.org/search.json
                 https://openlibrary.org/dev/docs/api/search
  - Works API:   https://openlibrary.org/works/{id}.json
  - Covers API:  https://covers.openlibrary.org/b/id/{cover_id}-M.jpg
                 https://openlibrary.org/dev/docs/api/covers
No API key is required.

FILES

  index.html   - Group portfolio homepage
  app.html     - Main ShelfSearch application
  styles.css   - Styles for both pages
  script.js    - JavaScript logic and API integration
  images/      - Team member photos
  README.txt   - This file

HOW TO RUN

1. Download or clone this repository.
2. Open index.html in any modern web browser
   (Chrome, Edge, Firefox).
3. Click "Launch ShelfSearch App" to open app.html.
4. An internet connection is required to fetch book data.

Optional: In VS Code, install the "Live Server" extension,
right-click index.html, and choose "Open with Live Server".

FEATURES

Required:
  - Input field + search type dropdown + search button
  - fetch() with async/await to call the Open Library API
  - JSON response parsed and shown as book cards (DOM update)
  - Error handling: empty/short input, no results, offline,
    failed request, and request timeout

Extra features:
  - Book details modal (second API call to the Works API)
  - "My Reading List" saved in the browser (localStorage)
  - Recent searches (last 5)
  - Pagination (12 books per page)
  - Loading spinner, responsive design for mobile
