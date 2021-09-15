import { response } from 'cfw-easy-utils'
import { authTxToken } from '../@utils/auth'

export default async ({ request, env }) => {
  const { TX_FEES, STELLAR_NETWORK } = env

  const feeToken = request.headers.get('authorization')?.split(' ')?.[1]

  const { publicKey: authedPublicKey } = authTxToken(STELLAR_NETWORK, feeToken)

  const { metadata: feeMetadata } = await TX_FEES.getWithMetadata(authedPublicKey)

  if (!feeMetadata)
    throw {status: 404, message: `Fee balance could not be found this turret` }

  return response.json({
    publicKey: authedPublicKey,
    lastModifiedTime: feeMetadata.lastModifiedTime,
    balance: feeMetadata.balance
  }, {
    headers: {
      'Cache-Control': 'public, max-age=30', // 30 sec
    }
  })
}