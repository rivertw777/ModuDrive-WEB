// Runs before the first paint (a plain blocking script, not a module) so the page doesn't flash
// the wrong theme. A file rather than an inline <script> because the CSP (vite.config.ts) only
// allows scripts from our own origin.
try {
  var theme = localStorage.getItem('modudrive.theme')
  var dark = theme ? theme === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches
  document.documentElement.classList.toggle('dark', dark)
} catch {}
