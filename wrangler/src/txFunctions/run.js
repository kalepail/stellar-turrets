import { response, Stopwatch } from 'cfw-easy-utils'
import { Transaction, FeeBumpTransaction, Networks, Keypair, BASE_FEE } from 'stellar-base'
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
  let { txFunctionFee, txFunctionFeeBump } = body

  if (
    (
      txFunctionFee 
      && txFunctionFeeBump 
    ) // If both fail
    || (
      !txFunctionFee 
      && !txFunctionFeeBump
    ) // If neither fail
  ) throw {message: `Please include at least but only one of either txFunctionFee or txFunctionFeeBump`}

  let feeBumpTxn
  let feeTxn
  let feeTxnHash
  let feeTxnSource

  if (txFunctionFee) {
    feeTxn = new Transaction(txFunctionFee, Networks[STELLAR_NETWORK])
    feeTxnHash = feeTxn.hash().toString('hex')
    feeTxnSource = feeTxn.source
  }

  else if (txFunctionFeeBump) {
    feeBumpTxn = new FeeBumpTransaction(txFunctionFeeBump, Networks[STELLAR_NETWORK])
    feeTxnHash = feeBumpTxn.hash().toString('hex')
    feeTxnSource = feeBumpTxn.feeSource
    feeTxn = feeBumpTxn.innerTransaction
    txFunctionFee = txFunctionFeeBump
  }

  delete body.txFunctionFee
  delete body.txFunctionFeeBump

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

  const { 
    value: txSponsorFunctions, 
    metadata: txSponsorMetadata 
  } = await TX_SPONSORS.getWithMetadata(feeTxnSource, 'json')

  if (!txSponsorFunctions)
    throw `txSponsor ${feeTxnSource} could not be found on this turret`

  if (txSponsorMetadata.status !== 'OK')
    throw `txSponsor ${feeTxnSource} is in poor standing with this turret [${txSponsorMetadata.status}]`

  const { metadata: feeMetadata } = await TX_FEES.getWithMetadata(feeTxnHash)
  const feeTotalBigNumber = new BigNumber(feeTxn.operations[0].amount)
  const feeSpentBigNumber = new BigNumber(feeMetadata?.spent || 0)

  if (feeSpentBigNumber.isGreaterThanOrEqualTo(feeTotalBigNumber)) {
    event.waitUntil(txSponsorsSettle(txFunctionFee))
    throw {status: 402, message: `txFunctionFee has been spent`}
  }

  // Support straight payments
  // Support fee bumping
  // Support sequence number delegation

  // TODO: throw if extra signers

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
      Utils.verifyTxSignedBy(feeTxn, feeTxnSource) // ensure payment is signed

      && feeBumpTxn // ensure fee bump is signed
      ? feeBumpTxn.signatures.length === 1 
        && Utils.verifyTxSignedBy(feeBumpTxn, feeTxnSource)
      : true

      && feeTxn.source !== feeTxnSource // sequence number source !== payment operation source
      ? feeTxn.signatures.length === 2 
        && Utils.verifyTxSignedBy(feeTxn, feeTxn.source)
      : feeTxn.signatures.length === 1

      && feeTxn.memo.value?.toString('hex') === txSponsorMetadata.memoHash
      && txSponsorFunctions.indexOf(txFunctionHash) > -1

      && new BigNumber(feeTxn.fee).isGreaterThanOrEqualTo(
        feeBumpTxn 
        ? 0 
        : BASE_FEE
      )
      && new BigNumber(feeTxn.sequence).isGreaterThan(0)
      && new BigNumber(feeTxn.timeBounds.minTime).isEqualTo(0)
      && new BigNumber(feeTxn.timeBounds.maxTime).isEqualTo(0)

      && feeTxn.operations.length === 1

      && feeTxn.operations[0].type === 'payment'
      && feeTxn.operations[0].destination === TURRET_ADDRESS
      && feeTxn.operations[0].asset.isNative()
      && feeTotalBigNumber.isGreaterThanOrEqualTo(XLM_FEE_MIN)
      && feeTotalBigNumber.isLessThanOrEqualTo(XLM_FEE_MAX)
      && (
        feeTxn.operations[0].source
        ? feeTxn.operations[0].source === feeTxnSource 
        : !feeTxn.operations[0].source
      )
    )
  ) throw `Missing or invalid txFunctionFee`

  let { 
    value: turretAuthData, 
    metadata: turretAuthSignature 
  } = await META.getWithMetadata('TURRET_AUTH_TOKEN')

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
    error,
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
      HORIZON_URL,
      STELLAR_NETWORK,
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
      sponsor: feeTxnSource,
      total: feeTotal,
      spent: feeSpent
    }})

    if (res.ok) return {
      xdr: await res.text(),
      cost,
      feeTotal,
      feeSpent,
    }

    return {
      error: {
        status: res.status || 400,
        ...res.headers.get('content-type').indexOf('json') > -1 ? await res.json() : await res.text()
      },
      cost,
      feeTotal,
      feeSpent,
    }
  })

  if (error) return response.json({
    ...error,
    cost
  }, {
    status: error.status,
    stopwatch: watch,
    headers: {
      'X-Fee-Total': feeTotal,
      'X-Fee-Spent': feeSpent
    }
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