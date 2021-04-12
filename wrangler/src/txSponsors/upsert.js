import { response } from 'cfw-easy-utils'
import { Transaction, Networks } from 'stellar-base'
import BigNumber from 'bignumber.js'
import { find } from 'lodash'
import shajs from 'sha.js'
import { Utils } from '../@utils/stellar-sdk-utils'

export default async ({ request }) => {
  const { txFunctions, txSponsorFee } = await request.json()

  if (!txFunctions?.length)
    throw {status: 402, message: `Missing or invalid txFunctions array`}

  const transaction = new Transaction(txSponsorFee, Networks[STELLAR_NETWORK])
  const transactionHash = transaction.hash().toString('hex')

  if (
    !Utils.verifyTxSignedBy(transaction, transaction.source)
    || !find(transaction._operations, (op) => 
      op.type === 'payment'
      && op.destination === TURRET_ADDRESS
      && op.asset.isNative()
      && new BigNumber(op.amount).isGreaterThanOrEqualTo(XLM_FEE_MAX)
    )
  ) return response.json({
    message: 'Missing or invalid txSponsorFee',
    status: 402,
    turret: TURRET_ADDRESS,
    cost: XLM_FEE_MAX,
  }, {
    status: 402
  })

  await fetch(`${HORIZON_URL}/transactions/${transactionHash}`)
  .then((res) => {
    if (res.ok)
      throw `txSponsorFee ${transactionHash} has already been submitted`
    else if (res.status === 404)
      return
    else
      throw res
  })

  const { metadata: txSponsorMetadata } = await TX_SPONSORS.getWithMetadata(transaction.source)

  // Only bill a txSponsorFee if txSponsor doesn't exist or status !== 'OK'
  if (txSponsorMetadata?.status !== 'OK') {
    const tx = transaction.toXDR()
    const txBody = new FormData()
          txBody.append('tx', tx)

    await fetch(`${HORIZON_URL}/transactions`, {
      method: 'POST',
      body: txBody
    }).then((res) => {
      if (res.ok)
        return res.json()
      throw res
    })
  }

  const txFunctionsString = JSON.stringify(txFunctions.sort())
  const memoHash = shajs('sha256').update(txFunctionsString).digest('hex')
  const metadata = {
    status: 'OK',
    memoHash
  }

  await TX_SPONSORS.put(transaction.source, txFunctionsString, {metadata})

  return response.json({
    ...metadata,
    sponsor: transaction.source,
  })
}