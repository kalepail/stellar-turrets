- [ ] Reach release candidate b 
- [ ] Enable [cache](https://github.com/tyvdh/stellar-turrets/blob/master/wrangler/src/index.js#L44-L53) in PUBLIC environments
- [ ] Support nth use txFee auth tokens (maybe token + nonce or sequence number)
- [ ] [`STRI 1`](https://github.com/tyvdh/stellar-turrets/issues/43)
- [ ] [`STRI 2`](https://github.com/tyvdh/stellar-turrets/issues/44)
- [ ] [`STRI 3`](https://github.com/tyvdh/stellar-turrets/issues/45)
- [ ] [`STRI 4`](https://github.com/tyvdh/stellar-turrets/issues/46)
- [ ] [`STRI 5`](https://github.com/tyvdh/stellar-turrets/issues/48)
- [ ] [`STRI 6`](https://github.com/tyvdh/stellar-turrets/issues/49)
- [ ] [`STRI 7`](https://github.com/tyvdh/stellar-turrets/issues/50)
- [ ] enable easier win32 support
- [ ] add address validation and other sanity checks
- [ ] error handling
- [ ] automate build process.


# Done
- [x] Support fee bump txFunctionFees for txFunction runs (Would permit using the same txSponsors for different pending txFunction fees per user. User pays sequence number, txSponsor pays fee)
- [x] Support for grouping txFunctions into buckets so a single txFunctionFee could be valid for any txFunction in a given bucket. (save on the number of `txFunctionFees` you have to keep track of. Useful if your service makes use of several different txFunctions. Promotes txFunction modularity without incurring the costs of txFunctionFee tracking)
- [x] txFunction run should bill regardless of success or failure and report that in the headers regardless of response status
- [x] Add support for variable tolerance fees
- [x] Support a global variable for the horizon endpoint the Turret will use by default
- [x] [~Add support for per txFunction dynamic variable fees~](https://github.com/tyvdh/stellar-turrets/commit/785036ec693a937ad3d0f4178fcddea33f1eb4a3)
- [x] [~Lock down the Serverless service to only accept requests originating from the Wrangler worker~](https://github.com/tyvdh/stellar-turrets/pull/5)
- [x] [~Prevent self swapping in the ctrlAccounts heal.js function~](https://github.com/tyvdh/stellar-turrets/commit/75c77311822f8e75b4dcac654fbd2eac45a6d755)
- [x] [~Wiki API docs~](https://github.com/tyvdh/stellar-turrets/wiki)
- [x] [~Implement fees for txFunction runs~](https://github.com/tyvdh/stellar-turrets/pull/3)
- [x] [~Implement fees for txFunction uploads~](https://github.com/tyvdh/stellar-turrets/commit/6c8b299e22fec41fa546cc3a7d2f74016c5f2351)
- [x] [~Implement txFunction heal functionality~](https://github.com/tyvdh/stellar-turrets/pull/2)

# Ideas
- [ ] Add support for a stablecoin base conversion to XLM to allow for more reliable pricing (Protect against XLM price fluctuations permitting more reliable pricing)
- [ ] Ability to flag a contract as a test which will then only live for {x} days. With the idea such a contract upload would incur lower or zero fees to upload
- [ ] update install instructions for both cloud and local/server install