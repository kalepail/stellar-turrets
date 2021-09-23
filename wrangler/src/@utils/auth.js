/**
 * Helper functions for managing authentication against a Turret
 */
import BigNumber from 'bignumber.js'
import moment from 'moment'
import { Transaction, Networks } from 'stellar-base'
import { verifyTxSignedBy } from './stellar-sdk-utils'

/**
 * Determine the authenticated user and contracts with the provided token.
 * 
 * @param {string} network The Stellar Network to validate the token on
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
export function authTxToken(network, authToken, dataKey) {
  try {
    if (authToken === undefined) {
      throw { message: 'Unable to find an auth token' };
    }

    const authTx = new Transaction(authToken, Networks[network]);

    // validate tx structure
    if (!new BigNumber(authTx.sequence).isEqualTo(0)) {
      throw { message: `AuthTokenTx has a non-zero sequence number` };
    }

    // validate token expiration
    if (
      !new BigNumber(authTx.timeBounds.maxTime).isZero(0) &&
      moment.utc(authTx.timeBounds.maxTime, 'X').isBefore()
    ) {
      throw { message: `AuthToken has expired` };
    }

    // ensure tx is signed
    const authPublicKey = authTx.source;
    if (!verifyTxSignedBy(authTx, authPublicKey)) {
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

    // check for singleUse key
    let singleUse = false
    for (const op of authTx.operations) {
      if (op.type === 'manageData' && op.name === 'singleUse') {
        let value = op.value.toString();
        singleUse = value === 'true' ? true : false
      }
    }

    // if single use token maxTime cannot be more than 1 hour from now
    if (
      singleUse
      && (
        new BigNumber(authTx.timeBounds.maxTime).isLessThanOrEqualTo(0)
        || moment.utc(authTx.timeBounds.maxTime, 'X').isAfter(moment.utc().add(1, 'hour'))
      )
    ) {
      throw { message: `Single use auth tokens must expire in less than 1 hour` };
    }

    return {
      hash: authTx.hash().toString('hex'),
      publicKey: authPublicKey,
      data: enteredData,
      singleUse,
      exp: authTx.timeBounds.maxTime
    }
  } catch (e) {
    throw { message: e.message != undefined ? `${e.message}: Failed during auth` : `Failed to parse Auth Token` }
  }
}