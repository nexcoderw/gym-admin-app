import { notFound } from 'next/navigation';

/** Use the framework's real not-found boundary rather than a successful fake 404 page. */
export default function MissingPage(): never {
	notFound();
}
