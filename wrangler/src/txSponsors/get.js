import { response } from 'cfw-easy-utils'

export default async () => {
  const txFees = await TX_FEES.list()
  .then((res) => res.keys.map((key) => key.metadata))

  return response.json({
    fees: txFees
  }, {
    headers: {
      'Cache-Control': 'public, max-age=300', // 5 minutes
    }
  })
}