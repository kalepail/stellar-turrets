import { clone } from "lodash";
import { Keypair, Transaction } from "stellar-base";
/**
 * @namespace Utils
 */
export var Utils;
(function (Utils) {
    /**
     * Verifies if a transaction was signed by the given account id.
     *
     * @function
     * @memberof Utils
     * @param {Transaction} transaction
     * @param {string} accountID
     * @example
     * let keypair = Keypair.random();
     * const account = new StellarSdk.Account(keypair.publicKey(), "-1");
     *
     * const transaction = new TransactionBuilder(account, { fee: 100 })
     *    .setTimeout(30)
     *    .build();
     *
     * transaction.sign(keypair)
     * Utils.verifyTxSignedBy(transaction, keypair.publicKey())
     * @returns {boolean}.
     */
    function verifyTxSignedBy(transaction, accountID) {
        return gatherTxSigners(transaction, [accountID]).length !== 0;
    }
    Utils.verifyTxSignedBy = verifyTxSignedBy;
    /**
     *
     * gatherTxSigners checks if a transaction has been signed by one or more of
     * the given signers, returning a list of non-repeated signers that were found to have
     * signed the given transaction.
     *
     * @function
     * @memberof Utils
     * @param {Transaction} transaction the signed transaction.
     * @param {string[]} signers The signers public keys.
     * @example
     * let keypair1 = Keypair.random();
     * let keypair2 = Keypair.random();
     * const account = new StellarSdk.Account(keypair1.publicKey(), "-1");
     *
     * const transaction = new TransactionBuilder(account, { fee: 100 })
     *    .setTimeout(30)
     *    .build();
     *
     * transaction.sign(keypair1, keypair2)
     * Utils.gatherTxSigners(transaction, [keypair1.publicKey(), keypair2.publicKey()])
     * @returns {string[]} a list of signers that were found to have signed the transaction.
     */
    function gatherTxSigners(transaction, signers) {
        const hashedSignatureBase = transaction.hash();
        const txSignatures = clone(transaction.signatures);
        const signersFound = new Set();
        for (const signer of signers) {
            if (txSignatures.length === 0) {
                break;
            }
            let keypair;
            try {
                keypair = Keypair.fromPublicKey(signer); // This can throw a few different errors
            }
            catch (err) {
                throw new Error("Signer is not a valid address: " + err.message);
            }
            for (let i = 0; i < txSignatures.length; i++) {
                const decSig = txSignatures[i];
                if (!decSig.hint().equals(keypair.signatureHint())) {
                    continue;
                }
                if (keypair.verify(hashedSignatureBase, decSig.signature())) {
                    signersFound.add(signer);
                    txSignatures.splice(i, 1);
                    break;
                }
            }
        }
        return Array.from(signersFound);
    }
    Utils.gatherTxSigners = gatherTxSigners;
})(Utils || (Utils = {}));