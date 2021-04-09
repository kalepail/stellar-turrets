- [ ] Support a global variable for the horizon endpoint the Turret will use by default
- [ ] txFunction run should bill regardless of success or failure and report that in the headers regardless of response status
- [ ] Add support for variable tolerance fees (e.g. [here](https://github.com/tyvdh/stellar-tss/blob/master/wrangler/src/txFunctions/run.js#L90-L91) & [here](https://github.com/tyvdh/stellar-tss/blob/master/wrangler/src/txSponsors/add.js#L20))
- [ ] Cron swallow `txFunctionFees` fees after {x} time and report that {x} time in the `turret/details.js` endpoint
- [ ] Enable [cache](https://github.com/tyvdh/stellar-tss/blob/master/wrangler/src/index.js#L44-L53) in production
- [ ] Add support for a stablecoin base conversion to XLM to allow for more reliable pricing
- [ ] Force txFunction upload txFunctionFee to have the txFunction hash as a memo id
- [ ] Concept of grouping txFunctions into buckets so a single txFunctionFee could be valid for any txFunction in the bucket

# Done
- [x] [~Add support for per txFunction dynamic variable fees~](https://github.com/tyvdh/stellar-tss/commit/785036ec693a937ad3d0f4178fcddea33f1eb4a3)
- [x] [~Lock down the Serverless service to only accept requests originating from the Wrangler worker~](https://github.com/tyvdh/stellar-tss/pull/5)
- [x] [~Prevent self swapping in the ctrlAccounts heal.js function~](https://github.com/tyvdh/stellar-tss/commit/75c77311822f8e75b4dcac654fbd2eac45a6d755)
- [x] [~Wiki API docs~](https://github.com/tyvdh/stellar-tss/wiki)
- [x] [~Implement fees for contract runs~](https://github.com/tyvdh/stellar-tss/pull/3)
- [x] [~Implement fees for contract uploads~](https://github.com/tyvdh/stellar-tss/commit/6c8b299e22fec41fa546cc3a7d2f74016c5f2351)
- [x] [~Implement txFunction heal functionality~](https://github.com/tyvdh/stellar-tss/pull/2)
