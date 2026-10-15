import styles from './avatar.module.css';

/** Up to two initials from the first two words of a name. */
function initialsOf(name: string): string {
	return name
		.trim()
		.split(/\s+/u)
		.slice(0, 2)
		.map((word) => Array.from(word)[0] ?? '')
		.join('')
		.toLocaleUpperCase('en');
}

/** Decorative initials: callers always render the full name as visible text beside it. */
export function Avatar({
	name,
	shape = 'circle',
	tone = 'tint',
}: {
	readonly name: string;
	readonly shape?: 'circle' | 'rounded';
	readonly tone?: 'tint' | 'solid';
}) {
	return (
		<span className={styles.avatar} data-shape={shape} data-tone={tone} aria-hidden="true">
			{initialsOf(name)}
		</span>
	);
}
