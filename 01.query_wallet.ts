import { Blockfrost, Lucid } from "https://deno.land/x/lucid/mod.ts";
import "jsr:@std/dotenv/load";

// Lấy các biến từ env
const MNEMONIC = Deno.env.get("MNEMONIC");
const BLOCKFROST_ID = Deno.env.get("BLOCKFROST_ID");
const BLOCKFROST_NETWORK = Deno.env.get("BLOCKFROST_NETWORK")

const lucid = new Lucid({
    provider: new Blockfrost(
      BLOCKFROST_NETWORK,
      BLOCKFROST_ID,
    ),
  });
const addr ="addr_test1qprfh5jl5zfklakhcmeezksvrx0ylp6haa24pk5mt4tdw2f48nlr7dmpqgg3vf0626q43cfalep9s8knl03wrxnll6dslr7wfj";
lucid.selectReadOnlyWallet({address: addr, });
// lucid.selectWalletFromSeed(MNEMONIC)
// console.log (await lucid.wallet.address())
const utxos = await lucid.wallet.getUtxos()
console.log(utxos)
// TIP: có thể tách riêng từng trường
// console.log(utxos[1].address)
