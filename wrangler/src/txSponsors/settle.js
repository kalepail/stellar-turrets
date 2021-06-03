import { response } from 'cfw-easy-utils'
import { Keypair, TransactionBuilder, Account, BASE_FEE, Networks, Operation } from 'stellar-base'

export default async (claimableBalanceId, env) => {
  const { TURRET_SIGNER, STELLAR_NETWORK, HORIZON_URL } = env
  const turretSignerKeypair = Keypair.fromSecret(TURRET_SIGNER)
  const turretSignerPublicKey = turretSignerKeypair.publicKey()

  await fetch(`${HORIZON_URL}/accounts/${turretSignerPublicKey}`)
  .then((res) => {
    if (res.ok)
      return res.json()
    throw res
  }).then((account) => {
    const transaction = new TransactionBuilder(
      new Account(account.id, account.sequence), 
      {
        fee: BASE_FEE,
        networkPassphrase: Networks[STELLAR_NETWORK]
      }
    )
    .addOperation(Operation.claimClaimableBalance({
      balanceId: claimableBalanceId
    }))
    .setTimeout(0)
    .build()

    transaction.sign(turretSignerKeypair)

    const tx = transaction.toXDR()
    const txBody = new FormData()
          txBody.append('tx', tx)

    return fetch(`${HORIZON_URL}/transactions`, {
      method: 'POST',
      body: txBody
    })
    .then(async (res) => {
      if (res.ok)
        return res.json()
      throw res
    })
  })

  return response.text('OK')
}