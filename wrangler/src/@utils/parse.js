import { response } from 'cfw-easy-utils'

export async function parseError(err) {
  try {
    if (typeof err === 'string')
      err = {message: err, status: 400}

    if (err.headers?.has('content-type'))
      err.message = err.headers.get('content-type').indexOf('json') > -1 ? await err.json() : await err.text()

    if (!err.status)
      err.status = 400

    return response.json({
      ...(typeof err.message === 'string' ? {message: err.message} : err.message),
      status: err.status,
    }, {
      status: err.status,
      headers: {
        'Cache-Control': 'no-store'
      }
    })
  }

  catch(err) {
    return response.json(err, {
      headers: {
        'Cache-Control': 'no-store'
      }
    })
  }
}