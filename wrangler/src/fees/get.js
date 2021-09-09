import { response } from 'cfw-easy-utils'
import { authTxToken } from '../@utils/auth'

export default async ({ params, env }) => {
  const { TX_FEES } = env
  const { publicKey } = params

  const feeToken = request.headers.get('authorization')?.split(' ')?.[1]

  const { publicKey: authedPublicKey } = authTxToken(feeToken)

  if (authedPublicKey !== publicKey) {
    throw { status: 403, message: `Not authorized to view resource` }
  }

  const { metadata: feeMetadata } = await TX_FEES.getWithMetadata(publicKey)

  if (!feeMetadata)
    throw {status: 404, message: `Fee balance could not be found this turret` }

  return response.json({
    publicKey: publicKey,
    lastModifiedTime: feeMetadata.lastModifiedTime,
    balance: feeMetadata.balance
  }, {
    headers: {
      'Cache-Control': 'public, max-age=30', // 30 sec
    }
  })
}