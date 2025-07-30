          Parametered 02-SC Lab 12

------------------Aiken-----------------
use aiken/collection/list
use aiken/crypto.{VerificationKeyHash}
use cardano/transaction.{OutputReference, Transaction}

pub type Datum {
  owner: VerificationKeyHash,
}

pub type Redeemer {
  msg: ByteArray,
}

validator hello_parameterized(owner: VerificationKeyHash) {
  spend(
    _datum: Option<Datum>,
    redeemer: Redeemer,
    _own_ref: OutputReference,
    self: Transaction,
  ) {
    let must_say_hello = redeemer.msg == "Hello, BK31"
    let must_be_signed = list.has(self.extra_signatories, owner)
    must_say_hello? && must_be_signed?
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



// =========================Lock==============================

//Đọc validator từ plutus.json
// async function readValidator(): Promise<SpendingValidator> {
//   const validator = JSON.parse(await Deno.readTextFile("plutus.json")).validators[0];
//   return {
//     type: "PlutusV3",
//     script: toHex(cbor.encode(fromHex(validator.compiledCode))),
//   };
// }
// const validator = await readValidator();
// const parameterizedScript = applyParamsToScript([payment_hash],validator.script,);
// const scriptAddress = lucid.newScript({
//   type: "PlutusV3",
//   script: parameterizedScript,
// }).toAddress();

// console.log(`Địa chỉ script là: ${scriptAddress}`);

// const datumInline = Data.to(new Constr(0, [payment_hash]));
// const tx = await lucid
//       .newTx()
//       .payToContract(scriptAddress, { Inline: datumInline },{ lovelace: 5000000n })
//       .commit();
// const signedTx = await tx.sign().commit();
// const txHash = await signedTx.submit();
// console.log(`5000000 Lovelace locked into the contract at:    Tx ID: ${txHash} `);




  //----------------------------Unlock-----------------------------------
// Hàm chuyển đổi UTF-8 sang hex
function utf8ToHex(str: string): string {
  if (typeof str !== "string" || str === undefined || str === null) {
    throw new Error(`Invalid input for utf8ToHex: expected string, got ${str}`);
  }
  return Array.from(new TextEncoder().encode(str))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

 // Đọc validator từ plutus.json
 async function readValidator(): Promise<SpendingValidator> {
  const validator = JSON.parse(await Deno.readTextFile("plutus.json")).validators[0];
      return {
        type: "PlutusV3",
        script: toHex(cbor.encode(fromHex(validator.compiledCode))),
      };
    }
// ========================= code thay doi tu day==============================
const redeemer = Data.to(new Constr(0, [utf8ToHex("Hello, BK31")]));
console.log(`Redeemer sẽ được truyền vào SC là: ${redeemer}`);
const validator = await readValidator();
console.log(validator);
const parameterizedScript = applyParamsToScript([payment_hash],validator.script,);
const script = lucid.newScript({
    type: "PlutusV3",
    script: parameterizedScript,
  });
const scriptAddress=script.toAddress();
console.log(`Địa chỉ script là: ${scriptAddress}`);


const utxos = await lucid.utxosAt(scriptAddress);
const utxo = utxos.find(u => u.assets.lovelace === 5_000_000n);
if (!utxo) throw new Error("Không tìm thấy UTXO nào với 5.0 triệu lovelace");
console.log(utxo);
const tx = await lucid
    .newTx()
    .collectFrom([utxo], redeemer)
    .attachScript(script)
    .addSigner(payment_hash)
    .commit();
const signedTx = await tx.sign().commit();
const txHash = await signedTx.submit();
console.log(`Transaction hash: ${txHash}`);



