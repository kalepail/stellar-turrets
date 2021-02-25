import { response } from 'cfw-easy-utils'
import { Transaction, Networks, Keypair } from 'stellar-base'
import { parse } from '@iarna/toml'
import BigNumber from 'bignumber.js'

import { Utils } from '../@utils/stellar-sdk-utils'

import turretToml from '../turret/toml'

// AAAAAgAAAABTqjFHz0quLSka8SOrkw7R07aqDNUHAe+Qm5PX0jMiGwAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAA3hWVRaoRP1N/Fp/x9qCICiwTuCur5gaSpFNRRCQanoyAAAAAgAAAAAAAAABAAAAAHjsM/OE0yi61zuStQL6QnUG8R6XjCSfjDWrMDuw6N7QAAAAAAAAAAAAABOIAAAAAAAAAAoAAAAFc3RhdGUAAAAAAAABAAAADWFiYy0xMjMtbm9uY2UAAAAAAAAAAAAAAdIzIhsAAABA6NQHreumZMIWH/u8WFS4VnSWPCvxHIrm9o8sqjpE81mDJOGvLy1eVkjE6vs5XqEA3x9gCFLUbrmOLETGQuGkCg==

export default async ({ request, params }) => {
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

  // Sponsor Checks:
    // Account exists
    // Account has an acceptable balance
    // Account has added trusted Turret signers at acceptable weights
      // m-of-n scheme should be within a tolerable range (e.g. 3 of 5 not 14 of 15)
    // Account is in good historical standing
    // If this is a new sponsor account test whole flow to begin historical standing and ensure sponsorship can't be gamed
  // const { TSS: { TURRETS: tomlTurrets } } = await turretToml()
  // .then(async (res) => {
  //   if (res.ok)
  //     return parse(await res.text())
  //   throw res
  // })

  // Fee Checks:
    // txn has been signed by source
    // memo hash is hash for contract
    // fee is 0
    // sequence # is 0
    // timebounds min and max are 0
    // only two operations, one of type payment and one of type manageData
    // sources for ops must be excluded
    // payment destination is our TURRET_ADDRESS
    // payment asset is XLM
    // payment amount must be within tolerance
    // has a manageData op with a state name and non empty value
  if(!(
    Utils.verifyTxSignedBy(feeTxn, feeTxn.source)

    && feeTxn.memo.value.toString('hex') === txFunctionHash

    && parseInt(feeTxn.fee) === 0
    && parseInt(feeTxn.sequence) === 0
    && parseInt(feeTxn.timeBounds.minTime) === 0
    && parseInt(feeTxn.timeBounds.maxTime) === 0

    && feeTxn.operations.length === 2

    && feeTxn.operations[0].type === 'payment'
    && feeTxn.operations[0].destination === TURRET_ADDRESS
    && feeTxn.operations[0].asset.isNative()
    && new BigNumber(feeTxn.operations[0].amount).isGreaterThanOrEqualTo('0.0005') // TODO: support for per txFunction dynamic variable fee
    && !feeTxn.operations[0].source

    && feeTxn.operations[1].type === 'manageData'
    && feeTxn.operations[1].name === 'state'
    && feeTxn.operations[1].value
    && !feeTxn.operations[1].source
  )) throw `Missing or invalid txFunctionFee`

  // TODO: Reinstate this once fee testing is done
  
  // if (await TX_FEES.get(feeTxnHash))
  //   throw `txFunctionFee ${feeTxnHash} has already been submitted`
  // else
    await TX_FEES.put(feeTxnHash, 'OK', {metadata: txFunctionFee})

  // const txSponsor = await TX_SPONSORS.get(feeTxn.source)

  // if (!txSponsor)
    await TX_SPONSORS.put(feeTxn.source, 'OK', {metadata: {
      score: 1
    }})
  
  ////

  const xdr = await fetch(`${TURRET_RUN_URL}/${txFunctionHash}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      ...body,
      txFunction,
    })
  })
  .then(async (res) => {
    if (res.ok)
      return res.text()
    throw res
  })

  const transaction = new Transaction(xdr, Networks[STELLAR_NETWORK])

  const txFunctionSignerKeypair = Keypair.fromSecret(txFunctionSignerSecret)
  const txFunctionSignature = txFunctionSignerKeypair.sign(transaction.hash()).toString('base64')

  return response.json({
    xdr,
    signer: txFunctionSignerPublicKey,
    signature: txFunctionSignature
  })
}