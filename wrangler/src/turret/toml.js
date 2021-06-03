import { response } from 'cfw-easy-utils'

export default async ({ env }) => {
  const { META } = env
  const stellarToml = await META.get('STELLAR_TOML')

  if (!stellarToml)
    throw {status: 404, message: `stellar.toml file could not be found on this turret`}

  return response.text(stellarToml, {
    headers: {
      'Content-Type': 'text/plain',
      'Cache-Control': 'public, max-age=2419200', // 28 days
    }
  })
}
