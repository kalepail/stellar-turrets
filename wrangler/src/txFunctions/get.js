import { response } from 'cfw-easy-utils'

export default async ({ params, env }) => {
  const { TX_FUNCTIONS } = env
  const { txFunctionHash } = params

  const { value, metadata } = await TX_FUNCTIONS.getWithMetadata(txFunctionHash, 'arrayBuffer')

  if (!value)
    throw {status: 404, message: `txFunction could not be found this turret`}

  const { length, txFunctionSignerPublicKey } = metadata

  const txFunctionBuffer = Buffer.from(value)
  const txFunction = txFunctionBuffer.slice(0, length).toString()
  const txFunctionFields = JSON.parse(txFunctionBuffer.slice(length).toString())

  return response.json({
    function: txFunction,
    fields: txFunctionFields,
    signer: txFunctionSignerPublicKey
  }, {
    headers: {
      'Cache-Control': 'public, max-age=2419200', // 28 days
    }
  })
}