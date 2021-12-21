import { find, chain } from 'lodash';
import Bluebird from 'bluebird';
import { parse } from '@iarna/toml';
import { response } from 'cfw-easy-utils';

export const getAccount = async (account_pub_key, HORIZON_URL) => {
  try {
    return await fetch(`${HORIZON_URL}/accounts/${account_pub_key}`).then(
      (res) => {
        if (res.status === 200) return res.json();
        if (res.status === 404)
          return response.json({
            status: res.status,
            message: `Couldn't find account ${account_pub_key}`,
          });
      }
    );
  } catch {}
};

export const getTurretToml = async (home_domain) => {
  try {
    return await fetch(`https://${home_domain}/.well-known/stellar.toml`).then(
      async (res) => {
        if (res.status === 200) {
          const data = await res.text();
          return parse(data);
        }
        if (res.status === 404)
          return response.json({
            status: res.status,
            message: `Couldn't find turret toml at https://${home_domain}/.well-known/stellar.toml`,
          });
      }
    );
  } catch {}
};

export const getTxFunctionAt = async (
  { type, data },
  txFunctionHash,
  HORIZON_URL
) => {
  try {
    let account;
    if (type === 'pub_key') {
      account = await getAccount(data, HORIZON_URL);
      if (!account.home_domain)
        return response.json({
          status: 404,
          message: `Account ${data} has no home domain.`,
        });
    } else if (type === 'domain') {
      account.home_domain = data;
    }
    if (!account)
      return response.json({
        status: 500,
        message: 'account not defined for getTxFunctionData.',
      });
    return await fetch(
      `https://${account.home_domain}/tx-functions/${txFunctionHash}`
    ).then((res) => {
      if (res.status === 200) return res.json();
      if (res.status === 404)
        return response.json({
          status: res.status,
          message: `Couldn't find txFunctionHash ${txFunctionHash} at https://${account.home_domain}/`,
        });
    });
  } catch {}
};

export const setAccountTurretKeys = async (
  turretToml,
  existingSigners,
  addTurret,
  txFunctionHash,
  HORIZON_URL
) => {
  try {
    return await Bluebird.map(
      chain([{ turret: addTurret }, ...existingSigners])
        .orderBy('weight', 'asc')
        .uniqBy('turret')
        .value(),
      async (account) => {
        // isSelf?
        if (account.turret === turretToml.TSS.TURRETS[0]) {
          return {
            ...account,
            toml: turretToml,
          };
        } else {
          const { signer: txFunctionSigner } = await getTxFunctionAt(
            { type: 'pub_key', data: account.turret },
            txFunctionHash,
            HORIZON_URL
          );
          const { home_domain } = await getAccount(account.turret, HORIZON_URL);
          const toml = await getTurretToml(home_domain);
          return {
            ...account,
            signer: txFunctionSigner,
            toml: toml,
          };
        }
      }
    );
  } catch {}
};

export const getAccountSigners = async (ctrlAccount, HORIZON_URL) => {
  try {
    return getAccount(ctrlAccount, HORIZON_URL).then((account) => {
      const accountSigners = chain(account.data)
        .map((value, key) => {
          value = Buffer.from(value, 'base64').toString('utf8');

          const signer = find(account.signers, { key: value });

          return key.indexOf('TSS') === 0 && signer
            ? {
                turret: key.replace('TSS_', ''),
                signer: value,
                weight: signer.weight,
              }
            : null;
        })
        .compact()
        .value();

      return {
        requiredThreshold: account.thresholds.high_threshold,
        accountSigners,
      };
    });
  } catch {}
};
