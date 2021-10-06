const fetch = require('node-fetch')

module.exports = (body) => {
  return fetch('https://tss-contract-5wkzvvzhfmmp.runkit.sh', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  })
  .then((res) => {
    if (res.ok)
      return res.text()
    throw res
  })
}