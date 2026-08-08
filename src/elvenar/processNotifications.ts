// Deliberately a no-op. It stays registered so notification traffic still resolves to a processor
// rather than warning, but the wonder-contribution parsing it used to do fed only a display that
// was never built, so it was dropped rather than left to rot. See git history for that shape.
export async function processNotifications() {}
