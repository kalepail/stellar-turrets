import { response } from 'cfw-easy-utils'

export default async ({ request, env }) => {
  const { TX_FUNCTIONS } = env

  const url = new URL(request.url)
  const query = Object.fromEntries(url.searchParams.entries())
  const { limit, cursor: c } = query

  let { list_complete, cursor, keys } = await TX_FUNCTIONS.list({ limit, cursor: c })

  keys = keys.map(({name, metadata: {txFunctionSignerPublicKey}}) => ({
    hash: name,
    signer: txFunctionSignerPublicKey
  }))

  return response.json({
    list_complete,
    cursor,
    keys
  }, {
    headers: {
      'Cache-Control': 'public, max-age=300'
    }
  })
}