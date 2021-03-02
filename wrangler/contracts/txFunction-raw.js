module.exports = (body) => {
  const { TransactionBuilder, Networks, BASE_FEE, Operation, Asset, Account } = StellarBase
  const { source, destination } = body

  return fetch(`https://horizon-testnet.stellar.org/accounts/${source}`)
  .then((res) => {
    if (res.ok)
      return res.json()
    throw res
  })
  .then((account) =>
    new TransactionBuilder(
      new Account(account.id, account.sequence), 
      { 
        fee: BASE_FEE, 
        networkPassphrase: Networks.TESTNET
      }
    )
    .addOperation(Operation.payment({
      destination,
      asset: Asset.native(),
      amount: '1',
    }))
    .setTimeout(0)
    .build()
    .toXDR()
  )
}