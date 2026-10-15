// A fixed locale and zone keep server and browser output identical during hydration.
const date = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeZone: 'Africa/Kigali' });
const dateTime = new Intl.DateTimeFormat('en-GB', {
	dateStyle: 'medium',
	timeStyle: 'short',
	timeZone: 'Africa/Kigali',
});

export function formatOrganizationDate(value: string): string {
	return date.format(new Date(value));
}

export function formatOrganizationDateTime(value: string): string {
	return dateTime.format(new Date(value));
}
