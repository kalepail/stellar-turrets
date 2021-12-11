import { Router } from 'tiny-request-router'

import { parseError } from './@utils/parse'
import flushSingleUseAuthTokens from './@utils/flush-single-use-auth-tokens'

import TxFees from './@utils/do-tx-fees'

import turretToml from './turret/toml'
import turretDetails from './turret/details'

import txFunctionsGet from './txFunctions/get'
import txFunctionsList from './txFunctions/list'
import txFunctionsUpload from './txFunctions/upload'
import txFunctionsRun from './txFunctions/run'

import txFeesGet from './txFees/get'
import txFeesPay from './txFees/pay'

import ctrlAccountsHeal from './ctrlAccounts/heal'

const router = new Router()

router
.get('/', turretDetails)
.get('/.well-known/stellar.toml', turretToml)

router
.post('/tx-functions', txFunctionsUpload)
.get('/tx-functions', txFunctionsList)
.get('/tx-functions/:txFunctionHash', txFunctionsGet)
.post('/tx-functions/:txFunctionHash', txFunctionsRun)

router
.get('/tx-fees', txFeesGet)
.post('/tx-fees/:publicKey', txFeesPay)

router
.put('/ctrl-accounts/:ctrlAccount', ctrlAccountsHeal)

// router
// .get('/test', flushSingleUseAuthTokens)

async function handleRequest(request, env, ctx) {
  try {
    const cache = caches.default
    const { method, url } = request
    const { href, pathname } = new URL(url)

    if (method === 'OPTIONS')
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Authorization, Origin, Content-Type, Accept, Cache-Control, Pragma',
          'Access-Control-Allow-Methods': 'GET, PUT, POST, DELETE, PATCH, OPTIONS',
          'Cache-Control': 'public, max-age=2419200', // 28 days
        }
      })

    // TODO: check and re-enable cache in production

    // else if (method === 'GET') {
    //   const cacheMatch = await cache.match(href)

    //   if (cacheMatch)
    //     return cacheMatch
    // }

    ////

    const routerMatch = router.match(method, pathname)

    if (routerMatch) {
      const routerResponse = await routerMatch.handler({
        ...routerMatch,
        cache,
        request,
        env,
        ctx
      })

      if (
        method === 'GET'
        && routerResponse.status >= 200
        && routerResponse.status <= 299
      ) ctx.waitUntil(cache.put(href, routerResponse.clone()))

      return routerResponse
    }

    throw {status: 404}
  }

  catch(err) {
    return parseError(err)
  }
}

function handleScheduled(metadata, env, ctx) {
  return Promise.all([
    flushSingleUseAuthTokens({metadata, env, ctx})
  ])
}

exports.TxFees = TxFees
exports.handlers = {
  async fetch(request, env, ctx) {
    return handleRequest(request, env, ctx)
  },
  async scheduled(metadata, env, ctx) {
    return handleScheduled(metadata, env, ctx)
  }
}