import { response } from 'cfw-easy-utils'
import { processFeePayment } from '../@utils/stellar-sdk-utils'
import BigNumber from 'bignumber.js'

export default async ({ params, env }) => {
  const { TX_FEES, XLM_FEE_MIN, XLM_FEE_MAX,  } = env
  const { publicKey } = params

  const body = await request.formData()
  const feePaymentXdr = body.get('txFunctionFee')

  const { metadata: feeMetadata } = await TX_FEES.getWithMetadata(publicKey)
  
  let outsandingBalance = new BigNumber(0);
  if (feeMetadata) {
    outsandingBalance.plus(feeMetadata.balance)
  }

  const { hash: paymentHash, amount: paymentAmount } = await processFeePayment(feePaymentXdr, XLM_FEE_MIN, XLM_FEE_MAX)

  await TX_FEES.put(publicKey, 'OK', {metadata: {
    lastModifiedTime: Date.now(),
    balance: outsandingBalance.plus(paymentAmount),
    spent: feeSpent
  }})
  return response.json({
    publicKey: publicKey,
    paymentHash: paymentHash,
    lastModifiedTime: feeMetadata.lastModifiedTime,
    balance: feeMetadata.balance
  }, {
    headers: {
      'Cache-Control': 'public, max-age=30', // 30 sec
    }
  })
}