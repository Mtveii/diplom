/** Адрес Slush API: из env или дефолт (Azure). Вынесен отдельно, чтобы избежать циклических импортов. */
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL
  ?? 'https://slush-api-backend-gwfqgjb2djf2bhd3.westeurope-01.azurewebsites.net'
