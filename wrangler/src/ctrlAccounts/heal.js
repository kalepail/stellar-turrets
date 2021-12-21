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
import { parse } from '@iarna/toml';
import {
  getAccount,
  getAccountSigners,
  setAccountTurretKeys,
} from '../@utils/account';
import { authTxToken } from '../@utils/auth';

export default async ({ request, params, env }) => {
  const { TX_FUNCTIONS, TURRET_ADDRESS, STELLAR_NETWORK, HORIZON_URL, META } =
    env;
  const feeToken = request.headers.get('authorization')?.split(' ')?.[1];
  const { publicKey: authPublicKey } = authTxToken(STELLAR_NETWORK, feeToken);
  const { addTurret, removeTurret } = await request.json();
  const { txFunctionHash } = params;

  try {
    const { id: accountPubKey, sequence } = await getAccount(
      authPublicKey,
      HORIZON_URL
    );

    const stellarToml = await META.get('STELLAR_TOML');
    const turretToml = parse(stellarToml);

    if (removeTurret === TURRET_ADDRESS || addTurret === TURRET_ADDRESS) {
      return response.json({
        error: 403,
        message: `Turrets may not add or remove themselves from a ctrlAccount`,
      });
    }

    const { value, metadata } = await TX_FUNCTIONS.getWithMetadata(
      txFunctionHash,
      'arrayBuffer'
    );

    if (!value)
      return response.json({
        status: 404,
        message: `txFunction could not be found this turret`,
      });

    const { requiredThreshold, accountSigners } = await getAccountSigners(
      accountPubKey,
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

    const transaction = new TransactionBuilder(
      new Account(accountPubKey, sequence),
      {
        fee: BASE_FEE,
        networkPassphrase: Networks[STELLAR_NETWORK],
      }
    )
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
      .build();

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
