import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Clock, FileText, Image as ImageIcon, Tag } from 'lucide-react'

import RerunPanel from '@/components/dashboard/history/RerunPanel'
import { ensurePrismaUser } from '@/lib/auth/ensurePrismaUser'
import { requireUser } from '@/lib/auth/requireUser'
import { prisma } from '@/lib/prisma'
import { dictionaries } from '@/i18n'
import { getLang } from '@/lib/i18n/getLang'

const formatDate = (value: Date) => value.toLocaleString()

const formatJson = (value: unknown) => JSON.stringify(value ?? {}, null, 2)

export default async function HistoryDetailPage({params}: { params: { id: string } }) {
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
	
	const history = await prisma.generationHistory.findFirst({
		where: {id: params.id, userId},
		include: {assets: true},
	})
	
	if (!history) {
		notFound()
	}
	
	return (
		<div className="container mx-auto px-4 space-y-6">
			<div>
				<Link
					href="/dashboard/history"
					className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
				>
					← {t('history.detail.back')}
				</Link>
				<h1 className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
					{t('history.detail.title')}
				</h1>
				<div className="mt-2 flex flex-wrap gap-3 text-sm text-gray-600 dark:text-gray-300">
          <span
	          className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1 dark:border-gray-700 dark:bg-gray-900">
            <Tag className="h-3.5 w-3.5 text-gray-500"/>
	          {history.feature.replace(/_/g, ' ')}
          </span>
					<span
						className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1 dark:border-gray-700 dark:bg-gray-900">
            <Clock className="h-3.5 w-3.5 text-gray-500"/>
						{formatDate(history.createdAt)}
          </span>
					<span
						className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1 dark:border-gray-700 dark:bg-gray-900">
            <FileText className="h-3.5 w-3.5 text-gray-500"/>
						{history.status}
          </span>
				</div>
			</div>
			
			<RerunPanel feature={history.feature} inputPayload={history.inputPayload}/>
			
			<div className="grid gap-6 lg:grid-cols-2">
				<div
					className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
					<h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500">
						{t('label.inputPayload')}
					</h2>
					<pre
						className="mt-3 whitespace-pre-wrap break-words rounded-lg border border-gray-100 bg-gray-50 p-4 text-xs text-gray-700 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-300">
            {formatJson(history.inputPayload)}
          </pre>
				</div>
				
				<div
					className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
					<h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500">
						{t('label.outputPayload')}
					</h2>
					<pre
						className="mt-3 whitespace-pre-wrap break-words rounded-lg border border-gray-100 bg-gray-50 p-4 text-xs text-gray-700 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-300">
            {formatJson(history.outputPayload)}
          </pre>
				</div>
			</div>
			
			<div
				className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
				<h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 flex items-center gap-2">
					<ImageIcon className="h-4 w-4"/>
					{t('label.assets')}
				</h2>
				{history.assets.length === 0 ? (
					<p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
						{t('history.assets.empty')}
					</p>
				) : (
					<div className="mt-3 space-y-3">
						{history.assets.map((asset) => (
							<div
								key={asset.id}
								className="flex min-w-0 flex-col gap-2 rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-200 md:flex-row md:items-center md:justify-between"
							>
								<div className="min-w-0">
									<div className="font-semibold break-words">{asset.type}</div>
									<div
										className="text-xs text-gray-500 dark:text-gray-400 break-words">{asset.id}</div>
								</div>
								<Link
									href={asset.url}
									target="_blank"
									className="text-indigo-600 hover:underline dark:text-indigo-300"
								>
									{t('history.assets.view')}
								</Link>
							</div>
						))}
					</div>
				)}
			</div>
		</div>
	)
}
