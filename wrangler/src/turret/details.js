import { response } from 'cfw-easy-utils'

export default async () => {
  const txFunctions = await TX_FUNCTIONS.list()
  .then((res) => {
    res.keys = res.keys.map((key) => {
      key.hash = key.name
      key.signer = key.metadata.txFunctionSignerPublicKey

      delete key.name
      delete key.metadata

      return key
    })

    return res
  })

  return response.json({
    stellarNetwork: STELLAR_NETWORK, // TESTNET
    turretAddress: TURRET_ADDRESS, // GDD4PR3ZYXM63JWWSIRQ4UAOZ7PM336P5GSXCRYQKAP7AUOWCNCENXVT, SDIUMUIIQZRCJQQD5VNH5QGQOLDG75KKJAY7W6Q3E3ACGNTLWQWPJRXT
    functions: txFunctions
  }, {
    headers: {
      'Cache-Control': 'public, max-age=300', // 5 minutes
    }
  })
}