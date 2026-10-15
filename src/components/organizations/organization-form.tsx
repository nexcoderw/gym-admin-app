'use client';

import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import {
	Building03Icon,
	Cancel01Icon,
	CheckmarkCircle01Icon,
	Link01Icon,
	RefreshIcon,
} from '@hugeicons/core-free-icons';

import { Button } from '@/components/shared/button';
import { Dialog } from '@/components/shared/dialog';
import { IconButton } from '@/components/shared/icon-button';
import { Input } from '@/components/shared/input';
import { browserApi, routes } from '@/constants/routes';
import { browserCsrf, browserRequest, OrganizationRequestError } from '@/lib/client/mutations';
import { suggestOrganizationSlug } from '@/lib/client/organization-slug';
import {
	createOrganizationSchema,
	organizationEtag,
	organizationSchema,
	updateOrganizationSchema,
	type Organization,
} from '@/lib/contracts/organizations';
import styles from './organization-form.module.css';

type Props = {
	readonly returnFocus?: HTMLElement | null;
	readonly onClose: () => void;
	/** Receives only a record confirmed by the expected status and response validation. */
	readonly onSaved: (organization: Organization) => void;
	/** Closes the dialog and re-reads server-owned records after a stale or unconfirmed result. */
	readonly onReload: () => void;
} & ({ readonly mode: 'create' } | { readonly mode: 'edit'; readonly organization: Organization });

/** The single registration and rename form; it is always presented in a modal dialog. */
export function OrganizationForm(props: Props) {
	const router = useRouter();
	const formId = useId();
	const submitted = useRef(false);
	const mounted = useRef(true);
	useEffect(() => {
		mounted.current = true;
		return () => {
			mounted.current = false;
		};
	}, []);
	const [pending, setPending] = useState(false);
	const [error, setError] = useState('');
	const [fieldErrors, setFieldErrors] = useState<{ name?: string; slug?: string }>({});
	const [blocked, setBlocked] = useState(false);
	const [name, setName] = useState(props.mode === 'edit' ? props.organization.name : '');
	const [slugOverride, setSlugOverride] = useState<string | null>(null);
	const slug = slugOverride ?? suggestOrganizationSlug(name);
	const editing = props.mode === 'edit';
	const locked = pending || blocked;
	async function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (submitted.current || blocked) return;
		const fields = new FormData(event.currentTarget);
		const input = editing
			? { name: fields.get('name') }
			: { name: fields.get('name'), slug: fields.get('slug') };
		const parsed = editing
			? updateOrganizationSchema.safeParse(input)
			: createOrganizationSchema.safeParse(input);
		if (!parsed.success) {
			const issues = parsed.error.issues;
			setFieldErrors({
				name: issues.find((issue) => issue.path[0] === 'name')?.message,
				slug: issues.find((issue) => issue.path[0] === 'slug')?.message,
			});
			setError('Check the highlighted gym details.');
			return;
		}
		submitted.current = true;
		setPending(true);
		setFieldErrors({});
		setError('');
		try {
			const row = await browserRequest(
				props.mode === 'edit'
					? browserApi.organization(props.organization.id)
					: browserApi.organizations,
				editing ? 'PATCH' : 'POST',
				parsed.data,
				organizationSchema,
				browserCsrf(),
				{
					domain: 'organizations',
					expectedStatus: editing ? 200 : 201,
					// The precondition is the version shown when this dialog opened, never a later read.
					...(props.mode === 'edit' ? { ifMatch: organizationEtag(props.organization) } : {}),
				},
			);
			if (!mounted.current) return;
			props.onSaved(row);
		} catch (failure) {
			if (!mounted.current) return;
			if (failure instanceof OrganizationRequestError && failure.status === 401) {
				router.replace(routes.login);
				router.refresh();
				return;
			}
			setError(
				failure instanceof OrganizationRequestError
					? failure.message
					: 'The change could not be confirmed. Review the latest records.',
			);
			const mustReview =
				failure instanceof OrganizationRequestError
					? failure.status === 412 ||
						(failure.status === 409 && editing) ||
						(failure.status >= 500 && !editing && failure.code !== 'ORGANIZATION_AUDIT_UNAVAILABLE')
					: true;
			setBlocked(mustReview);
			submitted.current = false;
		} finally {
			if (mounted.current) setPending(false);
		}
	}
	return (
		<Dialog
			size="small"
			title={editing ? 'Edit gym name' : 'Register Gym'}
			description={
				editing
					? 'Only the gym name can be changed. Its UUID, slug and lifecycle are preserved.'
					: 'Registration creates a pending organization. Activation is a separate platform approval.'
			}
			dismissible={!pending}
			returnFocus={props.returnFocus}
			onClose={props.onClose}
			footer={
				<>
					{blocked ? (
						<Button icon={RefreshIcon} variant="secondary" width="full" onClick={props.onReload}>
							{editing ? 'Reload current records' : 'Review registry'}
						</Button>
					) : (
						<Button
							icon={Cancel01Icon}
							variant="secondary"
							width="full"
							disabled={pending}
							onClick={props.onClose}
						>
							Cancel
						</Button>
					)}
					<Button
						type="submit"
						form={formId}
						icon={CheckmarkCircle01Icon}
						width="full"
						pending={pending}
						disabled={blocked}
					>
						{editing ? 'Save gym name' : 'Register Gym'}
					</Button>
				</>
			}
		>
			<form id={formId} onSubmit={submit} aria-busy={pending} className={styles.form}>
				<Input
					id={`${formId}-name`}
					name="name"
					label="Gym name"
					icon={Building03Icon}
					value={name}
					onChange={(event) => setName(event.target.value)}
					required
					disabled={locked}
					autoComplete="off"
					error={fieldErrors.name}
					hint="A meaningful name, up to 160 characters."
					data-autofocus
				/>
				{props.mode === 'create' ? (
					<Input
						id={`${formId}-slug`}
						name="slug"
						label="Slug"
						icon={Link01Icon}
						value={slug}
						onChange={(event) => setSlugOverride(event.target.value)}
						required
						disabled={locked}
						minLength={3}
						maxLength={63}
						autoCapitalize="none"
						autoCorrect="off"
						spellCheck={false}
						error={fieldErrors.slug}
						hint="Generated from the gym name; you can edit it before registration. Use 3–63 lowercase letters, numbers and single hyphens, starting with a letter."
						trailingAction={
							slugOverride !== null ? (
								<IconButton
									icon={RefreshIcon}
									label="Use gym name"
									disabled={locked}
									onClick={() => setSlugOverride(null)}
								/>
							) : undefined
						}
					/>
				) : (
					<div className={styles.fixed}>
						<span className={styles.fixedLabel}>Slug</span>
						<span className={styles.fixedValue}>{props.organization.slug}</span>
						<span className={styles.fixedHint}>Slugs cannot be changed after registration.</span>
					</div>
				)}
				{error ? (
					<p role="alert" className={`error-message ${styles.alert}`}>
						{error}
					</p>
				) : null}
			</form>
		</Dialog>
	);
}
