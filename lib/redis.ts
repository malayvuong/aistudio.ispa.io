import 'server-only'

import { createClient, type RedisClientType } from 'redis'

let clientPromise: Promise<RedisClientType> | null = null

function getRedisUrl(): string {
	const url = process.env.REDIS_URL
	if (!url) {
		throw new Error('REDIS_URL environment variable is not set')
	}
	return url
}

function getSocketOptions(url: string) {
	const connectTimeout = Number(process.env.REDIS_CONNECT_TIMEOUT_MS ?? '10000')
	const keepAlive = Number(process.env.REDIS_KEEP_ALIVE_MS ?? '10000')
	const tlsEnabled = url.startsWith('rediss://') || process.env.REDIS_TLS === 'true'
	const rejectUnauthorized = process.env.REDIS_TLS_REJECT_UNAUTHORIZED !== 'false'
	const servername = process.env.REDIS_TLS_SERVERNAME
	
	const socket: {
		connectTimeout: number
		keepAlive: number
		reconnectStrategy: (retries: number) => number
		tls?: boolean
		rejectUnauthorized?: boolean
		servername?: string
	} = {
		connectTimeout,
		keepAlive,
		reconnectStrategy: (retries) => Math.min(retries * 200, 2000),
	}
	
	if (tlsEnabled) {
		socket.tls = true
		socket.rejectUnauthorized = rejectUnauthorized
		if (servername) {
			socket.servername = servername
		}
	}
	
	return socket
}

export async function getRedisClient(): Promise<RedisClientType> {
	if (!clientPromise) {
		const url = getRedisUrl()
		const socket = getSocketOptions(url)
		
		if (process.env.NODE_ENV === 'development') {
			console.log('Connecting to Redis with URL:', url.replace(/:.*@/, ':***@'))
		}
		
		const client = createClient({url, socket})
		
		client.on('error', (err) => {
			console.error('Redis Client Error:', err)
			if (!client.isOpen) {
				clientPromise = null
			}
		})
		
		client.on('connect', () => console.log('Redis connected'))
		client.on('ready', () => console.log('Redis ready to use'))
		
		// @ts-ignore
		clientPromise = client
			.connect()
			.then(() => {
				console.log('Redis connection established')
				return client
			})
			.catch((err) => {
				console.error('Failed to connect to Redis:', err)
				clientPromise = null
				throw err
			})
	}

	const instance = clientPromise
	if (!instance) {
		throw new Error('Redis client unavailable')
	}
	return instance
}
