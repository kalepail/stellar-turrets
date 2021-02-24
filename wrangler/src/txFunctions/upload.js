import { response } from 'cfw-easy-utils'
import shajs from 'sha.js'
import BigNumber from 'bignumber.js'
import { Keypair } from 'stellar-base'

export default async ({ request }) => {
  const body = await request.formData()

  const txFunctionFields = body.get('txFunctionFields')
  const txFunctionFieldsBuffer = Buffer.from(txFunctionFields, 'base64')

  const txFunction = body.get('txFunction')
  const txFunctionBuffer = Buffer.from(txFunction)
  const txFunctionBufferLength = txFunctionBuffer.length
  const txFunctionHash = shajs('sha256').update(txFunctionBuffer).update(txFunctionFieldsBuffer).digest('hex')

  const txFunctionExists = await TX_FUNCTIONS.get(txFunctionHash, 'arrayBuffer')

  if (txFunctionExists)
    throw {status: 400, message: `txFunction ${txFunctionHash} has already been uploaded to this turret`}

  const txFunctionSignerKeypair = Keypair.random()
  const txFunctionSignerSecret = txFunctionSignerKeypair.secret()
  const txFunctionSignerPublicKey = txFunctionSignerKeypair.publicKey()

  const cost = new BigNumber(txFunctionBufferLength).dividedBy(1000).toFixed(7)

  await TX_FUNCTIONS.put(txFunctionHash, Buffer.concat([txFunctionBuffer, txFunctionFieldsBuffer]), {
    metadata: {
      cost,
      payment: null,
      length: txFunctionBufferLength,
      txFunctionSignerSecret,
      txFunctionSignerPublicKey,
    }
  })

  return response.json({
    hash: txFunctionHash,
    signer: txFunctionSignerPublicKey,
    cost
  })
}