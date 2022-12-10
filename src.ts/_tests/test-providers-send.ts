import assert from "assert";

import { isError, Wallet } from "../index.js";

import { getProvider, providerNames } from "./create-provider.js";

import type { TransactionResponse } from "../index.js";

function stall(duration: number): Promise<void> {
    return new Promise((resolve) => { setTimeout(resolve, duration); });
}


describe("Sends Transactions", function() {

    const cleanup: Array<() => void> = [ ];
    after(function() {
        for (const func of cleanup) { func(); }
    });

    const wallet = new Wallet(<string>(process.env.FAUCET_PRIVATEKEY));

    const networkName = "goerli";
    for (const providerName of providerNames) {
        const provider = getProvider(providerName, networkName);
        if (provider == null) { continue; }

        // Shutdown socket-based provider, otherwise its socket will prevent
        // this process from exiting
        if ((<any>provider).destroy) { cleanup.push(() => { (<any>provider).destroy(); }); }

        it(`tests sending: ${ providerName }`, async function() {
            this.timeout(180000);

            const w = wallet.connect(provider);

            const dustAddr = Wallet.createRandom().address;

            // Retry if another CI instance used our value
            let tx: null | TransactionResponse = null;
            for (let i = 0; i < 10; i++) {
                try {
                    tx = await w.sendTransaction({
                        to: dustAddr,
                        value: 42,
                        type: 2
                    });
                    break;
                } catch (error) {
                    if (isError(error, "REPLACEMENT_UNDERPRICED")) {
                        await stall(1000);
                        continue;
                    }
                    throw error;
                }
            }
            assert.ok(!!tx, "too many retries");

            //const receipt = 
            await provider.waitForTransaction(tx.hash, null, 60000); //tx.wait();
            //console.log(receipt);

            const balance = await provider.getBalance(dustAddr);
            assert.equal(balance, BigInt(42), "target balance after send");
        });
    }


});