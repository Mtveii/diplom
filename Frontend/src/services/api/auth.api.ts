import { httpClient } from './httpClient'

interface SlushLoginResponse {
  accessToken: string
  refreshToken: string
}

export const authApi = {
  /** Тихий вход для DEV-режима (AuthBootstrap) и будущие refresh-флоу. Своей формы входа у панели нет. */
  login: async (loginOrEmail: string, password: string): Promise<string> => {
    const response = await httpClient.post<SlushLoginResponse>('/Auth/login', {
      loginOrEmail,
      password,
      rememberMe: true,
    })
    return response.data.accessToken
  },
}
