import dayjs from 'dayjs'

interface TelegramOptions {
    message?: string
    title?: string
    exception?: unknown
    isAttach?: boolean
    message_thread_id?: number

    [key: string]: any
}

let TELEGRAM_TOKEN = ''
let TELEGRAM_CHAT_ID = ''
let TELEGRAM_API_URL = ''

const MARKDOWN_V2_SPECIALS = ['_', '[', ']', '(', ')', '~', '>', '#', '+', '-', '=', '|', '{', '}', '.', '!']

const getAppEnv = () => (process.env.APP_ENV ?? process.env.NODE_ENV ?? 'debug').toUpperCase()
const getAppName = () => process.env.APP_NAME ?? 'iSPA CMS'

const init = () => {
    TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN ?? ''
    TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID ?? ''
    TELEGRAM_API_URL = TELEGRAM_TOKEN ? `https://api.telegram.org/bot${TELEGRAM_TOKEN}/` : ''

    if (!TELEGRAM_TOKEN || !TELEGRAM_CHAT_ID) {
        console.error('TelegramService: Token or Chat ID not set')
    }
}

const getIconByType = (type: string): string => {
    switch (type) {
        case 'error':
            return '🚨'
        case 'warning':
            return '⚠️'
        case 'info':
            return 'ℹ️'
        default:
            return '🔔'
    }
}

const escapeMarkdownV2 = (text: string): string =>
    MARKDOWN_V2_SPECIALS.reduce((acc, char) => acc.split(char).join(`\\${char}`), text)

const escapeCodeBlock = (text: string): string =>
    text.replace(/\\/g, '\\\\').replace(/`/g, '\\`')

const subString = (value: string, length = 4000): string => {
    const chars = Array.from(value)
    if (chars.length <= length) return value

    let slice = chars.slice(0, length).join('')
    const fenceCount = (slice.match(/```/g) ?? []).length
    if (fenceCount % 2 !== 0) {
        console.debug('TelegramService: Message truncated to fit length limit', value)
        return `${slice}\`\`\``
    }

    const tmp = slice.replace(/```/g, '')
    const backtickCount = (tmp.match(/`/g) ?? []).length
    if (backtickCount % 2 !== 0) {
        slice += '`'
    }

    console.debug('TelegramService: Message truncated to fit length limit', value)
    return slice
}

const getExceptionLocation = (exception: Error): string | null => {
    const stack = exception.stack ?? ''
    const match =
        stack.match(/\(([^)]+):(\d+):(\d+)\)/) ??
        stack.match(/at ([^ ]+):(\d+):(\d+)/)
    if (!match) return null
    return `${match[1]}:${match[2]}`
}

const resolveBaseUrl = (): string | null => {
    const direct =
        process.env.APP_URL ??
        process.env.NEXT_PUBLIC_APP_URL ??
        process.env.NEXT_PUBLIC_SITE_URL ??
        process.env.SITE_URL

    if (direct) {
        return direct.replace(/\/$/, '')
    }

    if (process.env.VERCEL_URL) {
        const normalized = process.env.VERCEL_URL.replace(/^https?:\/\//, '')
        return `https://${normalized}`
    }

    return null
}

const createTraceFileUrl = async (exception: Error): Promise<string | null> => {
    const baseUrl = resolveBaseUrl()
    if (!baseUrl) return null

    try {
        const fs = await import('node:fs/promises')
        const path = await import('node:path')
        const fileName = `trace_${dayjs().format('YYYYMMDD_HHmmss')}.log`
        const dirPath = path.join(process.cwd(), 'public', 'logs', 'telegram_errors')

        await fs.mkdir(dirPath, { recursive: true })

        const location = getExceptionLocation(exception)
        const traceContent = [
            `Exception: ${exception.message}`,
            location ?? '',
            'Trace:',
            exception.stack ?? '',
        ].join('\n')

        await fs.writeFile(path.join(dirPath, fileName), traceContent)

        return `${baseUrl}/logs/telegram_errors/${fileName}`
    } catch (error) {
        console.error('TelegramService: Failed to write trace log', error)
        return null
    }
}

export const TelegramService = {
    isDiscovery: true,
    init,

    setTitle(title = ''): string {
        const env = getAppEnv()
        const appName = getAppName()
        return `*${appName}* (${env})\n\n${title || 'Thông báo hệ thống'}`
    },

    async send(data: TelegramOptions): Promise<boolean> {
        if (!TELEGRAM_TOKEN || !TELEGRAM_CHAT_ID) {
            init()
        }
        if (!TELEGRAM_TOKEN || !TELEGRAM_CHAT_ID) return false

        const message = String(data.message ?? '')
        const exception = data.exception
        const attachTrace =
            typeof data.isAttach === 'boolean'
                ? data.isAttach
                : (process.env.APP_ENV ?? process.env.NODE_ENV ?? 'debug') === 'production'
        let traceFileUrl: string | null = null

        let fields = ''
        if (exception instanceof Error) {
            const location = getExceptionLocation(exception)
            if (location) {
                fields += `\n\n\`File:\` _${escapeMarkdownV2(location)}_`
            }

            if (attachTrace) {
                traceFileUrl = await createTraceFileUrl(exception)
            }
        }

        const messageTitle = data.title ?? this.setTitle()
        const messageThreadId = data.message_thread_id

        delete data.message
        delete data.title
        delete data.exception
        delete data.isAttach
        delete data.message_thread_id

        if (Object.keys(data).length > 0) {
            fields += '\n\n*Thông tin bổ sung*'
            for (const [key, value] of Object.entries(data)) {
                let formattedValue = ''
                if (typeof value === 'string') {
                    formattedValue = value
                } else {
                    try {
                        formattedValue = JSON.stringify(value, null, 2)
                    } catch {
                        formattedValue = String(value)
                    }
                }
                fields += `\n_${escapeMarkdownV2(String(key))}:_ \`\`\`${escapeCodeBlock(formattedValue)}\`\`\``
            }
        }

        const formattedMessage =
            `${escapeMarkdownV2(messageTitle)}` +
            `\n\n_Mô tả:_\n\`\`\`${escapeCodeBlock(message)}\`\`\`` +
            `\n\n_Thời gian:_ _${escapeMarkdownV2(dayjs().format('YYYY-MM-DD HH:mm:ss'))}_` +
            fields

        const payload: Record<string, unknown> = {
            chat_id: TELEGRAM_CHAT_ID,
            text: subString(formattedMessage),
            parse_mode: 'MarkdownV2',
        }

        if (traceFileUrl) {
            payload.reply_markup = JSON.stringify({
                inline_keyboard: [[{ text: '📄 Xem Trace Log', url: traceFileUrl }]],
            })
        }

        if (messageThreadId) {
            payload.message_thread_id = messageThreadId
        }

        try {
            const res = await fetch(`${TELEGRAM_API_URL}sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            })

            if (!res.ok) {
                console.error('TelegramService: Gửi thông báo thất bại', {
                    response: await res.text(),
                    payload,
                })
                return false
            }

            return true
        } catch (error) {
            console.error('TelegramService: Gửi thông báo thất bại', {
                exception: error instanceof Error ? error.message : String(error),
            })
            return false
        }
    },

    async error(data: TelegramOptions) {
        data.title = this.setTitle(`${getIconByType('error')} *Cảnh báo lỗi hệ thống!*`)
        await this.send(data)
    },

    async warning(data: TelegramOptions) {
        data.title = this.setTitle(`${getIconByType('warning')} *Cảnh báo!*`)
        await this.send(data)
    },

    async info(data: TelegramOptions) {
        data.title = this.setTitle(`${getIconByType('info')} *Thông báo hệ thống*`)
        await this.send(data)
    },
}
