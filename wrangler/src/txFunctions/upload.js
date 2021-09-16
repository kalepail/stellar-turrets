import { response } from 'cfw-easy-utils'
import shajs from 'sha.js'
import BigNumber from 'bignumber.js'
import { Transaction, Keypair, Networks } from 'stellar-base'
import { find } from 'lodash'
import { processFeePayment } from '../@utils/stellar-sdk-utils'

export default async ({ request, env }) => {
  const { TX_FUNCTIONS, TURRET_ADDRESS, UPLOAD_DIVISOR } = env
  const body = await request.formData()

  const txFunctionFields = body.get('txFunctionFields')
  const txFunctionFieldsBuffer = txFunctionFields ? Buffer.from(txFunctionFields, 'base64') : Buffer.from('')

  // Test to ensure txFunctionFields is valid JSON
  if (txFunctionFields)
    JSON.parse(txFunctionFieldsBuffer.toString())

  const txFunction = body.get('txFunction')
  const txFunctionBuffer = Buffer.from(txFunction)

  const txFunctionConcat = Buffer.concat([txFunctionBuffer, txFunctionFieldsBuffer])
  const txFunctionHash = shajs('sha256').update(txFunctionConcat).digest('hex')

  const txFunctionExists = await TX_FUNCTIONS.get(txFunctionHash, 'arrayBuffer')

  if (txFunctionExists)
    throw `txFunction ${txFunctionHash} has already been uploaded to this turret`

  const txFunctionSignerKeypair = Keypair.random()
  const txFunctionSignerSecret = txFunctionSignerKeypair.secret()
  const txFunctionSignerPublicKey = txFunctionSignerKeypair.publicKey()

  const cost = new BigNumber(txFunctionConcat.length).dividedBy(UPLOAD_DIVISOR).toFixed(7)

  let transactionHash

  try {
    const txFunctionFee = body.get('txFunctionFee')

    // throws if payment fails
    await processFeePayment(env, txFunctionFee, cost);

  } catch (err) {
    return response.json({
      message: typeof err.message === 'string' ? err.message : 'Failed to process txFunctionFee',
      status: 402,
      turret: TURRET_ADDRESS,
      cost,
    }, {
      status: 402
    })
  }

  await TX_FUNCTIONS.put(txFunctionHash, txFunctionConcat, {metadata: {
    cost,
    payment: transactionHash,
    length: txFunctionBuffer.length,
    txFunctionSignerSecret,
    txFunctionSignerPublicKey,
  }})

  return response.json({
    hash: txFunctionHash,
    signer: txFunctionSignerPublicKey,
  })
}