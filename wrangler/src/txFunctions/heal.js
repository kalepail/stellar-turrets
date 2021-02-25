import { response } from 'cfw-easy-utils'
import { Keypair, TransactionBuilder, Networks, BASE_FEE, Operation, Account } from 'stellar-base'
import { map, find, compact, intersection, chain, uniqBy } from 'lodash'
import Bluebird from 'bluebird'
import { parse } from '@iarna/toml'

import txFunctionsGet from '../txFunctions/get'
import turretToml from '../turret/toml'

const horizon = STELLAR_NETWORK === 'PUBLIC' ? 'https://horizon.stellar.org' : 'https://horizon-testnet.stellar.org'

export default async ({ request, params }) => {
  const { txFunctionHash } = params

  const { value, metadata } = await TX_FUNCTIONS.getWithMetadata(txFunctionHash, 'arrayBuffer')

  if (!value)
    throw {status: 404}

  const { sourceAccount, controlledAccount, removeTurret, addTurret } = await request.json()

  const { requiredThreshold, existingSigners } = await fetch(`${horizon}/accounts/${controlledAccount}`)
  .then((res) => {
    if (res.ok)
      return res.json()
    throw res
  })
  .then((account) => {
    const existingSigners = map(account.data, (value, key) => {
      value = Buffer.from(value, 'base64').toString('utf8')

      const signer = find(account.signers, {key: value})

      return key.indexOf('TSS') === 0 && signer ? {
        turret: key.replace('TSS_', ''),
        signer: value,
        weight: signer.weight
      } : null
    })

    return {
      requiredThreshold: account.thresholds.high_threshold,
      existingSigners
    }
  })

  const incomingTurretKeys = await Bluebird.map(uniqBy([
    {turret: addTurret},
    ...existingSigners
  ], 'turret'), async (signer) => {
    return {
      ...signer,
      ...await fetch(`${horizon}/accounts/${signer.turret}`)
      .then((res) => {
        if (res.ok)
          return res.json()
        throw res
      })
      .then((account) => {
        const { url } = request
        const { hostname } = new URL(url)

        return (
          hostname === account.home_domain // Workers can't call themselves
          ? txFunctionsGet({params: {txFunctionHash}}) 
          : fetch(`https://${account.home_domain}/tx-functions/${txFunctionHash}`)
        )
        .then((res) => {
          if (res.ok)
            return res.json()
          throw res
        })
        .then(async (data) => ({
          signer: data.signer,
          toml: await (
            hostname === account.home_domain // Workers can't call themselves
            ? turretToml()
            : fetch(`https://${account.home_domain}/.well-known/stellar.toml`)
          )
          .then(async (res) => {
            if (res.ok)
              return parse(await res.text())
            throw res
          })
        }))
      })
    }
  })

  const removeSigner = find(incomingTurretKeys, {turret: removeTurret})

  if (!removeSigner || removeSigner.toml)
    throw {status: 400, message: 'Signer is not able to be removed'}

  const addSigner = find(incomingTurretKeys, {turret: addTurret})

  if (!addSigner || !addSigner.toml)
    throw {status: 400, message: 'Signer is not able to be added'}

  const hasThreshold = chain(incomingTurretKeys)
  .filter((signer) => signer.toml && signer.weight)
  .sumBy('weight')
  .value()

  if (hasThreshold < requiredThreshold)
    throw {status: 400, message: 'Insufficient signer threshold'}

  const turrets = intersection(...compact(map(incomingTurretKeys, 'toml.TSS.TURRETS')))

  if (turrets.indexOf(addSigner.turret) === -1)
    throw {status: 400, message: `New turret isn't trusted by existing signer turrets`}

  const transaction = await fetch(`${horizon}/accounts/${sourceAccount}`)
  .then((res) => {
    if (res.ok)
      return res.json()
    throw res
  })
  .then((account) => new TransactionBuilder(
    new Account(account.id, account.sequence), 
    {
      fee: BASE_FEE,
      networkPassphrase: Networks[STELLAR_NETWORK]
    }
  )
  .addOperation(Operation.setOptions({
    signer: {
      ed25519PublicKey: removeSigner.signer,
      weight: 0
    }
  }))
  .addOperation(Operation.setOptions({
    signer: {
      ed25519PublicKey: addSigner.signer,
      weight: removeSigner.weight
    }
  }))
  .addOperation(Operation.manageData({
    name: `TSS_${removeSigner.turret}`,
    value: null,
  }))
  .addOperation(Operation.manageData({
    name: `TSS_${addSigner.turret}`,
    value: addSigner.signer,
  }))
  .setTimeout(0)
  .build())

  const { txFunctionSignerPublicKey, txFunctionSignerSecret } = metadata

  const txFunctionSignerKeypair = Keypair.fromSecret(txFunctionSignerSecret)
  const txFunctionSignature = txFunctionSignerKeypair.sign(transaction.hash()).toString('base64')

  return response.json({
    xdr: transaction.toXDR(),
    signer: txFunctionSignerPublicKey,
    signature: txFunctionSignature
  })
}