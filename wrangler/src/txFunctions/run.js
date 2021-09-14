import { response, Stopwatch } from 'cfw-easy-utils'
import { Transaction, Networks, Keypair } from 'stellar-base'
import BigNumber from 'bignumber.js'
import moment from 'moment'

import { authTxToken } from '../@utils/auth'

export default async ({ request, params, env }) => {
  const { 
    TX_FUNCTIONS, 
    TX_FEES, 
    META, 
    TURRET_RUN_URL, 
    TURRET_SIGNER, 
    STELLAR_NETWORK, 
    HORIZON_URL, 
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
  const feeToken = request.headers.get('authorization')?.split(' ')?.[1]

  const { 
    publicKey: authedPublicKey, 
    data: authedContracts 
  } = authTxToken(STELLAR_NETWORK, feeToken, 'txFunctionHash')

  // if no contracts are specified in the auth token, allow any contract to be run
  if (
    authedContracts.length
    && !authedContracts.some(hash => hash === txFunctionHash)
  ) throw { status: 403, message: `Not authorized to run contract with hash ${txFunctionHash}` }

  const { metadata: feeMetadata } = await TX_FEES.getWithMetadata(authedPublicKey)
  
  let feeBalance
  
  if (feeMetadata) {
    feeBalance = new BigNumber(feeMetadata.balance)

    if (feeBalance.isLessThanOrEqualTo(0)) {
      throw { status: 402, message: `Turret fees have been spent for account ${authedPublicKey}` }
    }
  } else {
    throw { status: 402, message: `No payment was found for account ${authedPublicKey}` }
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
    feeSponsor,
    feeBalanceRemaining
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

    const cost = new BigNumber(watch.getTotalTime()).dividedBy(RUN_DIVISOR).toFixed(7)
    const feeBalanceRemaining = feeBalance.minus(cost).toFixed(7)

    await TX_FEES.put(authedPublicKey, 'OK', {metadata: {
      lastModifiedTime: moment.utc().format('x'),
      balance: feeBalanceRemaining
    }})

    if (res.ok) return {
      xdr: await res.text(),
      cost,
      feeSponsor: authedPublicKey,
      feeBalanceRemaining,
    }

    return {
      error: {
        status: res.status || 400,
        ...res.headers.get('content-type').indexOf('json') > -1 ? await res.json() : await res.text()
      },
      cost,
      feeSponsor: authedPublicKey,
      feeBalanceRemaining,
    }
  })

  if (error) return response.json({
    ...error,
    cost,
    feeSponsor: authedPublicKey,
    feeBalanceRemaining,
  }, {
    status: error.status,
    stopwatch: watch,
  })

  const transaction = new Transaction(xdr, Networks[STELLAR_NETWORK])

  const txFunctionSignerKeypair = Keypair.fromSecret(txFunctionSignerSecret)
  const txFunctionSignature = txFunctionSignerKeypair.sign(transaction.hash()).toString('base64')

  return response.json({
    xdr,
    signer: txFunctionSignerPublicKey,
    signature: txFunctionSignature,
    cost,
    feeSponsor,
    feeBalanceRemaining,
  }, {
    stopwatch: watch,
  })
}