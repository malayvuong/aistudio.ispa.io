import Link from 'next/link'
import { History } from 'lucide-react'

import { ensurePrismaUser } from '@/lib/auth/ensurePrismaUser'
import { requireUser } from '@/lib/auth/requireUser'
import { dictionaries } from '@/i18n'
import { getLang } from '@/lib/i18n/getLang'
import { prisma } from '@/lib/prisma'

const getObject = (value: unknown): Record<string, unknown> | null => {
	if (!value || typeof value !== 'object' || Array.isArray(value)) return null
	return value as Record<string, unknown>
}

const summarizeInput = (inputPayload: unknown, t: (key: string) => string): string => {
	const data = getObject(inputPayload)
	if (!data) return t('history.inputEmpty')
	if (typeof data.songName === 'string' && data.songName.trim()) return data.songName
	if (typeof data.subject === 'string' && data.subject.trim()) return data.subject
	if (typeof data.lyrics === 'string' && data.lyrics.trim()) {
		return data.lyrics.trim().slice(0, 80)
	}
	return t('history.inputFallback')
}

const summarizeOutput = (outputPayload: unknown, t: (key: string) => string): string => {
	const data = getObject(outputPayload)
	if (!data) return t('history.outputEmpty')
	if (typeof data.youtubeTitle === 'string') return data.youtubeTitle
	if (typeof data.albumTitle === 'string') return data.albumTitle
	if (typeof data.prompt === 'string') return data.prompt.slice(0, 80)
	if (typeof data.error === 'string') return `${t('history.errorPrefix')} ${data.error}`
	return t('history.outputFallback')
}

const formatDate = (value: Date) => value.toLocaleString()

export default async function DashboardHistoryPage() {
	const user = await requireUser()
	if (!user) {
		return null
	}
	const userId = await ensurePrismaUser(user)
	if (!userId) {
		return null
	}
	const lang = await getLang()
	const dictionary = dictionaries[lang] ?? dictionaries.en
	const t = (key: string) => dictionary[key] ?? dictionaries.en[key] ?? key
	
	const items = await prisma.generationHistory.findMany({
		where: {userId},
		orderBy: {createdAt: 'desc'},
		take: 50,
		select: {
			id: true,
			feature: true,
			status: true,
			createdAt: true,
			inputPayload: true,
			outputPayload: true,
		},
	})
	
	return (
		<div className="container mx-auto px-4 space-y-6">
			<div>
				<h1 className="text-2xl font-bold text-gray-900 dark:text-white">
					{t('tool.history.title')}
				</h1>
				<p className="text-sm text-gray-500 dark:text-gray-400">
					{t('tool.history.subtitle')}
				</p>
			</div>
			
			<div
				className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
				{items.length === 0 ? (
					<div className="p-10 text-center text-sm text-gray-500 dark:text-gray-400">
						<History className="mx-auto h-8 w-8 text-gray-400"/>
						<p className="mt-2">{t('history.empty')}</p>
					</div>
				) : (
					<div className="divide-y divide-gray-100 dark:divide-gray-800">
						{items.map((item) => (
							<Link
								key={item.id}
								href={`/dashboard/history/${item.id}`}
								className="flex min-w-0 flex-col gap-3 px-5 py-4 transition hover:bg-gray-50 dark:hover:bg-gray-800/60 md:flex-row md:items-center"
							>
								<div className="min-w-0 md:min-w-[150px]">
									<div className="text-xs uppercase tracking-wider text-gray-400">
										{t('label.feature')}
									</div>
									<div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
										{item.feature.replace(/_/g, ' ')}
									</div>
								</div>
								<div className="min-w-0 md:min-w-[120px]">
									<div className="text-xs uppercase tracking-wider text-gray-400">
										{t('label.status')}
									</div>
									<div className="text-sm font-semibold text-gray-700 dark:text-gray-200">
										{item.status}
									</div>
								</div>
								<div className="min-w-0 md:min-w-[180px]">
									<div className="text-xs uppercase tracking-wider text-gray-400">
										{t('label.created')}
									</div>
									<div className="text-sm text-gray-600 dark:text-gray-300">
										{formatDate(item.createdAt)}
									</div>
								</div>
								<div className="min-w-0 flex-1">
									<div className="text-xs uppercase tracking-wider text-gray-400">
										{t('label.input')}
									</div>
									<div className="text-sm text-gray-600 dark:text-gray-300 break-words md:truncate">
										{summarizeInput(item.inputPayload, t)}
									</div>
								</div>
								<div className="min-w-0 flex-1">
									<div className="text-xs uppercase tracking-wider text-gray-400">
										{t('label.output')}
									</div>
									<div className="text-sm text-gray-600 dark:text-gray-300 break-words md:truncate">
										{summarizeOutput(item.outputPayload, t)}
									</div>
								</div>
							</Link>
						))}
					</div>
				)}
			</div>
		</div>
	)
}
