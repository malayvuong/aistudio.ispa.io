import Link from "next/link";
import { Disc, History, Link2, Mic2, Settings, Users, Youtube } from "lucide-react";

import VaultStatusAlert from "@/components/dashboard/VaultStatusAlert";
import { dictionaries } from "@/i18n";
import { getLang } from "@/lib/i18n/getLang";

const tools = [
  {
    nameKey: "dashboard.tool.youtube.title",
    descriptionKey: "dashboard.tool.youtube.description",
    href: "/dashboard/tools/youtube",
    icon: Youtube,
  },
  {
    nameKey: "dashboard.tool.music.title",
    descriptionKey: "dashboard.tool.music.description",
    href: "/dashboard/tools/music",
    icon: Mic2,
  },
  {
    nameKey: "dashboard.tool.album.title",
    descriptionKey: "dashboard.tool.album.description",
    href: "/dashboard/tools/album",
    icon: Disc,
  },
];

export default async function DashboardPage() {
  const lang = await getLang();
  const dictionary = dictionaries[lang] ?? dictionaries.en;
  const t = (key: string) => dictionary[key] ?? dictionaries.en[key] ?? key;

  return (
    <div className="w-full space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {t("dashboard.title")}
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {t("dashboard.subtitle")}
        </p>
      </div>

      <VaultStatusAlert />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {tools.map((tool) => (
          <Link
            key={tool.href}
            href={tool.href}
            className="group rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-indigo-300 hover:shadow-lg dark:border-gray-800 dark:bg-gray-900"
          >
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-indigo-50 p-2 text-indigo-600 transition group-hover:bg-indigo-100 dark:bg-indigo-500/20 dark:text-indigo-300">
                <tool.icon className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {t(tool.nameKey)}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t(tool.descriptionKey)}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/dashboard/settings/providers"
          className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition hover:border-indigo-300 hover:text-indigo-600 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200"
        >
          <Settings className="h-4 w-4" />
          {t("dashboard.action.providers")}
        </Link>
        <Link
          href="/dashboard/channels"
          className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition hover:border-indigo-300 hover:text-indigo-600 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200"
        >
          <Users className="h-4 w-4" />
          {t("dashboard.action.channels")}
        </Link>
        <Link
          href="/dashboard/social"
          className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition hover:border-indigo-300 hover:text-indigo-600 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200"
        >
          <Link2 className="h-4 w-4" />
          {t("dashboard.action.social")}
        </Link>
        <Link
          href="/dashboard/history"
          className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition hover:border-indigo-300 hover:text-indigo-600 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200"
        >
          <History className="h-4 w-4" />
          {t("dashboard.action.history")}
        </Link>
      </div>
    </div>
  );
}
