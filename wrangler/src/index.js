import { Router } from 'tiny-request-router'
import { response } from 'cfw-easy-utils'

import { parseError } from './@js/utils'

import turretToml from './turret/toml'
import turretDetails from './turret/details'

import txFunctionsGet from './txFunctions/get'
import txFunctionsUpload from './txFunctions/upload'
import txFunctionsRun from './txFunctions/run'
// import txFunctionsHeal from './txFunctions/heal'

const router = new Router()

router
.get('/.well-known/stellar.toml', turretToml)
.get('/', turretDetails)

router
.get('/tx-functions/:txFunctionHash', txFunctionsGet)
.post('/tx-functions', txFunctionsUpload)
.post('/tx-functions/:txFunctionHash', txFunctionsRun)
// .put('/tx-functions', txFunctionsHeal)

async function handleRequest(event) {
  try {
    const cache = caches.default
    const { request } = event
    const { method, url } = request
    const { href, pathname } = new URL(url)

    if (method === 'OPTIONS')
      return response.cors()

    // else if (method === 'GET') {
    //   const cacheMatch = await cache.match(href)

    //   if (cacheMatch)
    //     return cacheMatch
    // }

    const routerMatch = router.match(method, pathname)

    if (routerMatch) {
      const routerResponse = await routerMatch.handler({
        cache,
        ...event,
        ...routerMatch,
      })

      if (
        method === 'GET'
        && routerResponse.status >= 200
        && routerResponse.status <= 299
      ) event.waitUntil(cache.put(href, routerResponse.clone()))

      return routerResponse
    }

    throw {status: 404}
  }

  catch(err) {
    return parseError(err)
  }
}

addEventListener('fetch', (event) =>
  event.respondWith(handleRequest(event))
)