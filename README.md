# Stellar Turrets Reference Implementation

This Stellar Turrets reference implementation employs two serverless services. Cloudflare workers and an AWS lambda function. The reason for this is that txFunctions are by their nature unsafe arbitrary Javascript functions. Cloudflare doesn't allow the execution of such functions thus we're splitting the workload between the much more performant and affordable Cloudflare workers and an AWS lambda function which will serve as our txFunction execution environment.

See below for specific instructions for setting up and running both services.


## Installation Guide

There are two apps you need to deploy one in [`/serverless](#AWS-serverless) and one in [/wrangler](#CloudFlare-Workers-setup-wrangler).
  

### CloudFlare Workers setup wrangler

 - If you haven't already go ahead and [signup for Cloudflare workers](https://dash.cloudflare.com/). You can attempt to run on their free tier but I highly suggest just biting the very affordable bullet and upgrading to their $5/mo plan which will allow you to scale much more nicely.
 - After you've signed up for cloudflare workers, go ahead and create a new service for your turret or two if you want to run on testnet and livenet.
 - Now back at your console there are a few prerequisites. First you should have NodeJS 16 or newer installed along with npm. You should have access to the commands `npm` and `npx` from your console. You will also need to have CloudFlare wrangler installed. 

`npm install -g @cloudflare/wrangler` (you don't need a global install, but i find it convenient.)

run `wrangler login` or `wrangler config`

For the next step you will need to have a number of values from your CloudFlare account. Some basic info on obtaining these values is below.

#### Setting Up Your Environment (`.env` and `wrangler.toml`)

Generate the `.env` and `wrangler.toml` files from their templates.
```sh
cd wrangler
npm install
npm run init
```
**Notes:**

 - The `init` script will ask for the values mentioned above, which
   you'll need at hand in order to successfully finish the init step, to
   get them for the first time you may need to run the script multiple
   times. TODO: update init to be compatible with win32
 - Setup your `WRANGLER_ACCOUNT_ID` first, because you because
   `wrangler-cli` requires it in order to create the `kv_namespaces`
   below. 
 - Create the key value store namespaces that go into the
   `kv_namespaces` on your CloudFlare project.
 - You can rerun the init script as many times as you find necessary, so
   if you don't have the value at hand just hit enter.
 - Variables in `.env` that already have values assigned won't be updated again by
   this step, so you may need to update them manually if they need
   changed.

** **
| env variables | explanations: | Default:
| -- | -- | -- |
| `WRANGLER_ACCOUNT_ID` | For the `account_id` go to the workers page on [dash.cloudflare.com](https://dash.cloudflare.com) and copy your`Account ID`. | 
| [TESTNET_HORIZON_URL](#horizon-url)  | The testnet horizon to use.| `https://horizon-testnet.stellar.org` 
| [TESTNET_TURRET_ADDRESS](#turret-address) | The testnet address of your turret. | |
| [TESTNET_TURRET_FUNCTION_RUNNER_URL](#turret-run-url) | the endpoint for your function runner [turret-run-url](#turret-run-url) | null |
| [TESTNET_WRANGLER_WORKER_NAME](#worker-name) | The name of your testnet service on CloudFlare Workers | |
| [TESTNET_WRANGLER_META](#generating-kv-namespaces) | The kv store for your stellar.toml metadata file[see generating kv namespaces](#generating-kv-namespaces) | |
| [TESTNET_WRANGLER_TX_FUNCTIONS](#generating-kv-namespaces)  |  [see generating kv namespaces](#generating-kv-namespaces) | |
| [TESTNET_WRANGLER_XLM_FEE_MIN](#fees) | the minimum fee to run a function in xlm | 1 |
| [TESTNET_WRANGLER_XLM_FEE_MAX](#fees) | | 10 |
| [TESTNET_WRANGLER_UPLOAD_DIVISOR](#fees) | | 1000 |
| [TESTNET_WRANGLER_RUN_DIVISOR](#fees) | | 1000000 |
| [ALPHA_HORIZON_URL](#horizon-url) | mainnet horizon url | `https://horizon.stellar.org` |
| [ALPHA_TURRET_ADDRESS](#turret-address) | mainnet turret account pubkey | |
| [ALPHA_TURRET_FUNCTION_RUNNER_URL](#turret-run-url) | the endpoint for your function runner [turret-run-url](#turret-run-url) | null |
| [ALPHA_WRANGLER_WORKER_NAME](#worker-name) | mainnet worker name | tss |
| [ALPHA_WRANGLER_META](#generating-kv-namespaces)  |[see generating kv namespaces](#generating-kv-namespaces) | |
| [ALPHA_WRANGLER_TX_FUNCTIONS](#generating-kv-namespaces)  | | |
| [ALPHA_WRANGLER_ALLOWED](#generating-kv-namespaces)  | The KV store for allowed  [see generating kv namespaces](#generating-kv-namespaces) | |
| [ALPHA_WRANGLER_XLM_FEE_MIN](#fees) | the minimum fee to run a function in xlm | 1 |
| [ALPHA_WRANGLER_XLM_FEE_MAX](#fees) | | 10 |
| [ALPHA_WRANGLER_UPLOAD_DIVISOR](#fees) | | 1000 |
| [ALPHA_WRANGLER_RUN_DIVISOR](#fees) | | 1000000 |

### Generating KV Namespaces

Create the testnet kv stores:
```sh
$ npx wrangler kv:namespace create "META"
$ npx wrangler kv:namespace create "TX_FUNCTIONS"
```

Create the mainnet kvs:
```sh
$ npx wrangler kv:namespace create "META" --env alpha
$ npx wrangler kv:namespace create "TX_FUNCTIONS" --env alpha
$ npx wrangler kv:namespace create "ALLOWED" --env alpha
```

Each of those commands will spit out the string to provide in the init-step.

- Run `npm run init` again and provide the kv id's in the appropriate places.

##### HORIZON_URL
 -  For `HORIZON_URL` place in the url for the horizon service your Turret will consume. This should match with either the Test or Public network.
##### TURRET_ADDRESS
 -  For `TURRET_ADDRESS` just use any valid, funded, Stellar account you privately own. This is the account into which fees will be paid as txFunctions are uploaded and run on your Turret.
##### TURRET_RUN_URL
 - Set `TURRET_RUN_URL` to `null` for now until we've got the Serverless AWS lambda setup with it's endpoint, at which point you'll update this value to that url.
##### Fees
 - Finally set the `XLM_FEE_MIN`, `XLM_FEE_MAX`, `UPLOAD_DIVISOR`, and `RUN_DIVISOR` values. The defaults are considered reasonable but you can raise or lower them if you wish; however remember simple supply and demand in doing so.
##### Worker Name
 - The name of your service on CloudFlare workers
#### Todos
 - use a single env set instead of defaulting to testnet and alpha.
 - add local install instructions.
 - make win32 compatable.
 - automate above process substantially.

### Setting up your stellar.toml file
Now that the `wrangler.toml` file has been created let's move to the `stellar.toml` file. This file is served as your Turret's `stellar.toml` file. Particularly note the `[TSS].TURRETS` array; this will be an array of other Turret addresses that you trust to cohost txFunctions with in the case of txFunction healing. For now just make sure to include your own `TURRET_ADDRESS` which should be the first entry. There are already a few other turrets in the file as well. You can add or remove those entries to your liking/trust.
Once you've got that go ahead and upload it to the `META` kv store you instantiated earlier.
```sh
$ npx wrangler kv:key put --binding=META "STELLAR_TOML" ./stellar.toml --path
```
Make sure to run these wrangler commands from the `./wrangler` directory

### DEPLOY TO RUN!
 - From within the `./wrangler` directory:
```sh
$ npm i
$ wrangler publish --new-class TxFees
```
 - You may have to work through a few errors to get logged into your Cloudflare account but the wrangler cli errors are typically quite helpful. Feel free to update this README with more clear instructions.
##### TURRET_SIGNER
 - Once you've successfully got your project created and running upload a `TURRET_SIGNER` Stellar secret key to your Cloudflare worker.
```sh
$ npx wrangler secret put TURRET_SIGNER
```
 - When the dialog asks your for a value paste in a valid Stellar **secret key**. Most often this will be the secret key counterpart to your `TURRET_ADDRESS` but this isn't a requirement. This key is used to authenticate requests between your Cloudflare and Serverless services, nothing else.
 - This connection is what secures and protects access between the Cloudflare and Serverless APIs. Remember Cloudflare gets the **private key** and Serverless gets the **public key**.
##### Re-deploy
 - Whenever you need to redeploy the project in the future either run
```sh
$ npm run deploy
or
$ wrangler publish
```
- The `--new-class TxFees` you included in the first deploy was just an initializer argument for the `TxFees` Durable Object. Once you've successfully deployed do not include it again.
```
  ***

## Serverless (AWS)

 - Next we have the Serverless lambda endpoint which is hosted with AWS but deployed using the far more sane [serverless.com](https://serverless.com) cli tool.
 - If you haven't go create both an [AWS console account](https://www.amazon.com/) and a [serverless.com account](https://www.serverless.com/dashboard/). 
 - Once you have those setup ensure you've got the [serverless cli installed](https://github.coserm/serverless/components#quick-start).

Now it'll be the fun task of getting:

```sh
$ yarn
$ npm run deploy
```
To successfully run from within the `./serverless` directory.
if you're going to deploy to mainnet:
```sh
npx envdist alpha
npm run deploy:alpha
```
After you get it to build, you will be prompted for setting up your environmental variables for your .env:

| Variable | Description | default |
| -- | -- | -- |
| SLS_ORG | The organization name in serverless | |
| SLS_APP | The name of the serverless app to create | `stellar-turrets` |
| SLS_SERVICE | The name of the serverless service | `stellar-turrets` |
| SLS_TURRET_BASE_URL | The URL of your wrangler service | |
| SLS_TURRET_SIGNER_ACCOUNT | The **public key** of [the secret used in deploying wrangler](#TURRET_SIGNER) | |
| SLS_AWS_PLAN | Use paid or free aws plan | free |

This connection is what secures and protects access between the Cloudflare and Serverless APIs. Remember Cloudflare gets the **private key** and Serverless gets the **public key**.  

Follow any errors carefully and you should be able to get successfully deployed pretty quickly.
The most probable issue will be you need to manually create an app in the [Serverless dashboard](https://app.serverless.com/) and attach some new IAM credentials to it manually. 
    - In serverless dashboard click "Apps" on the left sidebar, then click "Create App" at the top.
    - select "Serverless Framework"
    - name your app and service to match the name you've given it during deploy.
    - Select the aws credentials you've setup 
    - now run `serverless deploy` for testnet or `serverless deploy --stage alpha` for pubnet
    - make sure you check the case of all 3 variables your org, app, and service.  they ARE Case sensitive
    - There's a helpful UI walk through they have so you should be able to sort it out. 

Again feel free to update these docs with more clear instructions as you sort out the nuances of setting the Serverless service up.


*If* you are going to use the github action to deploy serverless, you need to set the three variables from above as repo-secrets as well.  

When you finally get success on this task you'll be rewarded with an endpoint where your function is hosted. Copy that base url and paste it as the value for the `TURRET_FUNCTION_RUNNER_URL`  `var` back in the `.env` file in the `./wrangler` directory and run `npm run init && npm run deploy` again to update the worker to point to your lambda.

## Congrats!

Assuming both `npm run deploy`'s are now firing off without a hitch you should have a fully functional Turret ready to participate in the Stellar Turrets network delivering decentralized smart contracting functionality to anyone and everyone who chooses to use your Turret. Nice!

## CI (github actions)

There are GH actions defined to actually deploy the serverless and wrangler parts continously. For this to work add the following secrets to your (cloned) repo:

  

| VARIABLE | Description | Default |
| --- | --- | --- |
| *STELLAR_NETWORK* | testnet= TESTNET or pubnet = PUBLIC| **TESTNET** |
| *HORIZON_URL* | URL of horizon server. | **https://horizon-testnet.stellar.org** |
| TURRET_ADDRESS | Existing and funded stellar address to receive fees | |
| TURRET_FUNCTION_RUNNER_URL | base URL of function runner (serverless part from above) | null |
| WRANGLER_ACCOUNT_ID | ID of cloudflare account to deploy wrangler to | |
| WRANGLER_API_TOKEN | Token for cloudflare API access | |
| *WRANGLER_WORKER_NAME* | name of your worker inside cloudflare | **tss-wrangler** |
| WRANGLER_META | KV namesapace for worker's META information | |
| WRANGLER_TX_FUNCTIONS | KV namespace for worker's functions | |
| *WRANGLER_XLM_FEE_MIN* | The minimum claimable fee balance allowed. See [turret_info] | **1** |
| *WRANGLER_XLM_FEE_MAX* | The maximum claimable fee balance allowed. See [turret_info] | **10** |
| *WRANGLER_UPLOAD_DIVISOR* | The divisor used in fee calculations for uploading functions. See [turret_info] | **1000** |
| *WRANGLER_RUN_DIVISOR* | The divisor used in fee calculations for running functions. See [turret_info] | **100000** |
| SLS_ORG | The serverless organization to deploy to | |
| SLS_TURRET_BASE_URL | Base URL of turret (wrangler URL) | |
| SLS_TURRET_SIGNER_ACCOUNT | Public key of function signer (counterpart to turret's **private** signer key) | |
| *SLS_AWS_PLAN* | Indicate if you are using a free or paid plan | **free** |
| SERVERLESS_ACCESS_KEY | Token for SLS API access | |
  
optional values are *italic* (i.e. will be using defaults if not set)

## [API Docs](https://tyvdh.github.io/stellar-turrets/)

## Disclaimer

This is alpha software representing a reference implementation for the [Stellar Turrets protocol](https://tss.stellar.org/).

For this reason I strongly suggest either:

  A) Leaving your `STELLAR_NETWORK` set to `TESTNET`

  B) Encouraging users to leave themselves as a majority signer on any controlled account they're attaching Turret signers to
