'use client'

import { useCallback, useEffect, useState } from 'react'
import { Link2, Plus, Save, Trash2 } from 'lucide-react'
import { useT } from '@/components/i18n/LanguageProvider'

type SocialLink = {
	id: string;
	type: string;
	url: string;
	channelIds: string[];
};

type ChannelProfile = {
	id: string;
	name: string;
};

const emptyForm = {type: '', url: '', channelIds: [] as string[]}

export default function SocialLinksPage() {
	const t = useT()
	const [links, setLinks] = useState<SocialLink[]>([])
	const [form, setForm] = useState(emptyForm)
	const [loading, setLoading] = useState(true)
	const [channels, setChannels] = useState<ChannelProfile[]>([])
	const [channelsLoading, setChannelsLoading] = useState(true)
	const [channelsError, setChannelsError] = useState<string | null>(null)
	const [saving, setSaving] = useState(false)
	const [savingId, setSavingId] = useState<string | null>(null)
	const [deletingId, setDeletingId] = useState<string | null>(null)
	const [status, setStatus] = useState<{ type: 'idle' | 'error' | 'success'; message?: string }>({
		type: 'idle',
	})
	
	const readJson = async (response: Response) => {
		const text = await response.text()
		if (!text) return null
		try {
			return JSON.parse(text)
		} catch {
			return null
		}
	}
	
	const loadLinks = useCallback(async () => {
		setLoading(true)
		try {
			const response = await fetch('/api/social-links')
			const data = await readJson(response)
			if (!response.ok) {
				throw new Error(data?.error || t('social.error.load'))
			}
			if (!data) {
				throw new Error(t('social.error.load'))
			}
			const items = Array.isArray(data?.links) ? data.links : []
			setLinks(
				items.map((link: { channelIds: any; }) => ({
					...link,
					channelIds: Array.isArray(link.channelIds) ? link.channelIds : [],
				})),
			)
		} catch (error: any) {
			setStatus({type: 'error', message: error?.message || t('social.error.load')})
		} finally {
			setLoading(false)
		}
	}, [t])
	
	const loadChannels = useCallback(async () => {
		setChannelsLoading(true)
		setChannelsError(null)
		try {
			const response = await fetch('/api/channels')
			const data = await readJson(response)
			if (!response.ok) {
				throw new Error(data?.error || t('channels.error.load'))
			}
			if (!data) {
				throw new Error(t('channels.error.load'))
			}
			const items = Array.isArray(data?.channels) ? data.channels : []
			setChannels(items)
		} catch (error: any) {
			setChannelsError(error?.message || t('channels.error.load'))
		} finally {
			setChannelsLoading(false)
		}
	}, [t])
	
	useEffect(() => {
		loadLinks()
	}, [loadLinks])
	
	useEffect(() => {
		loadChannels()
	}, [loadChannels])
	
	const toggleFormChannel = (channelId: string) => {
		setForm((prev) => {
			const exists = prev.channelIds.includes(channelId)
			return {
				...prev,
				channelIds: exists
					? prev.channelIds.filter((id) => id !== channelId)
					: [...prev.channelIds, channelId],
			}
		})
	}
	
	const toggleLinkChannel = (linkId: string, channelId: string) => {
		setLinks((prev) =>
			prev.map((link) => {
				if (link.id !== linkId) return link
				const exists = link.channelIds.includes(channelId)
				return {
					...link,
					channelIds: exists
						? link.channelIds.filter((id) => id !== channelId)
						: [...link.channelIds, channelId],
				}
			}),
		)
	}
	
	const handleCreate = async (event: React.FormEvent) => {
		event.preventDefault()
		setSaving(true)
		setStatus({type: 'idle'})
		
		try {
			const response = await fetch('/api/social-links', {
				method: 'POST',
				headers: {'Content-Type': 'application/json'},
				body: JSON.stringify(form),
			})
			const data = await readJson(response)
			if (!response.ok) {
				throw new Error(data?.error || t('social.error.create'))
			}
			if (!data) {
				throw new Error(t('social.error.create'))
			}
			setForm(emptyForm)
			setStatus({type: 'success', message: t('social.status.created')})
			await loadLinks()
		} catch (error: any) {
			setStatus({type: 'error', message: error?.message || t('social.error.create')})
		} finally {
			setSaving(false)
		}
	}
	
	const updateLinkField = (id: string, field: keyof SocialLink, value: string) => {
		setLinks((prev) =>
			prev.map((link) => (link.id === id ? {...link, [field]: value} : link)),
		)
	}
	
	const handleUpdate = async (id: string) => {
		const link = links.find((item) => item.id === id)
		if (!link) return
		setSavingId(id)
		setStatus({type: 'idle'})
		
		try {
			const response = await fetch(`/api/social-links/${id}`, {
				method: 'PUT',
				headers: {'Content-Type': 'application/json'},
				body: JSON.stringify({
					type: link.type,
					url: link.url,
					channelIds: link.channelIds,
				}),
			})
			const data = await readJson(response)
			if (!response.ok) {
				throw new Error(data?.error || t('social.error.update'))
			}
			if (!data) {
				throw new Error(t('social.error.update'))
			}
			setLinks((prev) => prev.map((item) => (item.id === id ? data : item)))
			setStatus({type: 'success', message: t('social.status.updated')})
		} catch (error: any) {
			setStatus({type: 'error', message: error?.message || t('social.error.update')})
		} finally {
			setSavingId(null)
		}
	}
	
	const handleDelete = async (id: string) => {
		if (!confirm(t('social.confirmDelete'))) return
		setDeletingId(id)
		setStatus({type: 'idle'})
		
		try {
			const response = await fetch(`/api/social-links/${id}`, {method: 'DELETE'})
			const data = await readJson(response)
			if (!response.ok) {
				throw new Error(data?.error || t('social.error.delete'))
			}
			setLinks((prev) => prev.filter((item) => item.id !== id))
			setStatus({type: 'success', message: t('social.status.deleted')})
		} catch (error: any) {
			setStatus({type: 'error', message: error?.message || t('social.error.delete')})
		} finally {
			setDeletingId(null)
		}
	}
	
	return (
		<div className="max-w-5xl mx-auto px-4 space-y-6">
			<div>
				<h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('social.title')}</h1>
				<p className="text-sm text-gray-500 dark:text-gray-400">
					{t('social.subtitle')}
				</p>
			</div>
			
			<div
				className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
				<h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
					<Plus className="h-5 w-5 text-indigo-500"/>
					{t('social.add.title')}
				</h2>
				<form onSubmit={handleCreate} className="mt-4 space-y-4">
					<div className="grid gap-4 md:grid-cols-[1fr_2fr_auto]">
						<input
							value={form.type}
							onChange={(event) => setForm((prev) => ({...prev, type: event.target.value}))}
							className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
							placeholder={t('social.placeholder.type')}
							required
						/>
						<input
							value={form.url}
							onChange={(event) => setForm((prev) => ({...prev, url: event.target.value}))}
							className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
							placeholder={t('social.placeholder.url')}
							required
						/>
						<button
							type="submit"
							disabled={saving}
							className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
						>
							<Plus className="h-4 w-4"/>
							{saving ? t('social.add.saving') : t('social.add.button')}
						</button>
					</div>
					
					<div>
						<label className="text-xs uppercase tracking-wider text-gray-500">
							{t('social.channels.label')}
						</label>
						<p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
							{t('social.channels.helper')}
						</p>
						<div className="mt-3">
							{channelsLoading ? (
								<p className="text-sm text-gray-500 dark:text-gray-400">
									{t('social.channels.loading')}
								</p>
							) : channels.length === 0 ? (
								<p className="text-sm text-gray-500 dark:text-gray-400">
									{t('social.channels.empty')}
								</p>
							) : (
								<div className="flex flex-wrap gap-3">
									{channels.map((channel) => (
										<label key={channel.id}
										       className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300">
											<input
												type="checkbox"
												checked={form.channelIds.includes(channel.id)}
												onChange={() => toggleFormChannel(channel.id)}
												className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
											/>
											<span className="break-words">{channel.name}</span>
										</label>
									))}
								</div>
							)}
							{channelsError && (
								<p className="mt-2 text-xs text-red-600 dark:text-red-400">{channelsError}</p>
							)}
						</div>
					</div>
				</form>
			</div>
			
			<div
				className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
				<h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
					<Link2 className="h-5 w-5 text-indigo-500"/>
					{t('social.saved.title')}
				</h2>
				
				{status.type === 'error' && (
					<div
						className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600 dark:border-red-500/40 dark:bg-red-950/40 dark:text-red-200">
						{status.message}
					</div>
				)}
				
				{status.type === 'success' && (
					<div
						className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-950/40 dark:text-emerald-200">
						{status.message}
					</div>
				)}
				
				{loading ? (
					<p className="mt-4 text-sm text-gray-500 dark:text-gray-400">{t('social.loading')}</p>
				) : links.length === 0 ? (
					<p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
						{t('social.empty')}
					</p>
				) : (
					<div className="mt-4 space-y-3">
						{links.map((link) => (
							<div
								key={link.id}
								className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm dark:border-gray-800 dark:bg-gray-800/50"
							>
								<div className="flex flex-col gap-3 md:flex-row md:items-center">
									<input
										value={link.type}
										onChange={(event) => updateLinkField(link.id, 'type', event.target.value)}
										className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 md:w-48"
									/>
									<input
										value={link.url}
										onChange={(event) => updateLinkField(link.id, 'url', event.target.value)}
										className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
									/>
									<div className="flex gap-2 md:ml-auto">
										<button
											type="button"
											onClick={() => handleUpdate(link.id)}
											disabled={savingId === link.id}
											className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700 transition hover:border-indigo-300 disabled:cursor-not-allowed disabled:opacity-60 dark:border-indigo-500/30 dark:bg-indigo-950/40 dark:text-indigo-200"
										>
											<Save className="h-3 w-3"/>
											{savingId === link.id ? t('social.action.saving') : t('social.action.save')}
										</button>
										<button
											type="button"
											onClick={() => handleDelete(link.id)}
											disabled={deletingId === link.id}
											className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 transition hover:border-red-300 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-500/40 dark:bg-red-950/40 dark:text-red-200"
										>
											<Trash2 className="h-3 w-3"/>
											{deletingId === link.id ? t('social.action.deleting') : t('social.action.delete')}
										</button>
									</div>
								</div>
								
								<div>
									<div className="text-xs uppercase tracking-wider text-gray-500">
										{t('social.channels.label')}
									</div>
									<div className="mt-2">
										{channelsLoading ? (
											<p className="text-sm text-gray-500 dark:text-gray-400">
												{t('social.channels.loading')}
											</p>
										) : channels.length === 0 ? (
											<p className="text-sm text-gray-500 dark:text-gray-400">
												{t('social.channels.empty')}
											</p>
										) : (
											<div className="flex flex-wrap gap-3">
												{channels.map((channel) => (
													<label key={channel.id}
													       className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300">
														<input
															type="checkbox"
															checked={link.channelIds.includes(channel.id)}
															onChange={() => toggleLinkChannel(link.id, channel.id)}
															className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
														/>
														<span className="break-words">{channel.name}</span>
													</label>
												))}
											</div>
										)}
										{channelsError && (
											<p className="mt-2 text-xs text-red-600 dark:text-red-400">{channelsError}</p>
										)}
									</div>
								</div>
							</div>
						))}
					</div>
				)}
			</div>
		</div>
	)
}
