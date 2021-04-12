import { response } from 'cfw-easy-utils'

export default async ({ params }) => {
  const { txSponsorAddress } = params

  const { 
    value, 
    metadata 
  } = await TX_SPONSORS.getWithMetadata(txSponsorAddress, 'json')

  if (!value)
    throw {status: 404, message: `txSponsor could not be found this turret`}

  return response.json({
    ...metadata,
    txFunctions: value,
  })
}