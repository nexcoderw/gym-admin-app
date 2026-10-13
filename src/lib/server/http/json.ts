import 'server-only';

import { BffError } from './errors';

/** Enforces a streaming byte limit, including chunked bodies without Content-Length. */
export async function boundedJson(body: ReadableStream<Uint8Array> | null, maximum: number): Promise<unknown> {
	if (!body) throw new BffError(400, 'INVALID_INPUT', 'A JSON body is required.');
	const reader = body.getReader();
	const decoder = new TextDecoder();
	let size = 0;
	let text = '';
	try {
		while (true) {
			const { done, value } = await reader.read();
			if (done) break;
			size += value.byteLength;
			if (size > maximum) {
				await reader.cancel();
				throw new BffError(413, 'BODY_TOO_LARGE', 'The request is too large.');
			}
			text += decoder.decode(value, { stream: true });
		}
		text += decoder.decode();
		const parsed: unknown = JSON.parse(text);
		return parsed;
	} catch (error) {
		if (error instanceof BffError) throw error;
		throw new BffError(400, 'INVALID_INPUT', 'A valid JSON body is required.');
	} finally {
		reader.releaseLock();
	}
}
