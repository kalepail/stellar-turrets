import { response } from 'cfw-easy-utils'
import { Transaction, Networks } from 'stellar-base'

export default async (txFunctionFee) => {
  const transaction = new Transaction(txFunctionFee, Networks[STELLAR_NETWORK])
  const transactionHash = transaction.hash().toString('hex')

  const horizon = STELLAR_NETWORK === 'PUBLIC' ? 'https://horizon.stellar.org' : 'https://horizon-testnet.stellar.org'
  const tx = transaction.toXDR()
  const txBody = new FormData()
        txBody.append('tx', tx)

  await fetch(`${horizon}/transactions`, {
    method: 'POST',
    body: txBody
  })
  .then(async (res) => {
    if (res.ok)
      return res.json()

    await TX_SPONSORS.put(transaction.source, 'FAIL')
    throw res
  })
  .finally(() => TX_FEES.delete(transactionHash))

  return response.text('OK')
}