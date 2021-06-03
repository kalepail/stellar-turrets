import { response, Stopwatch } from 'cfw-easy-utils'
import { Transaction, Networks, Keypair } from 'stellar-base'
import BigNumber from 'bignumber.js'
import moment from 'moment'
import { find as loFind } from 'lodash'

import txSponsorsSettle from '../txSponsors/settle'

export default async ({ request, params, env, ctx }) => {
  const { 
    TX_FUNCTIONS, 
    TX_FEES, 
    META, 
    TURRET_RUN_URL, 
    TURRET_SIGNER, 
    TURRET_ADDRESS, 
    STELLAR_NETWORK, 
    HORIZON_URL, 
    TX_FUNCTION_FEE_DAYS_TTL, 
    XLM_FEE_MIN, 
    XLM_FEE_MAX, 
    RUN_DIVISOR 
  } = env
  const { txFunctionHash } = params

  const { value, metadata } = await TX_FUNCTIONS.getWithMetadata(txFunctionHash, 'arrayBuffer')

  if (!value)
    throw {status: 404, message: `txFunction could not be found this turret`}

  const { length, txFunctionSignerPublicKey, txFunctionSignerSecret } = metadata

  const txFunctionBuffer = Buffer.from(value)
  const txFunction = txFunctionBuffer.slice(0, length).toString()

  const body = await request.json()
  const claimableBalanceToken = request.headers.get('authorization')?.split(' ')?.[1]

  if (!claimableBalanceToken)
    throw {message: `txFunctionFee is missing`}

  const [
    claimableBalanceId, 
    claimableBalanceSignature, 
    ...txFunctionHashes
  ] = JSON.parse(Buffer.from(claimableBalanceToken, 'base64'))

  if (
    txFunctionHashes.length
    && txFunctionHashes.indexOf(txFunctionHash) === -1
  ) throw {message: `txFunctionFee is invalid for this txFunction`}

  const { metadata: feeMetadata } = await TX_FEES.getWithMetadata(claimableBalanceId)

  let feeTotalBigNumber
  let feeSpentBigNumber

  if (feeMetadata) {
    feeTotalBigNumber = new BigNumber(feeMetadata.total)
    feeSpentBigNumber = new BigNumber(feeMetadata.spent)

    if (feeSpentBigNumber.isGreaterThanOrEqualTo(feeTotalBigNumber)) {
      ctx.waitUntil(txSponsorsSettle(claimableBalanceId, env))
      throw {status: 402, message: `txFunctionFee has been spent`}
    }
  }

  else {
    const { asset, amount, sponsor, claimants } = await fetch(`${HORIZON_URL}/claimable_balances/${claimableBalanceId}`)
    .then(async (res) => {
      if (res.ok)
        return res.json()
      throw res
    })

    const sponsorKeypair = Keypair.fromPublicKey(sponsor)

    if (!(
      asset === 'native'
      && new BigNumber(amount).isGreaterThanOrEqualTo(XLM_FEE_MIN)
      && new BigNumber(amount).isLessThanOrEqualTo(XLM_FEE_MAX)
      && sponsorKeypair.verify(JSON.stringify([
        claimableBalanceId,
        ...txFunctionHashes
      ]), Buffer.from(claimableBalanceSignature, 'hex'))
      && claimants.length <= 2
      && loFind(claimants, (claimant) => 
        claimant.destination === TURRET_ADDRESS
        && claimant.predicate.unconditional
      )
      && (
        claimants.length === 2
        ? loFind(claimants, (claimant) => 
          claimant.destination === sponsor
          && claimant.predicate?.not?.abs_before
          && moment.utc(claimant.predicate.not.abs_before).subtract(TX_FUNCTION_FEE_DAYS_TTL, 'days').isAfter()
        ) : true
      )
      && claimants.length <= 2
      && claimants[0]?.destination === TURRET_ADDRESS
      && claimants[0]?.predicate?.unconditional
    )) throw {message: `txFunctionFee is invalid`}

    feeTotalBigNumber = new BigNumber(amount)
    feeSpentBigNumber = new BigNumber(0)
  }

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

    await TX_FEES.put(claimableBalanceId, 'OK', {metadata: {
      date: now,
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
    cost,
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
    cost,
  }, {
    stopwatch: watch,
    headers: {
      'X-Fee-Total': feeTotal,
      'X-Fee-Spent': feeSpent
    }
  })
}