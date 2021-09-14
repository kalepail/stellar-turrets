import { response } from 'cfw-easy-utils'
import { processFeePayment } from '../@utils/stellar-sdk-utils'
import BigNumber from 'bignumber.js'
import moment from 'moment'

export default async ({ request, params, env }) => {
  const { TX_FEES, XLM_FEE_MIN, XLM_FEE_MAX,  } = env
  const { publicKey } = params

  const body = await request.formData()
  const feePaymentXdr = body.get('txFunctionFee')

  const { metadata: feeMetadata } = await TX_FEES.getWithMetadata(publicKey)
  
  let outstandingBalance = new BigNumber(0);
  if (feeMetadata) {
    outstandingBalance = outstandingBalance.plus(feeMetadata.balance)
  }

  const { hash: paymentHash, amount: paymentAmount } = await processFeePayment(env, feePaymentXdr, XLM_FEE_MIN, XLM_FEE_MAX)

  const finalBalance = outstandingBalance.plus(paymentAmount);
  const lastModifiedTime = moment.utc().format('x')
  await TX_FEES.put(publicKey, 'OK', {metadata: {
    lastModifiedTime,
    balance: finalBalance
  }})
  return response.json({
    publicKey,
    paymentHash,
    lastModifiedTime,
    balance: finalBalance.toString()
  }, {
    headers: {
      'Cache-Control': 'public, max-age=30', // 30 sec
    }
  })
}