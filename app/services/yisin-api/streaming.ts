import type { YisinApiClient } from './client'
import type { RunEventData, SSEEvent } from './types'

export interface StreamRunEventsOptions {
  lastEventId?: string | number
  signal?: AbortSignal
}

function parseEventBlock(block: string): SSEEvent<RunEventData> | null {
  let id = ''
  let event = ''
  const dataLines: string[] = []

  for (const rawLine of block.split('\n')) {
    const line = rawLine.endsWith('\r') ? rawLine.slice(0, -1) : rawLine

    if (!line || line.startsWith(':')) continue

    const separator = line.indexOf(':')
    const field = separator === -1 ? line : line.slice(0, separator)
    let value = separator === -1 ? '' : line.slice(separator + 1)

    if (value.startsWith(' ')) value = value.slice(1)

    if (field === 'id') id = value
    else if (field === 'event') event = value
    else if (field === 'data') dataLines.push(value)
  }

  if (!dataLines.length) return null

  const parsed = JSON.parse(dataLines.join('\n')) as RunEventData

  return {
    id,
    event: event || 'message',
    data: parsed
  }
}

export async function* streamRunEvents(
  client: YisinApiClient,
  runId: string,
  options: StreamRunEventsOptions = {}
): AsyncGenerator<SSEEvent<RunEventData>> {
  const headers = new Headers({
    Accept: 'text/event-stream'
  })

  if (options.lastEventId !== undefined) {
    headers.set('Last-Event-ID', String(options.lastEventId))
  }

  const response = await client.raw(
    `/api/v1/legal-runs/${encodeURIComponent(runId)}/events`,
    {
      method: 'GET',
      headers,
      signal: options.signal
    }
  )

  if (!response.body) {
    throw new Error('Le flux SSE YISIN ne contient aucun body lisible')
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()

      if (done) break

      buffer += decoder.decode(value, { stream: true })
      buffer = buffer.replace(/\r\n/g, '\n')

      let boundary = buffer.indexOf('\n\n')

      while (boundary !== -1) {
        const block = buffer.slice(0, boundary)
        buffer = buffer.slice(boundary + 2)

        const event = parseEventBlock(block)
        if (event) yield event

        boundary = buffer.indexOf('\n\n')
      }
    }

    buffer += decoder.decode()
    const finalBlock = buffer.trim()

    if (finalBlock) {
      const event = parseEventBlock(finalBlock)
      if (event) yield event
    }
  } finally {
    reader.releaseLock()
  }
}

export function isTerminalRunStatus(status: RunEventData['status']): boolean {
  return status === 'completed'
    || status === 'failed'
    || status === 'cancelled'
    || status === 'needs_input'
    || status === 'needs_clarification'
    || status === 'insufficient_evidence'
    || status === 'validation_rejected'
}
