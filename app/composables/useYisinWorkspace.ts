import type { MeResponse, Workspace } from '~/services/yisin-api'

function getPreferredWorkspace(workspaces: Workspace[], currentId: string | null) {
  return workspaces.find(workspace => workspace.workspace_id === currentId)
    ?? workspaces.find(workspace => workspace.kind === 'personal')
    ?? workspaces[0]
    ?? null
}

export function useYisinWorkspace() {
  const { api, accessToken } = useYisinApi()

  const identity = useState<MeResponse | null>('yisin:identity', () => null)
  const currentWorkspaceId = useState<string | null>('yisin:workspace-id', () => null)
  const loading = useState<boolean>('yisin:identity-loading', () => false)
  const error = useState<Error | null>('yisin:identity-error', () => null)

  const workspaces = computed(() => identity.value?.workspaces ?? [])
  const workspace = computed(() => getPreferredWorkspace(workspaces.value, currentWorkspaceId.value))

  async function loadIdentity() {
    if (!accessToken.value) {
      identity.value = null
      error.value = null
      return null
    }

    loading.value = true
    error.value = null

    try {
      const result = await api.identity.getMe()
      identity.value = result

      const preferred = getPreferredWorkspace(result.workspaces, currentWorkspaceId.value)
      currentWorkspaceId.value = preferred?.workspace_id ?? null

      return result
    } catch (cause) {
      error.value = cause instanceof Error ? cause : new Error('Impossible de charger le profil YISIN')
      throw cause
    } finally {
      loading.value = false
    }
  }

  function selectWorkspace(workspaceId: string) {
    if (!workspaces.value.some(workspace => workspace.workspace_id === workspaceId)) {
      throw new Error('Workspace YISIN inconnu')
    }

    currentWorkspaceId.value = workspaceId
  }

  function hasPermission(permission: string) {
    return workspace.value?.permissions.includes(permission) ?? false
  }

  return {
    identity: readonly(identity),
    workspaces,
    workspace,
    currentWorkspaceId: readonly(currentWorkspaceId),
    loading: readonly(loading),
    error: readonly(error),
    loadIdentity,
    selectWorkspace,
    hasPermission
  }
}
