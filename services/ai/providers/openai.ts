import type { AIProvider, ImageModel, TextModel } from '../types'

const formatSchemaInstruction = (schema?: unknown) => {
	if (!schema || typeof schema !== 'object') return ''
	const schemaObj = schema as { properties?: Record<string, any>; required?: string[] }
	const properties = schemaObj.properties
	if (!properties || typeof properties !== 'object') return ''
	
	const required = Array.isArray(schemaObj.required) ? schemaObj.required : []
	const fieldList = Object.entries(properties).map(([key, def]) => {
		const typeValue = def?.type
		const itemsType = def?.items?.type
		const typeLabel = itemsType
			? `array of ${String(itemsType).toLowerCase()}`
			: String(typeValue ?? 'unknown').toLowerCase()
		return `${key} (${typeLabel})`
	})
	const requiredHint = required.length ? `Required keys: ${required.join(', ')}.` : ''
	
	return `Return a single JSON object. ${requiredHint} Fields: ${fieldList.join(', ')}. Do not add extra keys. Do not wrap in markdown.`
}

const getApiKey = (apiKey?: string): string => {
	if (!apiKey) {
		throw new Error('OPENAI API key is required')
	}
	return apiKey
}

const textModel: TextModel = {
	async generateJSON<T>({
		                      prompt,
		                      system,
		                      schema,
		                      apiKey,
	                      }: {
		prompt: string;
		system?: string;
		schema?: unknown;
		apiKey: string;
	}) {
		const baseSystem =
			system ??
			'You are a professional assistant. Always respond with valid JSON matching the required schema.'
		const schemaInstruction = formatSchemaInstruction(schema)
		const systemMessage = schemaInstruction ? `${baseSystem}\n${schemaInstruction}` : baseSystem
		const apiKeyValue = getApiKey(apiKey)
		const response = await fetch('https://api.openai.com/v1/chat/completions', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${apiKeyValue}`,
			},
			body: JSON.stringify({
				model: 'gpt-5.2',
				messages: [
					{role: 'system', content: systemMessage},
					{role: 'user', content: prompt},
				],
				response_format: {type: 'json_object'},
				temperature: 0.7,
			}),
		})
		
		if (!response.ok) {
			const error = await response.text()
			throw new Error(`OpenAI API error: ${response.status} ${error}`)
		}
		
		const data = await response.json()
		const content = data.choices?.[0]?.message?.content
		if (!content) {
			throw new Error('No content in OpenAI response')
		}
		
		return JSON.parse(content) as T
	},
}

const imageModel: ImageModel = {
	async generateImage({prompt, aspectRatio, inputImage, apiKey}) {
		if (inputImage) {
			throw new Error('OpenAI image edits are not implemented yet')
		}
		
		const apiKeyValue = getApiKey(apiKey)
		const size = aspectRatio === '16:9' ? '1536x1024' : '1024x1024'
		
		const response = await fetch('https://api.openai.com/v1/images/generations', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${apiKeyValue}`,
			},
			body: JSON.stringify({
				model: 'gpt-image-1.5',
				prompt,
				size,
				quality: 'high',
				n: 1,
			}),
		})
		
		if (!response.ok) {
			const error = await response.text()
			throw new Error(`OpenAI IMAGE API error: ${response.status} ${error}`)
		}
		
		const data = await response.json()
		const payload = data.data?.[0]
		const base64 = payload?.b64_json
		if (base64) {
			return {imageUrl: `data:image/png;base64,${base64}`, base64}
		}
		
		const imageUrl = payload?.url
		if (!imageUrl) {
			throw new Error('No image data in OpenAI response')
		}
		
		return {imageUrl}
	},
}

export const openaiProvider: AIProvider = {
	id: 'OPENAI',
	label: 'OpenAI',
	text: textModel,
	image: imageModel,
}
