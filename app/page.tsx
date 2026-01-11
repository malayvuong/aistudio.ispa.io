import Link from 'next/link'
import { Music, Shield, Sparkles, Wand2 } from 'lucide-react'

import { dictionaries } from '@/i18n'
import { getLang } from '@/lib/i18n/getLang'

export default async function Home() {
	const lang = await getLang()
	const dictionary = dictionaries[lang] ?? dictionaries.en
	const t = (key: string) => dictionary[key] ?? dictionaries.en[key] ?? key
	
	return (
		<div className="w-full">
			<section className="relative overflow-hidden">
				<div
					className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-white to-indigo-100 dark:from-gray-950 dark:via-gray-950 dark:to-indigo-950"/>
				<div className="absolute -top-24 right-0 h-72 w-72 rounded-full bg-indigo-400/20 blur-3xl"/>
				<div className="absolute bottom-0 left-0 h-72 w-72 rounded-full bg-sky-400/20 blur-3xl"/>
				
				<div className="relative mx-auto container px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
					<div className="max-w-2xl space-y-6">
						<div
							className="inline-flex items-center gap-2 rounded-full border border-indigo-200/60 bg-white/70 px-3 py-1 text-xs uppercase tracking-[0.2em] text-indigo-600 dark:border-indigo-500/30 dark:bg-gray-900/70 dark:text-indigo-300">
							<Sparkles className="h-3.5 w-3.5"/>
							{t('landing.badge')}
						</div>
						<h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-5xl">
							{t('landing.title')}
						</h1>
						<p className="text-lg text-gray-600 dark:text-gray-300">
							{t('landing.subtitle')}
						</p>
						<div className="flex flex-wrap items-center gap-3">
							<Link
								href="/register"
								className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 transition hover:bg-indigo-500"
							>
								{t('landing.cta.register')}
							</Link>
							<Link
								href="/login"
								className="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-gray-700 shadow-sm transition hover:border-indigo-300 hover:text-indigo-600 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-200"
							>
								{t('landing.cta.login')}
							</Link>
						</div>
					</div>
					
					<div className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
						{[
							{
								title: t('landing.feature.prompts.title'),
								description: t('landing.feature.prompts.description'),
								icon: Wand2,
							},
							{
								title: t('landing.feature.youtube.title'),
								description: t('landing.feature.youtube.description'),
								icon: Music,
							},
							{
								title: t('landing.feature.vault.title'),
								description: t('landing.feature.vault.description'),
								icon: Shield,
							},
						].map((card) => (
							<div
								key={card.title}
								className="rounded-2xl border border-gray-200 bg-white/80 p-6 shadow-sm backdrop-blur-sm transition hover:-translate-y-1 hover:shadow-lg dark:border-gray-800 dark:bg-gray-900/70"
							>
								<card.icon className="h-6 w-6 text-indigo-600 dark:text-indigo-400"/>
								<h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">
									{card.title}
								</h3>
								<p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{card.description}</p>
							</div>
						))}
					</div>
				</div>
			</section>
			
			<section className="mx-auto w-full container px-4 py-16 sm:px-6 lg:px-8">
				<div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
					<div className="space-y-4">
						<h2 className="text-3xl font-bold text-gray-900 dark:text-white">
							{t('landing.section.title')}
						</h2>
						<p className="text-gray-600 dark:text-gray-300">
							{t('landing.section.body')}
						</p>
						<ul className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
							<li>• {t('landing.section.bullet1')}</li>
							<li>• {t('landing.section.bullet2')}</li>
							<li>• {t('landing.section.bullet3')}</li>
						</ul>
					</div>
					<div
						className="rounded-2xl border border-gray-200 bg-gradient-to-br from-indigo-500/10 via-white to-indigo-500/5 p-6 shadow-sm dark:border-gray-800 dark:from-indigo-500/20 dark:via-gray-950 dark:to-indigo-500/5">
						<div
							className="rounded-xl border border-dashed border-indigo-200 bg-white/70 p-6 text-sm text-gray-600 dark:border-indigo-500/30 dark:bg-gray-900/60 dark:text-gray-300">
							<p className="font-semibold text-gray-800 dark:text-white">
								{t('landing.quickstart.title')}
							</p>
							<ol className="mt-3 space-y-2">
								<li>1. {t('landing.quickstart.step1')}</li>
								<li>2. {t('landing.quickstart.step2')}</li>
								<li>3. {t('landing.quickstart.step3')}</li>
							</ol>
						</div>
					</div>
				</div>
			</section>
		</div>
	)
}
