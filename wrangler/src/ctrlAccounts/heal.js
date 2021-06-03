import { response } from 'cfw-easy-utils'
import { Keypair, TransactionBuilder, Networks, BASE_FEE, Operation, Account } from 'stellar-base'
import { map, find, compact, intersection, chain } from 'lodash'
import Bluebird from 'bluebird'
import { parse } from '@iarna/toml'

import txFunctionsGet from '../txFunctions/get'
import turretToml from '../turret/toml'

export default async ({ request, params, env }) => {
  const { TX_FUNCTIONS, TURRET_ADDRESS, STELLAR_NETWORK, HORIZON_URL } = env
  const { 
    functionHash: txFunctionHash, 
    sourceAccount, 
    removeTurret, 
    addTurret 
  } = await request.json()

  if (
    removeTurret === TURRET_ADDRESS
    || addTurret === TURRET_ADDRESS
  ) throw `Turrets may not add or remove themselves from a ctrlAccount`

  const { value, metadata } = await TX_FUNCTIONS.getWithMetadata(txFunctionHash, 'arrayBuffer')

  if (!value)
    throw {status: 404, message: `txFunction could not be found this turret`}

  const { ctrlAccount } = params

  const { requiredThreshold, existingSigners } = await fetch(`${HORIZON_URL}/accounts/${ctrlAccount}`)
  .then((res) => {
    if (res.ok)
      return res.json()
    throw res
  })
  .then((account) => {
    const existingSigners = chain(account.data) 
    .map((value, key) => {
      value = Buffer.from(value, 'base64').toString('utf8')

      const signer = find(account.signers, {key: value})

      return key.indexOf('TSS') === 0 && signer ? {
        turret: key.replace('TSS_', ''),
        signer: value,
        weight: signer.weight
      } : null
    })
    .compact()
    .value()

    return {
      requiredThreshold: account.thresholds.high_threshold,
      existingSigners
    }
  })

  // return response.json({requiredThreshold, existingSigners})

  const incomingTurretKeys = await Bluebird.map(
    chain([
      {turret: addTurret},
      ...existingSigners
    ])
    .orderBy('weight', 'asc')
    .uniqBy('turret')
    .value(), 
    async (signer) => ({
      ...signer,
      ...await fetch(`${HORIZON_URL}/accounts/${signer.turret}`)
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
      .catch(() => null)
    })
  )

  // return response.json({incomingTurretKeys})

  const removeSigner = find(incomingTurretKeys, {turret: removeTurret})

  if (!removeSigner || removeSigner.toml)
    throw 'Signer is not able to be removed'

  const addSigner = find(incomingTurretKeys, {turret: addTurret})

  if (!addSigner || !addSigner.toml)
    throw 'Signer is not able to be added'

  const hasThreshold = chain(incomingTurretKeys)
  .filter((signer) => signer.toml && signer.weight)
  .sumBy('weight')
  .value()

  // return response.json({hasThreshold, requiredThreshold})

  if (hasThreshold < requiredThreshold)
    throw 'Insufficient signer threshold'

  const turrets = intersection(...compact(map(incomingTurretKeys, 'toml.TSS.TURRETS')))

  if (turrets.indexOf(addSigner.turret) === -1)
    throw `New turret isn't trusted by existing signer turrets`

  const transaction = await fetch(`${HORIZON_URL}/accounts/${sourceAccount}`)
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