import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

async function sourceFiles(path: string): Promise<string[]> {
	const entries = await readdir(path, { withFileTypes: true });
	const nested = await Promise.all(
		entries.map((entry) =>
			entry.isDirectory()
				? sourceFiles(join(path, entry.name))
				: Promise.resolve([join(path, entry.name)]),
		),
	);
	return nested.flat().filter((file) => /\.tsx?$/u.test(file));
}

describe('server/client import boundaries', () => {
	it('keeps server endpoint modules guarded and upstream addresses out of browser source', async () => {
		const files = await sourceFiles(fileURLToPath(new URL('../src', import.meta.url)));
		for (const file of files) {
			const source = await readFile(file, 'utf8');
			if (file.includes('/lib/server/')) expect(source).toContain("import 'server-only'");
			if (
				source.startsWith("'use client'") ||
				file.includes('/lib/client/') ||
				file.includes('/constants/')
			) {
				expect(source).not.toContain('GYM_API_BASE_URL');
				expect(source).not.toContain('/api/v1/');
				expect(source).not.toContain('lib/server');
				expect(source).not.toContain('localStorage');
			}
		}
	});
});
