import { response } from 'cfw-easy-utils'
import shajs from 'sha.js'
import BigNumber from 'bignumber.js'
import { Transaction, Keypair, Networks } from 'stellar-base'
import { find } from 'lodash'

export default async ({ request }) => {
  const body = await request.formData()

  const txFunctionFields = body.get('txFunctionFields')
  const txFunctionFieldsBuffer = txFunctionFields ? Buffer.from(txFunctionFields, 'base64') : Buffer.from('')

  const txFunction = body.get('txFunction')
  const txFunctionBuffer = Buffer.from(txFunction)
  const txFunctionBufferLength = txFunctionBuffer.length
  const txFunctionHash = shajs('sha256').update(txFunctionBuffer).update(txFunctionFieldsBuffer).digest('hex')

  const txFunctionExists = await TX_FUNCTIONS.get(txFunctionHash, 'arrayBuffer')

  if (txFunctionExists)
    throw `txFunction ${txFunctionHash} has already been uploaded to this turret`

  const txFunctionSignerKeypair = Keypair.random()
  const txFunctionSignerSecret = txFunctionSignerKeypair.secret()
  const txFunctionSignerPublicKey = txFunctionSignerKeypair.publicKey()

  const cost = new BigNumber(txFunctionBufferLength).dividedBy(1000).toFixed(7)

  let transactionHash

  try {
    const txFunctionFee = body.get('txFunctionFee')

    const transaction = new Transaction(txFunctionFee, Networks[STELLAR_NETWORK])
          transactionHash = transaction.hash().toString('hex')

    if (!find(transaction._operations, (op) => 
      op.type === 'payment'
      && op.destination === TURRET_ADDRESS
      && new BigNumber(op.amount).isGreaterThanOrEqualTo(cost)
      && op.asset.isNative()
    )) throw 'Missing or invalid txFunctionFee'

    await fetch(`https://horizon-testnet.stellar.org/transactions/${transactionHash}`)
    .then((res) => {
      if (res.ok)
        throw `txFunctionFee ${transactionHash} has already been submitted`
      else if (res.status === 404)
        return
      else
        throw res
    })

    const horizon = STELLAR_NETWORK === 'PUBLIC' ? 'https://horizon.stellar.org' : 'https://horizon-testnet.stellar.org'
    const tx = transaction.toXDR()
    const txBody = new FormData()
          txBody.append('tx', tx)

    await fetch(`${horizon}/transactions`, {
      method: 'POST',
      body: txBody
    }).then((res) => {
      if (res.ok)
        return res.json()
      throw res
    })
  }
  
  catch(err) {
    return response.json({
      message: typeof err === 'string' ? err : 'Failed to process txFunctionFee',
      status: 402,
      turret: TURRET_ADDRESS,
      cost,
    }, {
      status: 402
    })
  }

  await TX_FUNCTIONS.put(txFunctionHash, Buffer.concat([txFunctionBuffer, txFunctionFieldsBuffer]), {metadata: {
    cost,
    payment: transactionHash,
    length: txFunctionBufferLength,
    txFunctionSignerSecret,
    txFunctionSignerPublicKey,
  }})

  return response.json({
    hash: txFunctionHash,
    signer: txFunctionSignerPublicKey,
  })
}