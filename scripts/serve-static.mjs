import { createServer } from 'node:http';
import { readFile, stat, realpath } from 'node:fs/promises';
import { resolve, sep, extname } from 'node:path';

// Local verification serves exactly the Pages artifact; it never executes SvelteKit routes.
const root = await realpath(resolve('build'));
const base = process.env.BASE_PATH ?? '';
const args = process.argv.slice(2);
const host = args.includes('--host') ? args[args.indexOf('--host') + 1] : '127.0.0.1';
const port = args.includes('--port') ? Number(args[args.indexOf('--port') + 1]) : 4173;
const types = {
	'.html': 'text/html; charset=utf-8',
	'.js': 'text/javascript; charset=utf-8',
	'.mjs': 'text/javascript; charset=utf-8',
	'.css': 'text/css; charset=utf-8',
	'.json': 'application/json; charset=utf-8',
	'.png': 'image/png',
	'.jpg': 'image/jpeg',
	'.jpeg': 'image/jpeg',
	'.webp': 'image/webp',
	'.svg': 'image/svg+xml',
	'.woff': 'font/woff',
	'.woff2': 'font/woff2',
	'.txt': 'text/plain; charset=utf-8'
};
const server = createServer(async (request, response) => {
	const notFound = async () => {
		response.writeHead(404, { 'content-type': types['.html'] });
		response.end(await readFile(resolve(root, '404.html')));
	};
	try {
		if (request.method !== 'GET' && request.method !== 'HEAD') {
			response.writeHead(405, { allow: 'GET, HEAD' });
			response.end();
			return;
		}
		const url = new URL(request.url ?? '/', 'http://localhost');
		if (base && url.pathname === base) {
			response.writeHead(308, { location: `${base}/${url.search}` });
			response.end();
			return;
		}
		if (base && !url.pathname.startsWith(`${base}/`)) {
			await notFound();
			return;
		}
		const pathname = decodeURIComponent(url.pathname.slice(base.length));
		let file = resolve(root, `.${pathname}`);
		if (file !== root && !file.startsWith(root + sep)) {
			await notFound();
			return;
		}
		let info = await stat(file);
		if (info.isDirectory()) {
			if (!url.pathname.endsWith('/')) {
				response.writeHead(308, { location: `${url.pathname}/${url.search}` });
				response.end();
				return;
			}
			file = resolve(file, 'index.html');
			info = await stat(file);
		}
		if (!info.isFile() || !(await realpath(file)).startsWith(root + sep)) {
			await notFound();
			return;
		}
		response.writeHead(200, {
			'content-type': types[extname(file)] ?? 'application/octet-stream',
			'cache-control': 'no-store'
		});
		response.end(request.method === 'HEAD' ? undefined : await readFile(file));
	} catch (error) {
		if (error instanceof URIError) {
			response.writeHead(400);
			response.end('Ogiltig adress.');
			return;
		}
		try {
			await notFound();
		} catch {
			response.writeHead(500);
			response.end('Sidan kunde inte läsas.');
		}
	}
});
server.listen(port, host, () => console.log(`Static preview: http://${host}:${port}${base}/`));
