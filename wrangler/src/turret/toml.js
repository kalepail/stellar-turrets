import { response } from 'cfw-easy-utils'

export default async () => {
  const stellarToml = await META.get('STELLAR_TOML')

  if (!stellarToml)
    throw {status: 404}

  return response.text(stellarToml, {
    headers: {
      'Cache-Control': 'public, max-age=2419200', // 28 days
    }
  })
}