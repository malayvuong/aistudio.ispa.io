'use client'

import React from 'react'

import { GITHUB_REPO_URL } from '@/lib/constants'
import { useT } from '@/components/i18n/LanguageProvider'

const Footer: React.FC = () => {
	const t = useT()
	
	return (
		<footer
			className="w-full border-t border-gray-200 dark:border-gray-800 bg-white/50 dark:bg-gray-950/50 backdrop-blur-sm transition-colors duration-300 py-6 mt-auto relative z-20">
			<div className="mx-auto w-full container px-4 sm:px-6 lg:px-8 text-center">
				<p className="text-sm text-gray-500 dark:text-gray-400 flex flex-wrap items-center justify-center gap-1">
					&copy; {new Date().getFullYear()}
					<a
						href="https://ispa.io"
						target="_blank"
						rel="noopener noreferrer"
						className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors font-medium border-b border-transparent hover:border-indigo-500"
					>
						iSPA Team.
					</a> {t('footer.rights')}
					<span className="mx-2 text-gray-300 dark:text-gray-700">•</span>
					<a
						href={GITHUB_REPO_URL}
						target="_blank"
						rel="noopener noreferrer"
						className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors font-medium border-b border-transparent hover:border-indigo-500"
					>
						{t('footer.github')}
					</a>
				</p>
			</div>
		</footer>
	)
}

export default Footer
