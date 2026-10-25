import { createHash } from 'node:crypto';

/** Authorize only the exact inert JSON-LD blocks emitted into each static page. */
export function hashStructuredData(html: string): string {
	const hashes = [
		...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)
	].map((match) => `'sha256-${createHash('sha256').update(match[1]).digest('base64')}'`);
	if (!hashes.length) return html;
	const meta = /(<meta http-equiv="content-security-policy" content=")([^"]*)(")/;
	if (!meta.test(html)) throw new Error('Den statiska sidan saknar innehållssäkerhetspolicy.');
	return html.replace(meta, (_match, before: string, policy: string, after: string) => {
		if (!/(?:^|;)\s*script-src\s/.test(policy))
			throw new Error('Den statiska sidan saknar script-src.');
		const updated = policy.replace(
			/(^|;)(\s*script-src\s+)([^;]*)/,
			(_part, separator: string, directive: string, sources: string) => {
				const tokens = new Set([...sources.trim().split(/\s+/), ...hashes]);
				return `${separator}${directive}${[...tokens].join(' ')}`;
			}
		);
		return `${before}${updated}${after}`;
	});
}
