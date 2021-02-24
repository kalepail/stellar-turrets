# Stellar Turing Signing Server Reference Implementation

This TSS reference implementation employs two serverless services. Cloudflare workers and an AWS lambda function. The reason for this is that txFunctions are by their nature unsafe arbitrary Javascript functions. Cloudflare doesn't allow the execution of such functions thus we're splitting the workload between the much more performant Cloudflare workers and an AWS lambda function which will serve as our txFunction execution environment.

See below for specific instructions for setting up and running both services.

## Wrangler (Cloudflare)
If you haven't already go ahead and [signup for Cloudflare workers](https://dash.cloudflare.com/). You can attempt to run on their free tier but I highly suggest just biting the very affordable bullet and upgrade to their $5/mo plan which will allow you to scale much more nicely.

Next install their wrangler cli tool globally on your machine.

- https://developers.cloudflare.com/workers/cli-wrangler/install-update
- https://github.com/cloudflare/wrangler

Next you should modify the `wrangler.toml` file to update my hard coded values with your own.

1. For the `account_id` go to the workers page on [dash.cloudflare.com](https://dash.cloudflare.com) and copy your `Account ID` from the main homepage.
2. For `kv_namespaces` create two new kv namespaces via the wrangler cli:
```
wrangler kv:namespace create "META"
wrangler kv:namespace create "TX_FUNCTIONS"
```
Each of those commands will spit out the object you should use to replace the existing values in the `wrangler.toml` file.
3. Finally for `vars` set `STELLAR_NETWORK` to either `TESTNET` or `PUBLIC` to toggle this Turret between using either the Test or Public networks. For `TURRET_ADDRESS` just use any random valid, funded Stellar account you'd like. This is the account into which fees will be paid as contracts are uploaded and run on your Turret. Finally set `TURRET_RUN_URL` to `null` for now until we've got the Serverless AWS lambda setup with it's endpoint, at which point you'll update this value to that url.

Now that the `wrangler.toml` file has been updated let's move to the `stellar.toml` file. This file is where you'll create your Turret's `stellar.toml` file particularly noting the `[TSS].TURRETS` array. This will be an array of other Turret addresses that you trust to cohost contracts with in the case of txFunction healing. For now just make sure to include your own `TURRET_ADDRESS` which you selected in the previous steps.

Once you've got that go ahead and upload it to the `META` kv store you instantiated earlier.
```
wrangler kv:key put --binding=META "STELLAR_TOML" ./stellar.toml --path
```
Make sure to run these wrangler commands from the `./wranger` directory

Finally to deploy the project run:
```
npm i
npm run deploy
```
From within the `./wrangler` directory.

You may have to work through a few errors to get logged into your Cloudflare account but the wrangler cli errors are typically quite helpful. Feel free to update this README with more clear instructions here as it's been ages since I started from scratch on my first wrangler project.

## Serverless (AWS)
Next we have the Serverless lambda endpoint which is hosted with AWS but deployed using the far more sane [serverless.com](https://serverless.com) cli tool. If you haven't go create both an [AWS console account](https://www.amazon.com/) and a [serverless.com account](https://www.serverless.com/dashboard/). Once you have those setup ensure you've got the [serverless cli installed](https://github.com/serverless/components#quick-start).

There's only one thing you'll need to update in this repo in the `serverless.yml` file. The `inputs.env.turretBaseUrl` should be replaced with the worker base url which your wrangler service is hosted on.

Now it'll be the fun task of getting:
```
npm i
npm run deploy
```
To successfully run from within the `./serverless` directory. Follow any errors carefully and you should be able to get successfully deployed pretty quickly. The most probable issue will be you need to manually create an app in the [Serverless dashboard](https://app.serverless.com/tyvdh) and attach some new IAM credentials to it manually. There's a helpful UI walk through they have so you should be able to sort it out. Again feel free to update these docs with more clear instructions as you sort out the nuances of setting the Serverless service up.

When you finally get success on this task you'll be rewarded with an endpoint where your function is hosted. Copy that base url and paste it as the value for the `TURRET_RUN_URL` `var` in the `wrangler.toml` file. Don't forget to redeploy that project after the update.

## Congrats!
Assuming both `npm run deploy`'s are now firing off without a hitch you should have a fully functional Turing Signing Server ready to participate in the TSS network delivering decentralized smart contracting functionality to anyone and everyone who chooses to use your Turret. Nice!

## Disclaimer
At the time of this writing:
- Fees are not being collected for either contract upload or execution.
- The txFunction /heal endpoint has not been implemented
For these reasons we strongly suggest both:
A) Leaving your `STELLAR_NETWORK` set to `TESTNET`
B) Encouraging users to leave themselves as a majority signer on any controlled account they're attaching signers from your Turret to