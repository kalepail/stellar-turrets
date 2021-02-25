import { response } from 'cfw-easy-utils'
import { Keypair, TransactionBuilder, Transaction, Networks, BASE_FEE, Operation, Account, Asset } from 'stellar-base'
import { each, groupBy } from 'lodash'

import BigNumber from 'bignumber.js'

// TODO: how do we ensure stored Turret fees aren't reused in this settle endpoint?

export default async ({ request }) => {
  const { fees, sourceAccount } = await request.json()

  const horizon = STELLAR_NETWORK === 'PUBLIC' ? 'https://horizon.stellar.org' : 'https://horizon-testnet.stellar.org'

  let transaction = await fetch(`${horizon}/accounts/${sourceAccount}`)
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
  .setTimeout(0))

  const destinations = groupBy(fees, (txFunctionFee) => {
    const feeTxn = new Transaction(txFunctionFee, Networks[STELLAR_NETWORK])
    return feeTxn.operations[0].destination
  })

  each(destinations, (value, key) => {
    const amounts = value.map((txFunctionFee) => {
      const feeTxn = new Transaction(txFunctionFee, Networks[STELLAR_NETWORK])
      return feeTxn.operations[0].amount
    })

    const amount = new BigNumber.sum(...amounts)
  
    transaction
    .addOperation(Operation.payment({
      destination: key,
      asset: Asset.native(),
      amount: new BigNumber(amount).toFixed(7)
    }))
  })

  transaction = transaction.build()

  const turretKeypair = Keypair.fromSecret(TURRET_SECRET)
  const turretSignature = turretKeypair.sign(transaction.hash()).toString('base64')

  return response.json({
    xdr: transaction.toXDR(),
    signer: TURRET_ADDRESS,
    signature: turretSignature
  })
}