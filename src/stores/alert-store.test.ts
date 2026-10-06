import { beforeEach, describe, expect, it } from 'vitest'
import {
  SERVER_ERROR_MESSAGE,
  alertActionError,
  actionErrorText,
  notifyServerError,
  useAlertStore,
} from '@/stores/alert-store'

describe('notifyServerError', () => {
  beforeEach(() => useAlertStore.setState({ message: null }))

  it('shows the common alert for a 5xx or no response', () => {
    expect(notifyServerError({ status: 503 })).toBe(true)
    expect(useAlertStore.getState().message).toBe(SERVER_ERROR_MESSAGE)

    useAlertStore.setState({ message: null })
    expect(notifyServerError(new Error('Network Error'))).toBe(true)
    expect(useAlertStore.getState().message).toBe(SERVER_ERROR_MESSAGE)
  })

  it("adds the gateway's trace id when there is one", () => {
    notifyServerError({ status: 500, traceId: '4bf92f3577b34da6a3ce929d0e0e4736' })
    expect(useAlertStore.getState().message).toBe(
      `${SERVER_ERROR_MESSAGE}\n오류 코드: 4bf92f3577b34da6a3ce929d0e0e4736`,
    )
  })

  it('stays quiet for a 4xx', () => {
    expect(notifyServerError({ status: 404 })).toBe(false)
    expect(useAlertStore.getState().message).toBeNull()
  })
})

describe('actionErrorText', () => {
  beforeEach(() => useAlertStore.setState({ message: null }))

  it("returns a 4xx's own message for inline red text, without an alert", () => {
    expect(
      actionErrorText(Object.assign(new Error('이미 같은 이름이 있습니다'), { status: 409 })),
    ).toBe('이미 같은 이름이 있습니다')
    expect(useAlertStore.getState().message).toBeNull()
  })

  it('sends a 5xx to the common alert and returns nothing to show inline', () => {
    expect(
      actionErrorText(
        Object.assign(new Error('서비스가 일시적으로 차단되었습니다.'), { status: 503 }),
      ),
    ).toBeNull()
    expect(useAlertStore.getState().message).toBe(SERVER_ERROR_MESSAGE)
  })

  it('leaves a 401 to the session-expired notice', () => {
    expect(
      actionErrorText(Object.assign(new Error('로그인이 필요합니다.'), { status: 401 })),
    ).toBeNull()
    expect(useAlertStore.getState().message).toBeNull()
  })
})

describe('alertActionError', () => {
  beforeEach(() => useAlertStore.setState({ message: null }))

  it('puts a 4xx message in the alert when there is nowhere inline to show it', () => {
    alertActionError(Object.assign(new Error('권한이 없습니다'), { status: 403 }))
    expect(useAlertStore.getState().message).toBe('권한이 없습니다')
  })
})
