'use client'

import React, { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
	ChevronDown,
	Disc,
	History,
	KeyRound,
	LayoutDashboard,
	Link2,
	LogIn,
	LogOut,
	Mic2,
	Moon,
	Sun,
	User,
	Users,
	Youtube,
} from 'lucide-react'
import { useI18n, useT } from '@/components/i18n/LanguageProvider'
import type { Lang } from '@/i18n'
import { GITHUB_REPO_URL } from '@/lib/constants'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'

const ACCOUNT_LINKS = [
	{labelKey: 'nav.youtubePackage', path: '/dashboard/tools/youtube', icon: Youtube},
	{labelKey: 'nav.musicGenerator', path: '/dashboard/tools/music', icon: Mic2},
	{labelKey: 'nav.album', path: '/dashboard/tools/album', icon: Disc},
	{labelKey: 'nav.providers', path: '/dashboard/settings/providers', icon: KeyRound},
	{labelKey: 'nav.channels', path: '/dashboard/channels', icon: Users},
	{labelKey: 'nav.socialLinks', path: '/dashboard/social', icon: Link2},
	{labelKey: 'nav.history', path: '/dashboard/history', icon: History},
]

const truncateEmail = (email: string) => {
	if (email.length <= 18) return email
	return `${email.slice(0, 6)}...${email.slice(-10)}`
}

const TopNav: React.FC = () => {
	const pathname = usePathname()
	const router = useRouter()
	const {lang, setLang} = useI18n()
	const t = useT()
	const [isDarkMode, setIsDarkMode] = useState(() => {
		if (typeof window === 'undefined') return true
		return localStorage.getItem('theme') !== 'light'
	})
	const [accountOpen, setAccountOpen] = useState(false)
	const dropdownRef = useRef<HTMLDivElement>(null)
	const [userEmail, setUserEmail] = useState<string | null>(null)
	const [authLoading, setAuthLoading] = useState(true)
	
	useEffect(() => {
		if (isDarkMode) {
			document.documentElement.classList.add('dark')
			localStorage.setItem('theme', 'dark')
		} else {
			document.documentElement.classList.remove('dark')
			localStorage.setItem('theme', 'light')
		}
	}, [isDarkMode])
	
	useEffect(() => {
		let active = true
		let unsubscribe: (() => void) | null = null
		
		const loadUser = async () => {
			try {
				const supabase = createSupabaseBrowserClient()
				const {data} = await supabase.auth.getUser()
				if (active) {
					setUserEmail(data.user?.email ?? null)
					setAuthLoading(false)
				}
				const {data: listener} = supabase.auth.onAuthStateChange((_event, session) => {
					if (!active) return
					setUserEmail(session?.user?.email ?? null)
					setAuthLoading(false)
				})
				unsubscribe = () => listener.subscription.unsubscribe()
			} catch {
				if (active) {
					setUserEmail(null)
					setAuthLoading(false)
				}
			}
		}
		
		loadUser()
		return () => {
			active = false
			if (unsubscribe) unsubscribe()
		}
	}, [])
	
	useEffect(() => {
		if (!accountOpen) return
		const handleClick = (event: MouseEvent) => {
			if (!dropdownRef.current?.contains(event.target as Node)) {
				setAccountOpen(false)
			}
		}
		const handleKey = (event: KeyboardEvent) => {
			if (event.key === 'Escape') setAccountOpen(false)
		}
		document.addEventListener('mousedown', handleClick)
		document.addEventListener('keydown', handleKey)
		return () => {
			document.removeEventListener('mousedown', handleClick)
			document.removeEventListener('keydown', handleKey)
		}
	}, [accountOpen])
	
	const toggleTheme = () => {
		setIsDarkMode((prev) => !prev)
	}
	
	const handleLangChange = async (nextLang: Lang) => {
		if (nextLang === lang) return
		try {
			const response = await fetch('/api/i18n/lang', {
				method: 'POST',
				headers: {'Content-Type': 'application/json'},
				body: JSON.stringify({lang: nextLang}),
			})
			if (response.ok) {
				setLang(nextLang)
				router.refresh()
			}
		} catch {
			// ignore
		}
	}
	
	const isAuthenticated = Boolean(userEmail)
	const showLogin = !authLoading && !isAuthenticated
	const showAccount = !authLoading && isAuthenticated
	const isDashboard = pathname?.startsWith('/dashboard')
	
	return (
		<header
			className="sticky top-0 z-50 w-full border-b border-gray-200 bg-white/80 backdrop-blur-md transition-colors duration-300 dark:border-gray-800 dark:bg-gray-950/80">
			<div className="mx-auto flex h-16 gap-4 w-full container items-center justify-between px-4 sm:px-6 lg:px-8">
				<div className="flex min-w-0 flex-1 items-center gap-3">
					<div className="rounded-lg bg-indigo-600 p-1.5">
						<Disc className="h-5 w-5 text-white"/>
					</div>
					<Link href="/"
					      className="hidden whitespace-nowrap text-lg font-bold text-gray-900 dark:text-white sm:block">
						{t('brand.name')}
					</Link>
					
					<nav className="ml-auto flex items-center gap-2 whitespace-nowrap">
						<span className="flex-1"></span>
						<Link
							href="/dashboard"
							className={`inline-flex items-center gap-2 rounded-md px-2.5 py-2 text-sm font-medium transition ${
								isDashboard
									? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300'
									: 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white'
							}`}
						>
							<LayoutDashboard className="h-4 w-4"/>
							<span className="hidden sm:inline">{t('nav.dashboard')}</span>
						</Link>
						
						{showLogin && (
							<Link
								href="/login"
								className="inline-flex items-center gap-2 rounded-md px-2.5 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
							>
								<LogIn className="h-4 w-4"/>
								<span className="hidden sm:inline">{t('nav.login')}</span>
							</Link>
						)}
						
						{showAccount && (
							<div ref={dropdownRef} className="relative">
								<button
									type="button"
									onClick={() => setAccountOpen((prev) => !prev)}
									className="inline-flex items-center gap-2 rounded-md px-2.5 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
									aria-expanded={accountOpen}
									aria-haspopup="menu"
								>
									<User className="h-4 w-4"/>
									<span className="hidden sm:inline">{t('nav.account')}</span>
									{userEmail && (
										<span
											className="hidden lg:inline max-w-[140px] truncate text-xs text-gray-500 dark:text-gray-400">
                      {truncateEmail(userEmail)}
                    </span>
									)}
									<ChevronDown className={`h-4 w-4 transition ${accountOpen ? 'rotate-180' : ''}`}/>
								</button>
								
								{accountOpen && (
									<div
										className="absolute right-0 mt-2 w-56 rounded-md border border-gray-200 bg-white shadow-md dark:border-gray-700 dark:bg-gray-900"
										role="menu"
									>
										{userEmail && (
											<div
												className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400 truncate">
												{userEmail}
											</div>
										)}
										<div className="py-1">
											{ACCOUNT_LINKS.map((item) => {
												const Icon = item.icon
												return (
													<Link
														key={item.path}
														href={item.path}
														onClick={() => setAccountOpen(false)}
														className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-800"
														role="menuitem"
													>
														<Icon className="h-4 w-4 text-gray-400"/>
														{t(item.labelKey)}
													</Link>
												)
											})}
										</div>
										<div className="border-t border-gray-100 px-2 py-2 dark:border-gray-800">
											<form action="/logout" method="post">
												<button
													type="submit"
													className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-900/20"
												>
													<LogOut className="h-4 w-4"/>
													{t('nav.logout')}
												</button>
											</form>
										</div>
									</div>
								)}
							</div>
						)}
					</nav>
				</div>
				
				<div className="flex items-center gap-2 shrink-0">
					<a
						href={GITHUB_REPO_URL}
						target="_blank"
						rel="noopener noreferrer"
						className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 transition hover:border-indigo-300 hover:text-indigo-600 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:hover:text-white"
						title={t('nav.github')}
						aria-label={t('nav.github')}
					>
						<svg
							viewBox="0 0 24 24"
							className="h-4 w-4"
							aria-hidden="true"
							fill="currentColor"
						>
							<path
								d="M12 2.25c-5.52 0-10 4.48-10 10 0 4.4 2.86 8.13 6.84 9.45.5.1.68-.22.68-.48 0-.24-.01-.87-.01-1.7-2.78.6-3.37-1.19-3.37-1.19-.45-1.15-1.11-1.46-1.11-1.46-.91-.62.07-.61.07-.61 1 .07 1.53 1.04 1.53 1.04.9 1.54 2.36 1.1 2.94.84.09-.65.35-1.1.64-1.35-2.22-.25-4.56-1.11-4.56-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.64 0 0 .84-.27 2.75 1.02a9.6 9.6 0 0 1 5 0c1.91-1.29 2.75-1.02 2.75-1.02.55 1.37.2 2.39.1 2.64.64.7 1.03 1.59 1.03 2.68 0 3.84-2.35 4.68-4.58 4.93.36.31.68.92.68 1.86 0 1.34-.01 2.41-.01 2.74 0 .26.18.58.69.48A10.01 10.01 0 0 0 22 12.25c0-5.52-4.48-10-10-10Z"/>
						</svg>
					</a>
					<div
						className="flex items-center rounded-full border border-gray-200 bg-white text-xs font-semibold text-gray-600 shadow-sm dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300">
						<button
							type="button"
							onClick={() => handleLangChange('en')}
							className={`rounded-full px-2.5 py-1 transition ${
								lang === 'en'
									? 'bg-indigo-600 text-white'
									: 'hover:bg-gray-100 dark:hover:bg-gray-800'
							}`}
						>
							{t('nav.language.en')}
						</button>
						<button
							type="button"
							onClick={() => handleLangChange('vi')}
							className={`rounded-full px-2.5 py-1 transition ${
								lang === 'vi'
									? 'bg-indigo-600 text-white'
									: 'hover:bg-gray-100 dark:hover:bg-gray-800'
							}`}
						>
							{t('nav.language.vi')}
						</button>
					</div>
					<button
						onClick={toggleTheme}
						className="rounded-full bg-gray-100 p-2 text-gray-700 transition-colors hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
						title={t('nav.themeToggle')}
						aria-label={t('nav.themeToggle')}
					>
						{isDarkMode ? <Sun className="h-4 w-4"/> : <Moon className="h-4 w-4"/>}
					</button>
				</div>
			</div>
		</header>
	)
}

export default TopNav
