import { response } from 'cfw-easy-utils';
import {
  Keypair,
  TransactionBuilder,
  Networks,
  BASE_FEE,
  Operation,
  Account,
} from 'stellar-base';
import { map, find, compact, intersection, chain } from 'lodash';
import Bluebird from 'bluebird';
import { parse } from '@iarna/toml';

const getAccount = async (account_pub_key, HORIZON_URL) => {
  try {
    return await fetch(`${HORIZON_URL}/accounts/${account_pub_key}`).then(
      (res) => {
        if (res.status === 200) return res.json();
        if (res.status === 404)
          return {
            status: res.status,
            message: `Couldn't find account ${account_pub_key}`,
          };
      }
    );
  } catch {}
};

const getTurretToml = async (home_domain) => {
  try {
    return await fetch(`https://${home_domain}/.well-known/stellar.toml`).then(
      async (res) => {
        if (res.status === 200) {
          const data = await res.text();
          return parse(data);
        }
        if (res.status === 404)
          return {
            status: res.status,
            message: `Couldn't find turret toml at https://${home_domain}/.well-known/stellar.toml`,
          };
      }
    );
  } catch {}
};

const getTxFunctionAt = async ({ type, data }, txFunctionHash, HORIZON_URL) => {
  try {
    let account;
    if (type === 'pub_key') {
      account = await getAccount(data, HORIZON_URL);
      if (!account.home_domain)
        return {
          status: 404,
          message: `Account ${data} has no home domain.`,
        };
    } else if (type === 'domain') {
      account.home_domain = data;
    }
    if (!account)
      return {
        status: 500,
        message: 'account not defined for getTxFunctionData.',
      };
    return await fetch(
      `https://${account.home_domain}/tx-functions/${txFunctionHash}`
    ).then((res) => {
      if (res.status === 200) return res.json();
      if (res.status === 404)
        return {
          status: res.status,
          message: `Couldn't find txFunctionHash ${txFunctionHash} at https://${account.home_domain}/`,
        };
    });
  } catch {}
};

const setAccountTurretKeys = async (
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

const getAccountSigners = async (ctrlAccount, HORIZON_URL) => {
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

export default async ({ request, params, env }) => {
  const { TX_FUNCTIONS, TURRET_ADDRESS, STELLAR_NETWORK, HORIZON_URL } = env;
  try {
    const {
      functionHash: txFunctionHash,
      sourceAccount,
      addTurret,
      removeTurret,
    } = await request.json();
    const { META } = env;
    const { ctrlAccount } = params;
    const stellarToml = await META.get('STELLAR_TOML');
    const turretToml = parse(stellarToml);

    // ctrlAccount === sourceAccount

    if (removeTurret === TURRET_ADDRESS || addTurret === TURRET_ADDRESS) {
      return {
        error: 403,
        message: `Turrets may not add or remove themselves from a ctrlAccount`,
      };
    }

    const { value, metadata } = await TX_FUNCTIONS.getWithMetadata(
      txFunctionHash,
      'arrayBuffer'
    );

    if (!value)
      return {
        status: 404,
        message: `txFunction could not be found this turret`,
      };

    const { requiredThreshold, accountSigners } = await getAccountSigners(
      ctrlAccount,
      HORIZON_URL
    );

    const incomingTurretKeys = await setAccountTurretKeys(
      turretToml,
      accountSigners,
      addTurret,
      txFunctionHash,
      HORIZON_URL
    );

    const removeSigner = find(incomingTurretKeys, { turret: removeTurret });

    if (!removeSigner || !removeSigner.toml)
      throw 'Signer is not able to be removed';

    const addSigner = find(incomingTurretKeys, { turret: addTurret });
    if (!addSigner || !addSigner.toml) throw 'Signer is not able to be added';

    const hasThreshold = chain(incomingTurretKeys)
      .filter((signer) => signer.toml && signer.weight)
      .sumBy('weight')
      .value();

    if (hasThreshold < requiredThreshold) throw 'Insufficient signer threshold';

    const turrets = intersection(
      ...compact(map(incomingTurretKeys, 'toml.TSS.TURRETS'))
    );

    if (turrets.indexOf(addSigner.turret) === -1)
      throw `New turret isn't trusted by existing signer turrets`;

    const transaction = await fetch(`${HORIZON_URL}/accounts/${sourceAccount}`)
      .then((res) => {
        if (res.ok) return res.json();
        throw res;
      })
      .then((account) =>
        new TransactionBuilder(new Account(account.id, account.sequence), {
          fee: BASE_FEE,
          networkPassphrase: Networks[STELLAR_NETWORK],
        })
          .addOperation(
            Operation.setOptions({
              signer: {
                ed25519PublicKey: removeSigner.signer,
                weight: 0,
              },
            })
          )
          .addOperation(
            Operation.setOptions({
              signer: {
                ed25519PublicKey: addSigner.signer,
                weight: removeSigner.weight,
              },
            })
          )
          .addOperation(
            Operation.manageData({
              name: `TSS_${removeSigner.turret}`,
              value: null,
            })
          )
          .addOperation(
            Operation.manageData({
              name: `TSS_${addSigner.turret}`,
              value: addSigner.signer,
            })
          )
          .setTimeout(0)
          .build()
      );

    const { txFunctionSignerPublicKey, txFunctionSignerSecret } = metadata;

    const txFunctionSignerKeypair = Keypair.fromSecret(txFunctionSignerSecret);
    const txFunctionSignature = txFunctionSignerKeypair
      .sign(transaction.hash())
      .toString('base64');

    return response.json({
      xdr: transaction.toXDR(),
      signer: txFunctionSignerPublicKey,
      signature: txFunctionSignature,
    });
  } catch {}
};
