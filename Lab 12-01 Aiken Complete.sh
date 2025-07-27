          Parametered 01-SC Lab 12

------------------Aiken-----------------

use aiken/crypto.{VerificationKeyHash}
use cardano/transaction.{OutputReference, Transaction} as tx

pub type Redeemer {
  msg: ByteArray,
}

validator validate(owner: VerificationKeyHash) {
  spend(
    _datum: Option<Redeemer>,
    redeemer: Redeemer,
    _input: OutputReference,
    _tx: Transaction,
  ) {
    let must_say_unlock = redeemer.msg == "Unlock for me"
    must_say_unlock
  }

  else(_) {
    fail
  }
}


-----------------Lucid------------------
import {  Blockfrost, Lucid, Addresses,fromHex,toHex,applyParamsToScript, Data, Constr,fromText } from "https://deno.land/x/lucid@0.20.9/mod.ts";
import * as cbor from "https://deno.land/x/cbor@v1.4.1/index.js";


const lucid = new Lucid({
  provider: new Blockfrost(
    "https://cardano-preview.blockfrost.io/api/v0",
    "previewTN8UXKGlPYoZF3fPyqhtaK4H3jNoGIQc"
  ),
});

// Chọn ví từ bộ seed phrase:
const seed = "december fantasy news diary valve valley lawn bachelor video degree success shy essay mushroom kidney lab melody happy limit lounge chest club have outside";
lucid.selectWalletFromSeed(seed);

const wallet_address = await lucid.wallet.address();
console.log(`dia chi vi la: ${wallet_address}`);

const payment_hash = Addresses.inspect(wallet_address).payment?.hash;
if (!payment_hash) {
  throw new Error("Failed to extract payment hash from address");
}

//Đọc validator từ plutus.json
async function readValidator(): Promise<SpendingValidator> {
  const validator = JSON.parse(await Deno.readTextFile("plutus.json")).validators[0];
  return {
    type: "PlutusV3",
    script: toHex(cbor.encode(fromHex(validator.compiledCode))),
  };
}


   // =========================Lock==============================
// const param = Data.to(new Constr(0, [fromText("Unlock for me")]));
// console.log(`Param sẽ được truyền vào SC là: ${param}`);


// const validator = await readValidator();
// console.log(`Script chưa parameterized là: ${validator.script}`);

// const parameterizedScript = applyParamsToScript([payment_hash], validator.script);
// console.log(`Script đã parameterized là: ${parameterizedScript}`);

// const scriptAddress = lucid.newScript({
//   type: "PlutusV3",
//   script: parameterizedScript,
// }).toAddress();

// console.log(`Address script là: ${scriptAddress}`);

// const tx = await lucid
//     .newTx()
//     .payToContract(scriptAddress, { Inline: param }, { lovelace: 5000000n })
//     .commit();

//   // Ký và gửi giao dịch
//   const signedTx = await tx.sign().commit();
//   const txHash = await signedTx.submit();

  // console.log(`Locked 5000000n lovelace to script Tx ID: ${txHash}`);



  //----------------------------Unlock-----------------------------------
const redeemer = Data.to(new Constr(0, [fromText("Unlock for me")]));
console.log(`Redeemer sẽ được truyền vào SC là: ${redeemer}`);
const validator = await readValidator();
// console.log(validator);

const parameterizedScript = applyParamsToScript([payment_hash],validator.script,);
const script = lucid.newScript({
    type: "PlutusV3",
    script: parameterizedScript,
  });

const scriptAddress=script.toAddress();
console.log(`Địa chỉ script là: ${scriptAddress}`);

const utxos = await lucid.utxosAt(scriptAddress);
const utxo = utxos.find(u => u.txHash===  "be7cfeda5d5b29254db06ec2f5b4261eaab739c60f9bcf6d93b8ff278d6c457f");
console.log(utxo);

const tx = await lucid
  .newTx()
  .collectFrom([utxo], redeemer)
  .addSigner(payment_hash)
  .attachScript(script)  //validator})
  .commit();
  const signedTx = await tx.sign().commit();
  const tx_hash = await signedTx.submit();
console.log(`Transaction hash: ${tx_hash}`);