import { response } from 'cfw-easy-utils'
import BigNumber from 'bignumber.js'
import moment from 'moment'
import Bluebird from 'bluebird'

// TODO:
  // Better error reporting, use try/catch

export default class TxFees {
  constructor(state, env) {
    const { META } = env

    this.storage = state.storage
    this.META = META
  }

  async fetch(request) {
    const url = new URL(request.url)
    const { pathname } = url
    const [, segment_1] = pathname.split('/')
    const { method } = request

    if (typeof this.value !== 'object') {
      const iv = await this.storage.get('value') || {
        lastModifiedTime: 0,
        balance: 0
      }

      this.value = typeof this.value !== 'object' ? iv : this.value
    }

    if (segment_1) {

      if (method === 'POST') {
        const transactionHash = segment_1

        if (!this[transactionHash]) {
          const iTransactionHash = await this.storage.get(transactionHash) || null
    
          this[transactionHash] = this[transactionHash] || iTransactionHash
        }
  
        if (this[transactionHash])
          return response.json({
            message: `Auth token has already been used`
          }, {
            status: 402
          })
  
        else {
          this[transactionHash] = 'OK'
          await this.storage.put(transactionHash, 'OK')
        }  
  
        return response.text('OK')
      }

      else if (method === 'DELETE') {
        const publicKey = segment_1
        const body = await request.json()
        const deleteCount = await this.storage.delete(body)

        await Bluebird.map(body, (transactionHash) => this.META.delete(`suat:${publicKey}:${transactionHash}`))

        return response.text(deleteCount)
      }

      else
        return new Response(null, {status: 404})
    }

    else if (method === 'POST') {
      const body = await request.json()

      this.value.lastModifiedTime = moment.utc().format('x')

      if (body.plus)
        this.value.balance = new BigNumber(this.value.balance).plus(body.plus).toFixed(7)
      if (body.minus)
        this.value.balance = new BigNumber(this.value.balance).minus(body.minus).toFixed(7)

      const cv = Object.assign({}, this.value)

      await this.storage.put('value', cv)

      return response.json(cv)
    }

    else
      return response.json(this.value)
  }
}