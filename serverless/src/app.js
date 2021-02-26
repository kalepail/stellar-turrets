const express = require('express')

global.fetch = require('node-fetch')
global.StellarSdk = require('stellar-sdk')
global.BigNumber = require('bignumber.js')

const app = express()

// TODO: Enforce an auth requirement between the serverless and wrangler apps
  // Ensure the incoming authorization bearer token has been signed by the TURRET_ADDRESS (will require adding TURRET_ADDRESS as a secret param)

app.use((req, res, next) => {
  const turretUrl = new URL(process.env.turretBaseUrl)
  const { hostname } = turretUrl

  if (hostname.indexOf(req.headers['cf-worker']) === -1)
    res
    .status(403)
    .send()

  else {
    res.set('Access-Control-Allow-Origin', process.env.turretBaseUrl)
    next()
  }
})

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.post('/:txFunctionHash', async (req, res) => {
  try {
    const { body, params } = req
    const { txFunctionHash } = params
    const txFunctionCode = body.txFunction || await fetch(`${process.env.turretBaseUrl}/tx-functions/${txFunctionHash}`)
    .then(async (res) => {
      if (res.ok) {
        const { function: txFunction } = await res.json()
        return txFunction
      } throw res
    })

    delete body.txFunction

    const txFunction = new Function(`return ${txFunctionCode}`)()
    const result = await txFunction(body)

    res.send(result)
  }

  catch(err) {
    if (typeof err === 'string')
      err = {message: err, status: 400}

    if (err?.headers.has('content-type')) 
      err.message = err.headers.get('content-type').indexOf('json') > -1
      ? await err.json()
      : await err.text()

    if (!err.status)
      err.status = 400

    res
    .status(err.status)
    .send({
      ...(
        typeof err.message === 'string'
        ? {message: err.message}
        : err.message
      ),
      status: err.status,
    })
  }
})

app.use((req, res) => {
  res
  .status(404)
  .send('Not Found')
})

module.exports = app
