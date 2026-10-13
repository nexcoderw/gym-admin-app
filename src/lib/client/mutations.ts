import type { z } from 'zod';

/** Only frontend-owned paths are accepted. Credentials are never persisted or logged. */
export async function post<T>(
	path: `/api/${string}`,
	body: unknown,
	schema: z.ZodType<T>,
	csrf?: string,
): Promise<T> {
	let response: Response;
	try {
		response = await fetch(path, {
			method: 'POST',
			credentials: 'same-origin',
			cache: 'no-store',
			redirect: 'error',
			signal: AbortSignal.timeout(15_000),
			headers: {
				'Content-Type': 'application/json',
				...(csrf ? { 'x-platform-csrf-token': csrf } : {}),
			},
			body: JSON.stringify(body),
		});
	} catch {
		throw new Error('The service could not be reached. Try again.');
	}
	if (!response.ok)
		throw new Error(
			response.status === 429
				? 'Too many attempts. Wait before trying again.'
				: response.status === 401
					? 'Authentication was not accepted. Check your details or sign in again.'
					: response.status === 403
						? 'This request was not accepted. Restart sign-in and try again.'
						: response.status === 412
							? 'Contact your operator to complete MFA enrollment.'
							: 'The request could not be completed. Try again or contact your operator.',
		);
	let value: unknown;
	try {
		value = response.status === 204 ? undefined : await response.json();
	} catch {
		throw new Error('The service returned an unexpected response. Try again.');
	}
	const parsed = schema.safeParse(value);
	if (!parsed.success) throw new Error('The service returned an unexpected response. Try again.');
	return parsed.data;
}

export function browserCsrf(): string | undefined {
	for (const name of ['__Host-nexcode-platform-csrf', 'nexcode-platform-csrf']) {
		const entry = document.cookie.split('; ').find((value) => value.startsWith(`${name}=`));
		if (entry) return entry.slice(name.length + 1);
	}
	return undefined;
}
