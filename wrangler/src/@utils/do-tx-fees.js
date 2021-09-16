import { response } from 'cfw-easy-utils'
import BigNumber from 'bignumber.js'
import moment from 'moment'

export default class TxFees {
  constructor(state, env) {
    this.storage = state.storage
  }

  async fetch(request) {
    const { method } = request

    if (typeof this.value !== 'object') {
      const iv = await this.storage.get('value') || {
        lastModifiedTime: 0,
        balance: 0
      }

      this.value = typeof this.value !== 'object' ? iv : this.value
    }

    if (method === 'POST') {
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