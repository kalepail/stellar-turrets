- [ ] Add support for per txFunction [dynamic variable fees](https://github.com/tyvdh/stellar-tss/blob/master/wrangler/src/txFunctions/run.js#L55)
- [ ] Add support for variable tolerance fees (e.g. [here](https://github.com/tyvdh/stellar-tss/blob/master/wrangler/src/txFunctions/run.js#L90-L91) & [here](https://github.com/tyvdh/stellar-tss/blob/master/wrangler/src/txSponsors/add.js#L20))
- [ ] Add support for a stablecoin base conversion to XLM to allow for more reliable pricing
- [ ] Enable [cache](https://github.com/tyvdh/stellar-tss/blob/master/wrangler/src/index.js#L44-L53) in production

# Done
- [x] [~Lock down the Serverless service to only accept requests originating from the Wrangler worker~](https://github.com/tyvdh/stellar-tss/pull/5)
- [x] [~Prevent self swapping in the ctrlAccounts heal.js function~](https://github.com/tyvdh/stellar-tss/commit/75c77311822f8e75b4dcac654fbd2eac45a6d755)
- [x] [~Wiki API docs~](https://github.com/tyvdh/stellar-tss/wiki)
- [x] [~Implement fees for contract runs~](https://github.com/tyvdh/stellar-tss/pull/3)
- [x] [~Implement fees for contract uploads~](https://github.com/tyvdh/stellar-tss/commit/6c8b299e22fec41fa546cc3a7d2f74016c5f2351)
- [x] [~Implement txFunction heal functionality~](https://github.com/tyvdh/stellar-tss/pull/2)
