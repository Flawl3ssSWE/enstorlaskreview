// Apply a saved preference before first paint. Dark remains the original default.
try {
	const theme = localStorage.getItem('soda-theme');
	if (theme === 'light' || theme === 'dark') document.documentElement.dataset.theme = theme;
} catch {
	// Storage can be unavailable; switching themes still works for this visit.
}
