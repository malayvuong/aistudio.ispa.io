'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Disc, History, KeyRound, LayoutDashboard, Link2, Menu, Mic2, Users, X, Youtube } from 'lucide-react'
import { useState } from 'react'
import { useT } from '@/components/i18n/LanguageProvider'

const NAV_ITEMS = [
	{label: 'nav.dashboard', path: '/dashboard', icon: LayoutDashboard},
	{label: 'nav.youtube', path: '/dashboard/tools/youtube', icon: Youtube},
	{label: 'nav.music', path: '/dashboard/tools/music', icon: Mic2},
	{label: 'nav.album', path: '/dashboard/tools/album', icon: Disc},
	{label: 'nav.providers', path: '/dashboard/settings/providers', icon: KeyRound},
	{label: 'nav.channels', path: '/dashboard/channels', icon: Users},
	{label: 'nav.social', path: '/dashboard/social', icon: Link2},
	{label: 'nav.history', path: '/dashboard/history', icon: History},
]

const DashboardShell = ({children}: { children: React.ReactNode }) => {
	const pathname = usePathname()
	const [menuOpen, setMenuOpen] = useState(false)
	const t = useT()
	
	return (
		<div className="w-full">
			<div className="mx-auto w-full container px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
				<div className="flex items-center justify-between pb-4 lg:hidden">
					<button
						type="button"
						onClick={() => setMenuOpen(true)}
						className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 shadow-sm transition hover:border-indigo-300 hover:text-indigo-600 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200"
					>
						<Menu className="h-4 w-4"/>
						{t('nav.menu')}
					</button>
				</div>
				
				<div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
					<aside
						className="hidden rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900 lg:block">
						<nav className="space-y-1">
							{NAV_ITEMS.map((item) => {
								const isActive = pathname === item.path
								const Icon = item.icon
								return (
									<Link
										key={item.path}
										href={item.path}
										className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
											isActive
												? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300'
												: 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white'
										}`}
									>
										<Icon className="h-4 w-4"/>
										{t(item.label)}
									</Link>
								)
							})}
						</nav>
					</aside>
					
					<div className="min-w-0">{children}</div>
				</div>
			</div>
			
			<div
				className={`fixed inset-0 z-50 bg-black/40 transition ${
					menuOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
				}`}
				onClick={() => setMenuOpen(false)}
			/>
			<div
				className={`fixed inset-y-0 left-0 z-50 w-72 transform bg-white p-5 shadow-xl transition dark:bg-gray-950 ${
					menuOpen ? 'translate-x-0' : '-translate-x-full'
				}`}
			>
				<div className="flex items-center justify-between">
					<div className="text-sm font-semibold text-gray-900 dark:text-white">
						{t('nav.navigation')}
					</div>
					<button
						type="button"
						onClick={() => setMenuOpen(false)}
						className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
					>
						<X className="h-4 w-4"/>
					</button>
				</div>
				<nav className="mt-4 space-y-1">
					{NAV_ITEMS.map((item) => {
						const isActive = pathname === item.path
						const Icon = item.icon
						return (
							<Link
								key={item.path}
								href={item.path}
								onClick={() => setMenuOpen(false)}
								className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
									isActive
										? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300'
										: 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white'
								}`}
							>
								<Icon className="h-4 w-4"/>
								{t(item.label)}
							</Link>
						)
					})}
				</nav>
			</div>
		</div>
	)
}

export default DashboardShell
