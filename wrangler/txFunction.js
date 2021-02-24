(body) => {
  return fetch('https://tss-contract-5wkzvvzhfmmp.runkit.sh', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  })
  .then(async (res) => {
    if (res.ok)
      return res.text()
    throw res
  })
}

// [
//   {
//     "name": "destination",
//     "type": "string",
//     "description": "Stellar public key you'd like to pay",
//     "rule": "Must be a valid and funded Stellar public key"
//   }
// ]

// W3sibmFtZSI6ImRlc3RpbmF0aW9uIiwidHlwZSI6InN0cmluZyIsImRlc2NyaXB0aW9uIjoiU3RlbGxhciBwdWJsaWMga2V5IHlvdSdkIGxpa2UgdG8gcGF5IiwicnVsZSI6Ik11c3QgYmUgYSB2YWxpZCBhbmQgZnVuZGVkIFN0ZWxsYXIgcHVibGljIGtleSJ9XQ==

// b8e2ab0b275268abcd0650bae5d035519a9de09bc6bc30b4fdb1f176b08266dc
// GAIIVSGWLANX6IKOVKUNQEQYLU7GQZPJIN25VUM4W7JIT4QK35UIADYC

// ctrlAccount
// GBJ2UMKHZ5FK4LJJDLYSHK4TB3I5HNVKBTKQOAPPSCNZHV6SGMRBWLUO
// SDAODX4C4XK3P5UMRPYHVIF57E5PAJOLSP73DIAXJ4WDJ4XGQ7XL3BQO

// User
// GAV277VQFXN4AWABKHNMERLQ3ZC4W3COSGO4FYL23PTYFUZT27ABMQSF
// SAAOIFVIA3SUG56LBVN5Y4DGRFRLQO7M3OUCQXFHY7E7Q5XCLWKCQVC3