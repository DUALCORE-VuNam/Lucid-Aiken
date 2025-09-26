// ----------Tạo validator với cấu trúc mint và burn NFT-----------------

use aiken/collection/dict
use aiken/collection/list
use cardano/address.{Script}
use cardano/assets.{PolicyId}
use cardano/transaction.{OutputReference, Transaction} as tx

pub type Action {
  Minting
  Burning
}

validator gift_card(token_name: ByteArray) {
  spend(_d, _r, own_ref: OutputReference, transaction: Transaction) {
    // pattern matching với transaction để lấy ra inputs và spend từ transaction. 
    let Transaction { mint, inputs, .. } = transaction
    expect Some(own_input) =
      list.find(inputs, fn(input) { input.output_reference == own_ref })
    // input.output.address là địa chỉ của  
    expect Script(policy_id) = own_input.output.address.payment_credential
    expect [Pair(asset_name, amount)] =
      mint
        |> assets.tokens(policy_id)
        |> dict.to_pairs()

    amount == -1 && asset_name == token_name
  }

  // redeemer, policy_id, transaction đều được lấy từ transaction thực
  mint(rdmr: Action, policy_id: PolicyId, transaction: Transaction) {
    // pattern matching với transaction để lấy ra inputs và mint từ transaction, trong đó mint chứa minted assets
    // PolicyId
    // asset_name = BK02
    // soluong = 1

    let Transaction { mint, .. } = transaction
    // hàm expect với mint sẽ trả lại asset_name và amount  theo  policy_id từ giao dịch tương tác với Smart contract
    expect [Pair(asset_name, amount)] =
      mint
        |> assets.tokens(policy_id)
        |> dict.to_pairs()

    when rdmr is {
      Minting -> amount == 1 && asset_name == token_name
      // Unlock asset
      Burning -> amount == -1 && asset_name == token_name
    }
  }

  else(_) {
    fail
  }
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

// Seed phrase:
const seed = "december fantasy news diary valve valley lawn bachelor video degree success shy essay mushroom kidney lab melody happy limit lounge chest club have outside";
lucid.selectWalletFromSeed(seed);

const wallet_address = await lucid.wallet.address();
console.log(`dia chi vi la: ${wallet_address}`);

const payment_hash = Addresses.inspect(wallet_address).payment?.hash;
if (!payment_hash) {
  throw new Error("Failed to extract payment hash from address");
}

//-------------------------Mint-Lock---------------------

//===============Đọc mã CBOR của SC  ===========================
async function readValidator(): Promise<SpendingValidator> {
  const validator = JSON.parse(await Deno.readTextFile("plutus.json")).validators[0];
      return {
        type: "PlutusV3",
        script: toHex(cbor.encode(fromHex(validator.compiledCode))),
      };
    }


const validator = await readValidator();
const parameterized_cbor = applyParamsToScript([fromText("BK02_31")],validator.script);
const parameterized_script = lucid.newScript({
  type: "PlutusV3",
  script: parameterized_cbor,
});

const scriptAddress =parameterized_script.toAddress();
console.log(`Địa chỉ Parameterized script là: ${scriptAddress}`);

------Mint policyID từ script đã tạo và đặt tên cho NFT theo policyID đã mint--------
const policyId = parameterized_script.toHash();
const unit = policyId + fromText("BK02_31");
console.log(`Tên của tài sản dạng hex là: ${unit}`);

// 0 tương ứng với vị trí đầu tiên của của redeemer trong aiken=Mint
const mintRedeemer = Data.to(new Constr(0, []));

const tx = await lucid
      .newTx()
      .mint({[unit]: 1n},mintRedeemer)
      .attachScript(parameterized_script)
      .commit();
const signedTx = await tx.sign().commit();
const txHash = await signedTx.submit();
console.log(`A NFT was mint at tx:    https://preview.cexplorer.io/tx/${txHash} `);

//-------------------Burn-Unlock--------------------

 // Đọc validator từ plutus.json
 async function readValidator(): Promise<SpendingValidator> {
  const validator = JSON.parse(await Deno.readTextFile("plutus.json")).validators[0];
      return {
        type: "PlutusV3",
        script: toHex(cbor.encode(fromHex(validator.compiledCode))),
      };
    }


const validator = await readValidator();
const parameterized_cbor = applyParamsToScript([fromText("BK02_31")],validator.script);
const parameterized_script = lucid.newScript({
  type: "PlutusV3",
  script: parameterized_cbor,
});

const scriptAddress =parameterized_script.toAddress();
console.log(`Địa chỉ Parameterized script là: ${scriptAddress}`);

//------Mint policyID từ script đã tạo và đặt tên cho NFT theo policyID đã mint--------
const policyId = parameterized_script.toHash();
const unit = policyId + fromText("BK02_31");
console.log(`Tên của tài sản dạng hex là: ${unit}`);
const utxos = await lucid.utxosAt(wallet_address);

//-----Tìm UTXO chứa NFT và collateral thêm UTXO để bổ sung lovelace cần thiết để giải phóng đc UTXO chứa NFT---------------
const utxo = utxos.find(u => u.assets[unit] && u.assets[unit] >= 1n);
if (!utxo) throw new Error("Không tìm thấy UTXO chứa NFT");
console.log(utxo);
const utxo1 = utxos.find((u) => Object.keys(u.assets).length === 1 && u.assets?.lovelace > 5000000n)
console.log(utxo1);


// 1 tương ứng với vị trí thứ 2 của của redeemer trong aiken ==Burn
const mintRedeemer = Data.to(new Constr(1, []));

const tx = await lucid
    .newTx()
    .mint({[unit]: -1n},mintRedeemer)
    .collectFrom([utxo])
    .collectFrom([utxo1])
    .attachScript(parameterized_script)
    .addSigner(payment_hash)
    .commit();
const signedTx = await tx.sign().commit();
const txHash = await signedTx.submit();
console.log(`A NFT was Burnt at tx:    https://preview.cexplorer.io/tx/${txHash} `);
