const express = require('express')
const { VM } = require('vm2')

const fetch = require('node-fetch')
const StellarSdk = require('stellar-sdk')
const lodash = require('lodash')
const BigNumber = require('bignumber.js')
const Bluebird = require('bluebird')
const moment = require('moment')

const app = express()

app.use(express.json())
app.use(express.urlencoded())

app.post('/:txFunctionHash', async (req, res) => {
  try {
    const { body, params } = req
    const { txFunctionHash } = params
    const { function: txFunctionCode } = body.function
    ? body
    : await fetch(`${process.env.turretBaseUrl}/tx-functions/${txFunctionHash}`)
      .then(async (res) => {
        if (res.ok)
          return res.json()
        throw res
      })

    delete body.function

    const vm = new VM({
      console: 'off',
      wasm: false,
      eval: false,
      sandbox: {
        fetch,
        lodash,
        moment,
        StellarSdk,
        BigNumber,
        Bluebird,
      }
    })

    const txFunction = vm.run(txFunctionCode)
    const result = await txFunction(body)

    res.send(result)
  }

  catch(err) {
    if (typeof err === 'string')
      err = {message: err, status: 400}

    if (
      err.headers
      && err.headers.has('content-type')
    ) err.message = err.headers.get('content-type').indexOf('json') > -1
      ? await err.json()
      : await err.text()

    if (!err.status)
      err.status = 400

    res.status(err.status).send({
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
  res.status(404).send('Not Found')
})

module.exports = app
