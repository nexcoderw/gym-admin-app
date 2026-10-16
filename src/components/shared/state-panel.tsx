import { useId, type ReactNode } from 'react';
import {
	AlertCircleIcon,
	Clock01Icon,
	FileSearchIcon,
	Folder01Icon,
	LockPasswordIcon,
	ShieldKeyIcon,
	WifiError01Icon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react';

import { stateContent, type StateKind } from './state-content';
import { BrandLogo } from './brand-logo';
import styles from './state-panel.module.css';

const illustrations: Record<Exclude<StateKind, 'loading'>, IconSvgElement> = {
	'401': ShieldKeyIcon,
	'403': LockPasswordIcon,
	'404': FileSearchIcon,
	'429': Clock01Icon,
	'500': AlertCircleIcon,
	'503': WifiError01Icon,
	empty: Folder01Icon,
};

/** Shared presentation only; callers own data, authorization, and meaningful recovery actions. */
export function StatePanel({
	kind,
	layout = 'section',
	headingLevel = 1,
	title,
	description,
	children,
}: {
	readonly kind: StateKind;
	readonly layout?: 'page' | 'section' | 'compact';
	readonly headingLevel?: 1 | 2 | 3;
	readonly title?: string;
	readonly description?: string;
	readonly children?: ReactNode;
}) {
	const id = useId();
	const Heading = headingLevel === 1 ? 'h1' : headingLevel === 2 ? 'h2' : 'h3';
	if (kind === 'loading') {
		return (
			<section
				className={styles.panel}
				data-layout={layout}
				data-state={kind}
				aria-labelledby={`${id}-title`}
			>
				<div className={styles.loading} role="status" aria-live="polite" aria-atomic="true">
					<span className={styles.spinner} aria-hidden="true" />
					<Heading id={`${id}-title`} className={styles.loadingTitle}>
						{title ?? stateContent.loading.title}
					</Heading>
				</div>
			</section>
		);
	}
	const content = stateContent[kind];
	return (
		<section
			className={styles.panel}
			data-layout={layout}
			data-state={kind}
			aria-labelledby={`${id}-title`}
			aria-describedby={`${id}-description`}
		>
			{layout === 'page' ? (
				<div className={styles.brand}>
					<BrandLogo subtitle="Platform administration" />
				</div>
			) : null}
			<div className={styles.illustration} aria-hidden="true">
				<svg className={styles.scene} viewBox="0 0 224 160" fill="none" focusable="false">
					<rect className={styles.frame} x="30" y="24" width="164" height="112" rx="14" />
					<path className={styles.rule} d="M30 49h164M47 68h25M47 81h17M47 110h25M159 110h18" />
					<circle className={styles.detail} cx="44" cy="37" r="2" />
					<circle className={styles.detail} cx="52" cy="37" r="2" />
					<circle className={styles.detail} cx="60" cy="37" r="2" />
					<circle className={styles.accent} cx="204" cy="44" r="4" />
					<circle className={styles.accent} cx="19" cy="111" r="3" />
					<path className={styles.rule} d="M17 62v10m-5-5h10M201 104v10m-5-5h10" />
				</svg>
				<div className={styles.glyph}>
					<HugeiconsIcon icon={illustrations[kind]} size={40} strokeWidth={1.5} />
				</div>
			</div>
			{content.code ? <span className={styles.code}>{content.code}</span> : null}
			<Heading id={`${id}-title`} className={styles.title}>
				{title ?? content.title}
			</Heading>
			<p id={`${id}-description`} className={styles.description}>
				{description ?? content.description}
			</p>
			{children ? <div className={styles.actions}>{children}</div> : null}
			<p className={styles.hint}>{content.hint}</p>
		</section>
	);
}
