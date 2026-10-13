'use client';

import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Building03Icon, Link01Icon, CheckmarkCircle01Icon, RefreshIcon } from '@hugeicons/core-free-icons';
import { Button } from '@/components/shared/button';
import { ButtonLink } from '@/components/shared/button-link';
import { Card } from '@/components/shared/card';
import { Input } from '@/components/shared/input';
import { browserApi, routes } from '@/constants/routes';
import { browserCsrf, browserRequest, OrganizationRequestError } from '@/lib/client/mutations';
import { createOrganizationSchema, updateOrganizationSchema, organizationSchema, type Organization } from '@/lib/contracts/organizations';
import styles from './organization-form.module.css';

type Props = { readonly mode: 'create' } | { readonly mode: 'edit'; readonly organization: Organization; readonly etag: string };

export function OrganizationForm(props: Props) {
	const router = useRouter();
	const formId = useId();
	const submitted = useRef(false);
	const mounted = useRef(true);
	useEffect(() => {
		mounted.current = true;
		return () => { mounted.current = false; };
	}, []);
	const [pending, setPending] = useState(false);
	const [error, setError] = useState('');
	const [fieldErrors, setFieldErrors] = useState<{ name?: string; slug?: string }>({});
	const [blocked, setBlocked] = useState(false);
	const editing = props.mode === 'edit';
	async function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (submitted.current || blocked) return;
		const fields = new FormData(event.currentTarget);
		const input = editing ? { name: fields.get('name') } : { name: fields.get('name'), slug: fields.get('slug') };
		const parsed = editing ? updateOrganizationSchema.safeParse(input) : createOrganizationSchema.safeParse(input);
		if (!parsed.success) {
			const errors = parsed.error.flatten().fieldErrors;
			setFieldErrors({ name: errors.name?.[0], slug: 'slug' in errors ? errors.slug?.[0] : undefined });
			setError('Check the highlighted gym details.');
			return;
		}
		submitted.current = true;
		setPending(true);
		setFieldErrors({});
		setError('');
		try {
			const row = await browserRequest(
				props.mode === 'edit' ? browserApi.organization(props.organization.id) : browserApi.organizations,
				editing ? 'PATCH' : 'POST', parsed.data, organizationSchema, browserCsrf(),
				{ domain: 'organizations', expectedStatus: editing ? 200 : 201, ...(props.mode === 'edit' ? { ifMatch: props.etag } : {}) },
			);
			if (!mounted.current) return;
			router.replace(routes.organization(row.id));
			router.refresh();
		} catch (failure) {
			if (!mounted.current) return;
			if (failure instanceof OrganizationRequestError && failure.status === 401) {
				router.replace(routes.login);
				router.refresh();
				return;
			}
			setError(failure instanceof OrganizationRequestError ? failure.message : 'The change could not be confirmed. Review the latest records.');
			const mustReview = failure instanceof OrganizationRequestError
				? failure.status === 412 || failure.status === 409 && editing || failure.status >= 500 && !editing && failure.code !== 'ORGANIZATION_AUDIT_UNAVAILABLE'
				: true;
			setBlocked(mustReview);
			submitted.current = false;
		} finally {
			if (mounted.current) setPending(false);
		}
	}
	return (
		<Card className={styles.panel}>
			<form onSubmit={submit} aria-busy={pending} className={styles.form}>
				<p className={styles.note}>{editing ? 'Only the gym name can be changed. Its UUID, slug and lifecycle are preserved.' : 'Registration creates a pending organization. Activation is a separate platform approval.'}</p>
				<Input id={`${formId}-name`} name="name" label="Gym name" icon={Building03Icon} defaultValue={props.mode === 'edit' ? props.organization.name : ''} required disabled={pending || blocked} error={fieldErrors.name} hint="A meaningful name, up to 160 characters." />
				{!editing ? <Input id={`${formId}-slug`} name="slug" label="Slug" icon={Link01Icon} required disabled={pending || blocked} minLength={3} maxLength={63} autoCapitalize="none" autoCorrect="off" spellCheck={false} error={fieldErrors.slug} hint="3–63 lowercase letters, numbers and single hyphens. Starts with a letter; reserved names are unavailable." /> : <p>Slug: <strong>{props.organization.slug}</strong></p>}
				{error ? <p role="alert" className="error-message">{error}</p> : null}
				<Button type="submit" icon={CheckmarkCircle01Icon} width="full" pending={pending} disabled={blocked}>{editing ? 'Save gym name' : 'Register Gym'}</Button>
				{blocked && editing ? <Button icon={RefreshIcon} width="full" variant="secondary" onClick={() => window.location.reload()}>Reload current records</Button> : null}
				<ButtonLink href={props.mode === 'edit' ? routes.organization(props.organization.id) : routes.organizations} icon={RefreshIcon} variant="secondary">{editing ? 'Back to gym' : 'Review registry'}</ButtonLink>
			</form>
		</Card>
	);
}
