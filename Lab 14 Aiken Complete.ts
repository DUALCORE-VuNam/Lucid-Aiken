// ----------Tạo validator với cấu trúc mint và burn NFT-----------------

use aiken/collection/dict
use aiken/collection/list
use cardano/address.{Address}
use cardano/assets.{PolicyId, lovelace_of}
use cardano/transaction.{Output, Transaction} as tx

pub type Action {
  Mint
  Burn
}

validator gift_card(
  token_name: ByteArray,
  platform_fee: Int,
  platform_payment_credential: ByteArray,
) {
  mint(rdmr: Action, policy_id: PolicyId, transaction: Transaction) {
    let Transaction { mint, outputs, .. } = transaction
    let output_utxo_platform =
      find_output(outputs, platform_fee, platform_payment_credential)
    expect [Pair(asset_name, amount)] =
      mint
        |> assets.tokens(policy_id)
        |> dict.to_pairs()

    when rdmr is {
      Mint -> amount == 1 && asset_name == token_name && output_utxo_platform
      // Unlock asset
      Burn -> amount == -1 && asset_name == token_name && output_utxo_platform
    }
  }

  else(_) {
    fail
  }
}

fn find_output(outputs: List<Output>, fee: Int, addr_cred: ByteArray) {
  list.any(
    outputs,
    fn(output) {
      lovelace_of(output.value) >= fee && output.address.payment_credential == address.from_verification_key(
        addr_cred,
      ).payment_credential
    },
  )
}


// ----------Lucid--------------


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

//------------MINT-NFT--------------------

//===============Đặt tên token và setting phí trả về platform==================
const token_name = fromText("BK02_31");
const fee_value = 10000000n;
// const payment_credential = paymentCredentialOf("addr_test1qqew6jaz63u389gwnp8w92qntetzxs6j9222pn4cnej672vazs7a6wnrseqggj4d4ur43yq9e23r4q0m879t7efyhzjq8mvzua").hash;
// 32ed4ba2d47913950e984ee2a8135e562343522a94a0ceb89e65af29


//------Kê khai thông tin địa chỉ nhận fee của platform---------
const payment_credential = Addresses.inspect(
  "addr_test1qz22wkszyt9kgqhk24670xz7ehs9tvlhq079rzy5vyekn5p5x065mhvs0z9p2gymxgguy3w0v5qnk39klvaapeqla97qsdltfy"
).payment?.hash;
console.log(payment_credential);

//-------Gọi và truyền thông tin định dạng của biến multiparams-----------
const validator = await readValidator();
const Params = [Data.Bytes(), Data.Integer(), Data.Bytes()];
const parameterized_script = lucid.newScript(
  {
    type: "PlutusV3",
    script: validator.script,
  },
  [token_name, fee_value, payment_credential],
  Params
);

//------Tạo các thông tin về địa chỉ script và tạo policy cùng tên cho NFT----------
const scriptAddress = parameterized_script.toAddress();
console.log(`Địa chỉ Parameterized script là: ${scriptAddress}`);
const policyId = parameterized_script.toHash();
const unit = policyId + fromText("BK02_31");

const mintRedeemer = Data.to(new Constr(0, []));
// const mintRedeemer = Data.void()
const tx = await lucid
  .newTx()
  .mint({ [unit]: 1n }, mintRedeemer)
  .payTo(
    "addr_test1qz22wkszyt9kgqhk24670xz7ehs9tvlhq079rzy5vyekn5p5x065mhvs0z9p2gymxgguy3w0v5qnk39klvaapeqla97qsdltfy",
    { lovelace: 10000000n }
  )
  .attachScript(parameterized_script)
  .commit();

const signedTx = await tx.sign().commit();
await Deno.writeTextFile("Mint-signedTx.cbor", signedTx);
const txHash = await signedTx.submit();
console.log(`A NFT was mint at tx:    https://preview.cexplorer.io/tx/${txHash} `);

//===============Đọc mã CBOR của SC  ============================
async function readValidator(): Promise<SpendingValidator> {
  const validator = JSON.parse(await Deno.readTextFile("plutus.json")).validators[0];
  return {
    type: "PlutusV3",
    script: toHex(cbor.encode(fromHex(validator.compiledCode))),
  };
}

// ---------------BURN-NFT------------------------

const token_name = fromText("BK02_31");
const fee_value = 10000000n;
const payment_credential =  Addresses.inspect("addr_test1qz22wkszyt9kgqhk24670xz7ehs9tvlhq079rzy5vyekn5p5x065mhvs0z9p2gymxgguy3w0v5qnk39klvaapeqla97qsdltfy").payment?.hash;
console.log(payment_credential);

const validator = await readValidator();
const Params  = [Data.Bytes(), Data.Integer(), Data.Bytes()];
const parameterized_script = lucid.newScript({
  type: "PlutusV3",
  script: validator.script,
},[token_name,fee_value,payment_credential]
,Params
);

const scriptAddress =parameterized_script.toAddress();
console.log(`Địa chỉ Parameterized script là: ${scriptAddress}`);
const policyId = parameterized_script.toHash();
const unit = policyId + fromText("BK02_31");
const utxos = await lucid.utxosAt(wallet_address);
// const utxo1 = utxos.find(u => u.txHash === "fc83d672482b12298feae43a5ef90a63551f5df96acdbf54a21c0c1f883d8eba" && u.outputIndex === 1);

const utxo = utxos.find(u => u.assets[unit] && u.assets[unit] >= 1n);
if (!utxo) throw new Error("Không tìm thấy UTXO chứa NFT");

console.log(utxo);
// 1 tương ứng với vị trí thứ 2 của của redeemer trong aiken ==Burn
const mintRedeemer = Data.to(new Constr(1, []));
const tx = await lucid
    .newTx()
    .mint({[unit]: -1n},mintRedeemer)
    .collectFrom([utxo])
    .payTo("addr_test1qz22wkszyt9kgqhk24670xz7ehs9tvlhq079rzy5vyekn5p5x065mhvs0z9p2gymxgguy3w0v5qnk39klvaapeqla97qsdltfy", { lovelace: 10000000n })
    // .collectFrom([utxo1])
    .attachScript(parameterized_script)
    // .addSigner(payment_hash)
    .commit();
const signedTx = await tx.sign().commit();
await Deno.writeTextFile("Burntx-signedTx.cbor", signedTx);
const txHash = await signedTx.submit();
console.log(`A NFT was Burnt at tx:    https://preview.cexplorer.io/tx/${txHash} `);


 // Đọc validator từ plutus.json
 async function readValidator(): Promise<SpendingValidator> {
  const validator = JSON.parse(await Deno.readTextFile("plutus.json")).validators[0];
      return {
        type: "PlutusV3",
        script: toHex(cbor.encode(fromHex(validator.compiledCode))),
      };
    }

