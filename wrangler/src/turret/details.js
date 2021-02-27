import { response } from 'cfw-easy-utils'

export default async () => {
  return response.json({
    network: STELLAR_NETWORK,
    turret: TURRET_ADDRESS,
    fee: { // TODO: don't hard code these
      min: 1,
      max: 10
    }
  }, {
    headers: {
      'Cache-Control': 'public, max-age=300', // 5 minutes
    }
  })
}