npx wrangler kv:key put --binding=META "STELLAR_TOML" ./stellar.toml --path
printf "\n"
npx wrangler kv:namespace create "META"
printf "\n\n"
npx wrangler kv:namespace create "TX_FUNCTIONS"
printf "\n\n"
npx wrangler kv:namespace create "TX_FEES"
printf "\n\n"
npx wrangler secret put TURRET_SIGNER