// @vitest-environment jsdom
import { useState } from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PencilEdit01Icon } from '@hugeicons/core-free-icons';

import { Dialog } from '@/components/shared/dialog';
import { IconButton } from '@/components/shared/icon-button';
import { PageHeader } from '@/components/shared/page-header';
import { ToastProvider, useToast } from '@/components/shared/toast';

beforeEach(() => {
	Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
		configurable: true,
		value: function (this: HTMLDialogElement) {
			this.open = true;
		},
	});
	Object.defineProperty(HTMLDialogElement.prototype, 'close', {
		configurable: true,
		value: function (this: HTMLDialogElement) {
			this.open = false;
		},
	});
});
afterEach(() => {
	cleanup();
	vi.useRealTimers();
});

function DialogHarness({ dismissible = true }: { readonly dismissible?: boolean }) {
	const [open, setOpen] = useState(false);
	return (
		<>
			<button type="button" onClick={() => setOpen(true)}>
				Open dialog
			</button>
			{open ? (
				<Dialog
					title="Review gym"
					description="Fictional record details."
					dismissible={dismissible}
					onClose={() => setOpen(false)}
					footer={<button type="button">Footer action</button>}
				>
					<input aria-label="First field" data-autofocus />
				</Dialog>
			) : null}
		</>
	);
}

function ToastHarness({ message }: { readonly message: string }) {
	const toast = useToast();
	return (
		<button type="button" onClick={() => toast.success(message)}>
			Notify
		</button>
	);
}

describe('shared dialog', () => {
	it('labels and describes the modal, focuses the marked field and restores focus', () => {
		render(<DialogHarness />);
		const trigger = screen.getByRole('button', { name: 'Open dialog' });
		trigger.focus();
		fireEvent.click(trigger);
		const dialog = screen.getByRole('dialog', { name: 'Review gym' });
		const description = document.getElementById(dialog.getAttribute('aria-describedby') ?? '');
		expect(description?.textContent).toBe('Fictional record details.');
		expect(document.activeElement).toBe(screen.getByLabelText('First field'));
		expect(screen.getByRole('button', { name: 'Footer action' })).toBeDefined();
		fireEvent.click(screen.getByRole('button', { name: 'Close' }));
		expect(screen.queryByRole('dialog')).toBeNull();
		expect(document.activeElement).toBe(trigger);
	});

	it('ignores Escape, backdrop and close while it is not dismissible', () => {
		render(<DialogHarness dismissible={false} />);
		fireEvent.click(screen.getByRole('button', { name: 'Open dialog' }));
		const dialog = screen.getByRole('dialog');
		fireEvent(dialog, new Event('cancel', { cancelable: true }));
		fireEvent.pointerDown(dialog);
		fireEvent.click(dialog);
		expect(screen.getByRole('button', { name: 'Close' }).hasAttribute('disabled')).toBe(true);
		expect(screen.getByRole('dialog')).toBeDefined();
	});

	it('names icon-only actions and exposes the same name as a tooltip', () => {
		render(<IconButton icon={PencilEdit01Icon} label="Edit Soho Gym" />);
		const button = screen.getByRole('button', { name: 'Edit Soho Gym' });
		expect(button.getAttribute('type')).toBe('button');
		expect(button.getAttribute('title')).toBe('Edit Soho Gym');
		expect(button.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
	});

	it('renders optional page header actions beside the single page heading', () => {
		render(
			<PageHeader
				title="Organizations"
				description="Fictional description."
				actions={<button type="button">Register Gym</button>}
			/>,
		);
		expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
		expect(screen.getByRole('button', { name: 'Register Gym' })).toBeDefined();
	});
});

describe('success toasts', () => {
	it('announces through a polite live region and dismisses automatically', () => {
		vi.useFakeTimers();
		const view = render(
			<ToastProvider>
				<ToastHarness message="Soho Gym is now active." />
			</ToastProvider>,
		);
		const region = view.container.querySelector('[aria-live="polite"]');
		expect(region).not.toBeNull();
		fireEvent.click(screen.getByRole('button', { name: 'Notify' }));
		expect(screen.getByRole('list', { name: 'Notifications' }).textContent).toContain(
			'Soho Gym is now active.',
		);
		act(() => {
			vi.advanceTimersByTime(5_000);
		});
		expect(screen.queryByText('Soho Gym is now active.')).toBeNull();
	});

	it('pauses while hovered, can be dismissed and keeps at most three messages', () => {
		vi.useFakeTimers();
		render(
			<ToastProvider>
				<ToastHarness message="Gym name saved." />
			</ToastProvider>,
		);
		const notify = screen.getByRole('button', { name: 'Notify' });
		for (let index = 0; index < 4; index += 1) fireEvent.click(notify);
		expect(screen.getAllByText('Gym name saved.')).toHaveLength(3);
		const [first] = screen.getAllByRole('listitem');
		if (!first) throw new Error('Expected a toast.');
		fireEvent.mouseEnter(first);
		act(() => {
			vi.advanceTimersByTime(10_000);
		});
		expect(screen.getAllByText('Gym name saved.')).toHaveLength(1);
		fireEvent.click(screen.getByRole('button', { name: 'Dismiss notification' }));
		expect(screen.queryByText('Gym name saved.')).toBeNull();
	});
});
