import { createYisinApi } from '~/services/yisin-api'

export function useYisinApi() {
  const config = useRuntimeConfig()
  const accessToken = useState<string | null>('yisin:access-token', () => null)

  const api = createYisinApi({
    baseUrl: config.public.yisinApiBaseUrl,
    getToken: () => accessToken.value
  })

  function setAccessToken(token: string | null) {
    accessToken.value = token
  }

  function clearAccessToken() {
    accessToken.value = null
  }

  return {
    api,
    accessToken: readonly(accessToken),
    setAccessToken,
    clearAccessToken
  }
}
