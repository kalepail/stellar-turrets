/**
 * Helper functions for managing authentication against a Turret
 */
import BigNumber from 'bignumber.js'
import { Transaction, Networks } from 'stellar-base'
import { Utils } from './stellar-sdk-utils'

/**
 * Determine the authenticated user and contracts with the provided token.
 * 
 * @param {string} authToken - The provided auth token
 * @param {string?} dataKey - (Optional) Fetch all ManageData operations such that the key matches this dataKey.
 *                           All ManageData values whose keys match will be included in the data output array.
 * @link https://tyvdh.github.io/stellar-tss/#section/Authentication
 * 
 *
 * @typedef {Object} AuthResult
 * @property {string} publicKey - The authenticated public key from the token.
 * @property {string[]} data - The data collected. Returns an empty array if no matching ManageData values are 
 *                             found or no dataKey was provided.
 *
 * @returns {AuthResult} - The result of the authentication
 */
export function authTxToken(authToken, dataKey) {
  try {
    if (authToken === undefined) {
      throw { message: 'Unable to find an auth token' };
    }

    const authTx = new Transaction(authToken, Networks[STELLAR_NETWORK]);

    // validate tx structure
    if (!new BigNumber(authTx.sequence).isEqualTo(0)) {
      throw { message: `AuthTokenTx has a non-zero sequence number` };
    }

    // validate token expiration
    if (
      authTx.timeBounds?.maxTime !== undefined &&
      moment.unix(authTx.timeBounds?.maxTime).isBefore()
    ) {
      throw { message: `AuthToken has expired` };
    }

    // ensure tx is signed
    const authPublicKey = authTx.source;
    if (!Utils.verifyTxSignedBy(authTx, authPublicKey)) {
      throw { message: `AuthToken not signed` };
    }
    
    // fetch dataKey portions
    let enteredData = [];
    if (dataKey) {
      for (const op of authTx.operations) {
        if (op.type === 'manageData' && op.name === dataKey) {
          let value = op.value.toString();
          enteredData.push(value);
        }
      }
    }

    return {
      publicKey: authPublicKey,
      data: enteredData
    }
  } catch (e) {
    throw { message: e.message ?? `Failed to parse Auth Token` }
  }
}