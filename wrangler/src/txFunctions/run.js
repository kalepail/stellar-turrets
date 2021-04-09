import { response, Stopwatch } from 'cfw-easy-utils'
import { Transaction, Networks, Keypair, BASE_FEE } from 'stellar-base'
import BigNumber from 'bignumber.js'
import moment from 'moment'

import { Utils } from '../@utils/stellar-sdk-utils'

import txSponsorsSettle from '../txSponsors/settle'

export default async ({ event, request, params }) => {
  const { txFunctionHash } = params

  const { value, metadata } = await TX_FUNCTIONS.getWithMetadata(txFunctionHash, 'arrayBuffer')

  if (!value)
    throw {status: 404, message: `txFunction could not be found this turret`}

  const { length, txFunctionSignerPublicKey, txFunctionSignerSecret } = metadata

  const txFunctionBuffer = Buffer.from(value)
  const txFunction = txFunctionBuffer.slice(0, length).toString()

  const body = await request.json()
  const { txFunctionFee } = body
  const feeTxn = new Transaction(txFunctionFee, Networks[STELLAR_NETWORK])
  const feeTxnHash = feeTxn.hash().toString('hex')

  delete body.txFunctionFee

  await fetch(`${HORIZON_URL}/transactions/${feeTxnHash}`)
  .then(async (res) => {
    if (res.ok) {
      await TX_FEES.delete(feeTxnHash)
      throw `txFunctionFee ${feeTxnHash} has already been submitted`
    }
    else if (res.status === 404)
      return
    else
      throw res
  })

  const txSponsor = await TX_SPONSORS.get(feeTxn.source)

  if (!txSponsor)
    throw `txSponsor ${feeTxn.source} could not be found on this turret`

  if (txSponsor !== 'OK')
    throw `txSponsor ${feeTxn.source} is in poor standing with this turret [${txSponsor}]`

  const { metadata: feeMetadata } = await TX_FEES.getWithMetadata(feeTxnHash)
  const feeTotalBigNumber = new BigNumber(feeTxn.operations[0].amount)
  const feeSpentBigNumber = new BigNumber(feeMetadata?.spent || 0)

  if (feeSpentBigNumber.isGreaterThanOrEqualTo(feeTotalBigNumber)) {
    event.waitUntil(txSponsorsSettle(txFunctionFee))
    throw {status: 402, message: `txFunctionFee has been spent`}
  }

  // Fee Checks:
    // txn has been signed by source
    // memo hash is hash for txFunctions
    // fee is greater than or equal to the base fee
    // sequence # is not 0
    // timeBounds minTime and maxTime are both 0
    // only one operation of type payment
    // source for op must be excluded
    // payment destination is our TURRET_ADDRESS
    // payment asset is XLM
    // payment amount must be within tolerance
  if (
    !feeMetadata // Only check incoming feeTxn if it hasn't already been validated and stored in the KV
    && !(
      Utils.verifyTxSignedBy(feeTxn, feeTxn.source)

      && feeTxn.memo.value?.toString('hex') === txFunctionHash

      && new BigNumber(feeTxn.fee).isGreaterThanOrEqualTo(BASE_FEE)
      && new BigNumber(feeTxn.sequence).isGreaterThan(0)
      && new BigNumber(feeTxn.timeBounds.minTime).isEqualTo(0)
      && new BigNumber(feeTxn.timeBounds.maxTime).isEqualTo(0)

      && feeTxn.operations.length === 1

      && feeTxn.operations[0].type === 'payment'
      && feeTxn.operations[0].destination === TURRET_ADDRESS
      && feeTxn.operations[0].asset.isNative()
      && feeTotalBigNumber.isGreaterThanOrEqualTo(XLM_FEE_MIN)
      && feeTotalBigNumber.isLessThanOrEqualTo(XLM_FEE_MAX)
      && !feeTxn.operations[0].source
    )
  ) throw `Missing or invalid txFunctionFee`

  let { value: turretAuthData, metadata: turretAuthSignature } = await META.getWithMetadata('TURRET_AUTH_TOKEN')

  if (!turretAuthData) {
    const turretSignerKeypair = Keypair.fromSecret(TURRET_SIGNER)
    const turretAuthBuffer = crypto.getRandomValues(Buffer.alloc(256))

    turretAuthData = turretAuthBuffer.toString('base64')
    turretAuthSignature = turretSignerKeypair.sign(turretAuthBuffer).toString('base64')

    await META.put('TURRET_AUTH_TOKEN', turretAuthData, {
      expirationTtl: 2419200,
      metadata: turretAuthSignature
    })
  }

  const watch = new Stopwatch()
  const { 
    xdr, 
    cost,
    feeTotal,
    feeSpent
  } = await fetch(`${TURRET_RUN_URL}/${txFunctionHash}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Turret-Data': turretAuthData,
      'X-Turret-Signature': turretAuthSignature,
    },
    body: JSON.stringify({
      ...body,
      horizonUrl: HORIZON_URL,
      stellarNetwork: STELLAR_NETWORK,
      txFunction,
    })
  })
  .then(async (res) => {
    watch.mark('Ran txFunction')

    const now = moment.utc().format('x')
    const cost = new BigNumber(watch.getTotalTime()).dividedBy(RUN_DIVISOR).toFixed(7)
    const feeTotal = feeTotalBigNumber.toFixed(7)
    const feeSpent = feeSpentBigNumber.plus(cost).toFixed(7)

    await TX_FEES.put(feeTxnHash, 'OK', {metadata: {
      date: now,
      xdr: txFunctionFee,
      sponsor: feeTxn.source,
      total: feeTotal,
      spent: feeSpent
    }})

    if (res.ok) return {
      xdr: await res.text(),
      cost,
      feeTotal,
      feeSpent,
    }

    throw res
  })

  const transaction = new Transaction(xdr, Networks[STELLAR_NETWORK])

  const txFunctionSignerKeypair = Keypair.fromSecret(txFunctionSignerSecret)
  const txFunctionSignature = txFunctionSignerKeypair.sign(transaction.hash()).toString('base64')

  return response.json({
    xdr,
    signer: txFunctionSignerPublicKey,
    signature: txFunctionSignature,
    cost
  }, {
    stopwatch: watch,
    headers: {
      'X-Fee-Total': feeTotal,
      'X-Fee-Spent': feeSpent
    }
  })
}