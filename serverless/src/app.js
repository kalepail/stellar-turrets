import { Keypair, FastSigning } from 'stellar-sdk'

export default async (event) => {
  try {
    if (
      event.rawPath === '/'
      && event.requestContext.http.method === 'GET'
    ) return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        version: VERSION,
        FastSigning,
      })
    }

    const body = JSON.parse(event.body)
    const { HORIZON_URL, STELLAR_NETWORK } = body // Global variables for use in the txFunction
    const params = event.pathParameters
    const headers = event.headers

    const turretSignerKeypair = Keypair.fromPublicKey(process.env.turretSigner)
    const turretRunAuthBuffer = Buffer.from(headers['x-turret-data'], 'base64')
    const turretRunAuthSignatureBuffer = Buffer.from(headers['x-turret-signature'], 'base64')

    if (!turretSignerKeypair.verify(turretRunAuthBuffer, turretRunAuthSignatureBuffer)) 
      throw { status: 403 }

    const { txFunctionHash } = params
    const txFunctionCode = (
      body.txFunction // Raw txFunction code string has been included in the body
      || await fetch(`${process.env.turretBaseUrl}/tx-functions/${txFunctionHash}`) // Otherwise just pull it from the turretBaseUrl
      .then(async (res) => {
        if (res.ok) {
          const { function: txFunction } = await res.json()
          return txFunction
        } throw res
      })
    )

    delete body.HORIZON_URL
    delete body.STELLAR_NETWORK
    delete body.txFunction

    // const txFunction = new Function(`
    //   __filename,
    //   __dirname,
    //   require,
    //   module,
    //   HORIZON_URL,
    //   STELLAR_NETWORK,
    //   global,
    //   globalThis,
    //   process
    // `, // leave [global, globalThis, process] empty to effectively unset them
    // `
    //   'use strict'; 
    //   ${txFunctionCode}; 
    //   return module.exports;
    // `)(
    //   __filename,
    //   __dirname,
    //   require,
    //   {exports: null},
    //   HORIZON_URL,
    //   STELLAR_NETWORK,
    // )
    // const result = await txFunction(body)

    const result = await eval(`
      'use strict'; 
      ${txFunctionCode};
      module.exports;
    `)(body)

    return {
      statusCode: 200,
      body: result
    }
  }

  catch(err) {
    if (typeof err === 'string')
      err = {message: err, status: 400}

    else if (err.headers?.has('content-type')) 
      err.message = err.headers.get('content-type').indexOf('json') > -1
      ? await err.json()
      : await err.text()

    if (!err.status)
      err.status = 400

    return {
      statusCode: err.status,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ...(
          typeof err.message === 'string'
          ? {message: err.message}
          : err.message
        ),
        status: err.status,
      })
    }
  }
}