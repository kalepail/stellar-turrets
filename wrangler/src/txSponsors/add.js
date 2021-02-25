import { response } from 'cfw-easy-utils'
import { Transaction, Networks } from 'stellar-base'
import BigNumber from 'bignumber.js'
import { find } from 'lodash'

export default async ({ request }) => {
  const { txFunctionFee } = await request.json()

  const transaction = new Transaction(txFunctionFee, Networks[STELLAR_NETWORK])
  const transactionHash = transaction.hash().toString('hex')

  const txSponsor = await TX_SPONSORS.get(transaction.source)

  if (txSponsor === 'OK')
    return response.text(txSponsor)

  if (!find(transaction._operations, (op) => 
    op.type === 'payment'
    && op.destination === TURRET_ADDRESS
    && new BigNumber(op.amount).isGreaterThanOrEqualTo(10) // TODO: don't hard code this
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

  await TX_SPONSORS.put(transaction.source, 'OK')

  return response.text('OK')
}