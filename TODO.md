- [ ] Switch arbitrary message signing for `txFunctionFees` to use some sane Stellar transaction syntax
  e.g.
  ```
  AAAAAgAAAAB8M/Skn11R7CzN6IfUfjPmyJM6GVkZ/nwM/wIReXe0vQAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAFAAAAAA8xOxyMRsNbNbNQRXCEd9tByvSzqHsS5+IjleKAbU98gAAAAAAAAABeXe0vQAAAEDjSi8/W07tYUAS+AzOEHtE1eWEZG0mDTwuxk5Fn12XLRD9dsW/BZzcKS1xQegDr8wCWDe4xfZKhdWJHLGfulwK
  ```
  ```
  AAAAAgAAAAB8M/Skn11R7CzN6IfUfjPmyJM6GVkZ/nwM/wIReXe0vQAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMAAAAAAAAAFAAAAAA8xOxyMRsNbNbNQRXCEd9tByvSzqHsS5+IjleKAbU98gAAAAAAAAAKAAAADXR4RnVuY3Rpb25zW10AAAAAAAABAAAAQGFlMGIyZmY3Y2IwNWUxNDIwYmIzZjEzYWYzZmM1MmFkMGRkODRhMWJlNGVmNGU0MmRjYzFhOTYwYjdjMjRhZDQAAAAAAAAACgAAAA10eEZ1bmN0aW9uc1tdAAAAAAAAAQAAAEAyY2IyY2QwOWM1YTZiODViNTI0Yjk0ZGJlYjBhZGVhYWQyMDk0YjM0NTZjMzZhMTZjNDU0ZjNhODc0NGMwODkyAAAAAAAAAAF5d7S9AAAAQOD8XPD7ZoBBJWobk/f/Fby/SZ2Mw7dNM5jRDpIXRdpUsQYCCawkZhjP3DXGBM3H158vMrMSSz8YUdS9EdPt0Ag=
  ```
- [ ] Cron job to swallow `txFunctionFees` fees after {x} time and report that {x} time in the `turret/details.js` endpoint
- [ ] Enable [cache](https://github.com/tyvdh/stellar-tss/blob/master/wrangler/src/index.js#L44-L53) in PUBLIC environments

# Done
- [x] Support fee bump txFunctionFees for txFunction runs (Would permit using the same txSponsors for different pending txFunction fees per user. User pays sequence number, txSponsor pays fee)
- [x] Support for grouping txFunctions into buckets so a single txFunctionFee could be valid for any txFunction in a given bucket. (save on the number of `txFunctionFees` you have to keep track of. Useful if your service makes use of several different txFunctions. Promotes txFunction modularity without incurring the costs of txFunctionFee tracking)
- [x] txFunction run should bill regardless of success or failure and report that in the headers regardless of response status
- [x] Add support for variable tolerance fees
- [x] Support a global variable for the horizon endpoint the Turret will use by default
- [x] [~Add support for per txFunction dynamic variable fees~](https://github.com/tyvdh/stellar-tss/commit/785036ec693a937ad3d0f4178fcddea33f1eb4a3)
- [x] [~Lock down the Serverless service to only accept requests originating from the Wrangler worker~](https://github.com/tyvdh/stellar-tss/pull/5)
- [x] [~Prevent self swapping in the ctrlAccounts heal.js function~](https://github.com/tyvdh/stellar-tss/commit/75c77311822f8e75b4dcac654fbd2eac45a6d755)
- [x] [~Wiki API docs~](https://github.com/tyvdh/stellar-tss/wiki)
- [x] [~Implement fees for txFunction runs~](https://github.com/tyvdh/stellar-tss/pull/3)
- [x] [~Implement fees for txFunction uploads~](https://github.com/tyvdh/stellar-tss/commit/6c8b299e22fec41fa546cc3a7d2f74016c5f2351)
- [x] [~Implement txFunction heal functionality~](https://github.com/tyvdh/stellar-tss/pull/2)

# Ideas
- [ ] Add support for a stablecoin base conversion to XLM to allow for more reliable pricing (Protect against XLM price fluctuations permitting more reliable pricing)
- [ ] Ability to flag a contract as a test which will then only live for {x} days. With the idea such a contract upload would incur lower or zero fees to upload
- [ ] Force the txFunction upload txFunctionFee to have the txFunction hash as a memo id (Not sure what the rationale behind this was)
