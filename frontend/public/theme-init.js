// Runs before the page paints, so a saved or system dark theme never flashes light first.
try {
  var theme = localStorage.getItem('theme')
  if (theme === 'dark' || (!theme && matchMedia('(prefers-color-scheme: dark)').matches)) {
    document.documentElement.classList.add('dark')
  }
} catch {
  // Storage blocked: the default light theme is used.
}
