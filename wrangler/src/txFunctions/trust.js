import { response } from 'cfw-easy-utils';
import { authTxToken } from '../@utils/auth';
import { getAccount, getAccountSigners } from '../@utils/account';

import {
  TransactionBuilder,
  Networks,
  BASE_FEE,
  Operation,
  Account,
} from 'stellar-base';
import { find } from 'lodash';

export default async ({ request, params, env }) => {
  const { TX_FUNCTIONS, TURRET_ADDRESS, STELLAR_NETWORK, HORIZON_URL } = env;

  const feeToken = request.headers.get('authorization')?.split(' ')?.[1];

  const { publicKey: authPublicKey } = authTxToken(STELLAR_NETWORK, feeToken);

  try {
    const { txFunctionHash } = params;

    const { value, metadata } = await TX_FUNCTIONS.getWithMetadata(
      txFunctionHash,
      'arrayBuffer'
    );

    if (!value)
      return {
        status: 404,
        message: `txFunction could not be found on this turret`,
      };
    const { txFunctionSignerPublicKey } = metadata;
    const { id: accountPubKey, sequence } = await getAccount(
      authPublicKey,
      HORIZON_URL
    );

    const { requiredThreshold, accountSigners } = await getAccountSigners(
      accountPubKey,
      HORIZON_URL
    );

    const hasTxFunctionKey = find(accountSigners, {
      signer: txFunctionSignerPublicKey,
    });

    if (!!hasTxFunctionKey)
      return response.json({
        status: 403,
        message: `Account ${accountPubKey} already has signer for ${txFunctionHash}`,
      });

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
            ed25519PublicKey: txFunctionSignerPublicKey,
            weight: 1,
          },
        })
      )
      .addOperation(
        Operation.manageData({
          name: `TSS_${TURRET_ADDRESS}`,
          value: txFunctionSignerPublicKey,
        })
      )
      .setTimeout(0)
      .build();

    return response.json({
      xdr: transaction.toXDR(),
    });
  } catch {}
};
