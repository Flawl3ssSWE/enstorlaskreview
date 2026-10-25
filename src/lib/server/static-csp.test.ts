import { createHash } from 'node:crypto';
import { expect, it } from 'vitest';
import { hashStructuredData } from './static-csp';

it('adds exact JSON-LD hashes without changing markup or weakening existing CSP', () => {
	const data = '{"name":"Läsk \\u003c/script\\u003e"}';
	const html = `<meta http-equiv="content-security-policy" content="default-src 'self'; script-src 'self' 'sha256-existing'; object-src 'none'"><script type="application/ld+json">${data}</script>`;
	const updated = hashStructuredData(html);
	const hash = createHash('sha256').update(data).digest('base64');
	expect(updated).toContain(`'sha256-existing' 'sha256-${hash}'`);
	expect(updated).toContain(`object-src 'none'`);
	expect(updated).toContain(`<script type="application/ld+json">${data}</script>`);
	expect(updated).not.toContain('unsafe-inline');
	expect(hashStructuredData(updated)).toBe(updated);
});

it('leaves pages without structured data untouched and rejects missing CSP', () => {
	expect(hashStructuredData('<h1>Hej</h1>')).toBe('<h1>Hej</h1>');
	expect(() => hashStructuredData('<script type="application/ld+json">{}</script>')).toThrow();
});
