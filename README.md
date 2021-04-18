# Stellar Turing Signing Server Reference Implementation

This TSS reference implementation employs two serverless services. Cloudflare workers and an AWS lambda function. The reason for this is that txFunctions are by their nature unsafe arbitrary Javascript functions. Cloudflare doesn't allow the execution of such functions thus we're splitting the workload between the much more performant and affordable Cloudflare workers and an AWS lambda function which will serve as our txFunction execution environment.

See below for specific instructions for setting up and running both services.

## Wrangler (Cloudflare)
If you haven't already go ahead and [signup for Cloudflare workers](https://dash.cloudflare.com/). You can attempt to run on their free tier but I highly suggest just biting the very affordable bullet and upgrading to their $5/mo plan which will allow you to scale much more nicely.

Next generate the `.env` and `wrangler.toml` files from their templates. Just run `npm run init` inside the `wrangler` subdirectory. The script will ask for a bunch of values, which you'll need at hand in order to successfully finish the init step. If there are default-values, they will be prefilled (e.g. `HORIZON_URL` defaults to the test net). If you don't have the value at hand (i.e. you can only run the wrangler cli to create KV namespaces (step 2 below) *after* providing `WRANGLER_ACCOUNT_ID`) just hit enter. You can repeat this step as often as you want to. Variables in `.env` that already have values assigned won't be updated again by this step.

1. For the `account_id` go to the workers page on [dash.cloudflare.com](https://dash.cloudflare.com) and copy your `Account ID`.
2. For `kv_namespaces` create four new kv namespaces via the wrangler cli:
```
$ npx wrangler kv:namespace create "META"
$ npx wrangler kv:namespace create "TX_FUNCTIONS"
$ npx wrangler kv:namespace create "TX_FEES"
$ npx wrangler kv:namespace create "TX_SPONSORS"
```
Each of those commands will spit out the object you should use to provide in the init-step.

3. Finally for `vars` set `STELLAR_NETWORK` to either `TESTNET` or `PUBLIC` to toggle this Turret between using either the Test or Public Stellar network passphrases. For `HORIZON_URL` place in the url for the horizon service your Turret will consume. This should match with either the Test or Public network passphrase which you just set for the `STELLAR_NETWORK` variable. For `TURRET_ADDRESS` just use any valid, funded, Stellar account you privately own. This is the account into which fees will be paid as txFunctions are uploaded and run on your Turret. Next set `TURRET_RUN_URL` to `null` for now until we've got the Serverless AWS lambda setup with it's endpoint, at which point you'll update this value to that url. Finally set the `XLM_FEE_MIN`, `XLM_FEE_MAX`, `UPLOAD_DIVISOR`, and  `RUN_DIVISOR` values to reasonable defaults. (For more info on these fee variables review the [Fee Wiki](https://github.com/tyvdh/stellar-tss/wiki/fees).)

Now that the `wrangler.toml` file has been created let's move to the `stellar.toml` file. This file is where you'll create your Turret's `stellar.toml` file particularly noting the `[TSS].TURRETS` array. This will be an array of other Turret addresses that you trust to cohost txFunctions with in the case of txFunction healing. For now just make sure to include your own `TURRET_ADDRESS` which you selected in the previous steps.

Once you've got that go ahead and upload it to the `META` kv store you instantiated earlier.
```
$ npx wrangler kv:key put --binding=META "STELLAR_TOML" ./stellar.toml --path
```
Make sure to run these wrangler commands from the `./wrangler` directory

Finally to deploy the project run:
```
$ npm i
$ npm run deploy
```
From within the `./wrangler` directory.

You may have to work through a few errors to get logged into your Cloudflare account but the wrangler cli errors are typically quite helpful. Feel free to update this README with more clear instructions as it's been ages since I started from scratch on my first wrangler project.

4. Once you've successfully got your project created and running upload a `TURRET_SIGNER` Stellar secret key to your Cloudflare worker.
```
$ npx wrangler secret put TURRET_SIGNER
```
When the dialog asks your for a value paste in a valid Stellar **secret key**. Most often this will be the secret key counterpart to your `TURRET_ADDRESS` but this isn't a requirement. This key is used to authenticate requests between your Cloudflare and Serverless services, nothing else.

## Serverless (AWS)
Next we have the Serverless lambda endpoint which is hosted with AWS but deployed using the far more sane [serverless.com](https://serverless.com) cli tool. If you haven't go create both an [AWS console account](https://www.amazon.com/) and a [serverless.com account](https://www.serverless.com/dashboard/). Once you have those setup ensure you've got the [serverless cli installed](https://github.com/serverless/components#quick-start).

Now it'll be the fun task of getting:
```
$ npm i
$ npm run deploy
```
To successfully run from within the `./serverless` directory.

You will be prompted for `SLS_ORG`, `TURRET_BASE_URL` and `TURRET_SIGNER_ACCOUNT`. The first one must match your organization you use in serverless to deploy the lambda. `TURRET_BASE_URL` needs to reflect the worker base url where your wrangler service is hosted on. The `TURRET_SIGNER_ACCOUNT` needs to be set to your Turret's `TURRET_SIGNER` **public key** that you have set in the Wrangler setup step before.

This connection is what secures and protects access between the Cloudflare and Serverless APIs. Remember Cloudflare gets the **private key** and Serverless gets the **public key**.

Follow any errors carefully and you should be able to get successfully deployed pretty quickly. The most probable issue will be you need to manually create an app in the [Serverless dashboard](https://app.serverless.com/) and attach some new IAM credentials to it manually. There's a helpful UI walk through they have so you should be able to sort it out. Again feel free to update these docs with more clear instructions as you sort out the nuances of setting the Serverless service up.

*If* you are going to use the github action to deploy serverless, you need to set the three variables from above as repo-secrets as well.

When you finally get success on this task you'll be rewarded with an endpoint where your function is hosted. Copy that base url and paste it as the value for the `TURRET_FUNCTION_RUNNER_URL` `var` back in the `.env` file in the `./wrangler` directory and run `npm run init && npm run deploy` again to update the worker to point to your lambda.

## Congrats!
Assuming both `npm run deploy`'s are now firing off without a hitch you should have a fully functional Turing Signing Server ready to participate in the TSS network delivering decentralized smart contracting functionality to anyone and everyone who chooses to use your Turret. Nice!

## CI (github actions)
There are GH actions defined to actually deploy the serverless and wrangler parts continously. For this to work add the following secrets to your (cloned) repo:

| VARIABLE | Description | Default |
| --- | --- | --- |
| *STELLAR_NETWORK* | the network to use | **TESTNET** |
| *HORIZON_URL* | URL of horizon server. | **https://horizon-testnet.stellar.org** |
| TURRET_ADDRESS | Existing and funded stellar address to receive fees |  |
| TURRET_FUNCTION_RUNNER_URL | base URL of function runner (serverless part from above) | null |
| WRANGLER_ACCOUNT_ID | ID of cloudflare account to deploy wrangler to |  |
| WRANGLER_API_TOKEN | Token for cloudflare API access |  |
| *WRANGLER_WORKER_NAME* | name of your worker inside cloudflare | **tss-wrangler** |
| WRANGLER_META | KV namesapace for worker's META information |  |
| WRANGLER_TX_FUNCTIONS | KV namespace for worker's functions |  |
| WRANGLER_TX_FEES | KV namesapce for worker's fees |  |
| WRANGLER_TX_SPONSORS | KV namespace for worker's sponsors |  |
| *WRANGLER_XLM_FEE_MIN* | see https://github.com/tyvdh/stellar-tss/wiki/fees | **1** |
| *WRANGLER_XLM_FEE_MAX* | see https://github.com/tyvdh/stellar-tss/wiki/fees | **10** |
| *WRANGLER_UPLOAD_DIVISOR* | see https://github.com/tyvdh/stellar-tss/wiki/fees | **1000** |
| *WRANGLER_RUN_DIVISOR* | see https://github.com/tyvdh/stellar-tss/wiki/fees | **100000** |
| SLS_ORG | The serverless organization to deploy to |  |
| SLS_TURRET_BASE_URL | Base URL of turret (wrangler URL) |  |
| SLS_TURRET_SIGNER_ACCOUNT | Public key of function signer (counterpart to turret's **private** signer key) |  |
| SERVERLESS_ACCESS_KEY | Token for SLS API access |  |

optional values are *italic* (i.e. will be using defaults if not set)

## [API Docs](https://github.com/tyvdh/stellar-tss/wiki)

## Disclaimer
This is alpha software representing a reference implementation for the [TSS protocol](https://tss.stellar.org/).

For this reason I strongly suggest either:  
A) Leaving your `STELLAR_NETWORK` set to `TESTNET`  
or B) Encouraging users to leave themselves as a majority signer on any controlled account they're attaching Turret signers to
