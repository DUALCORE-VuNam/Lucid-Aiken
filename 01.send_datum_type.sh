import { Blockfrost, Lucid, Addresses, Data,fromText } from "https://deno.land/x/lucid/mod.ts";
import "jsr:@std/dotenv/load";
const toAddress= "addr_test1qzjzr7f3yj3k4jky7schc55qjclaw6fhc3zfnrarma9l3579hwurrx9w7uhz99zdc3fmmzwel6hac404zyywjl5jhnls09rtm6";
const amount=5000000n

// Định nghĩa schema cho datum theo dạng một Object
const DatumSchema = Data.Object({
  lockUntil: Data.Integer,  // Thời gian khóa (POSIX time dạng bigint)
  beneficiary: Data.Bytes,  // Hash của người thụ hưởng (chuỗi byte)
});
type DatumSchemaType = Data.Static<typeof DatumSchema>;  //Khai báo kiểu



    await initializeLucid();
     const deadlineDate: Date = new Date("2026-06-09T00:00:00Z")
    const deadlinePosIx = BigInt(deadlineDate.getTime());
    console.log(deadlinePosIx);
    // Lấy payment hash từ địa chỉ
    const address = "addr_test1qzjzr7f3yj3k4jky7schc55qjclaw6fhc3zfnrarma9l3579hwurrx9w7uhz99zdc3fmmzwel6hac404zyywjl5jhnls09rtm6";
    const { payment } = Addresses.inspect(address);
    if (!payment?.hash) {
      throw new Error("Failed to extract payment hash from address");
    }

    // Tạo datum object
    const datum: DatumSchemaType = {
      lockUntil: deadlinePosIx,
      beneficiary: payment.hash,
    };

    // Chuyển datum thành JSON (xử lý BigInt)
    const json = JSON.stringify(datum, (_, value) =>
      typeof value === "bigint" ? value.toString() : value
    );
    console.log("Datum content:", json);
    const datumInline = Data.to(datum , DatumSchema);
    console.log(datumInline);
    // const tx = await lucid.newTx()
    // .payToWithData(toAddress, datumInline , { lovelace: amount })
    // .commit();
    // //Ký giao dịch
    // const signedTx = await tx.sign().commit();
    //  //Gửi giao dịch
    // const txHash = await signedTx.submit();
    // console.log(`Bạn có thể kiểm tra giao dịch tại: https://preview.cexplorer.io/tx/${txHash}`);

//  comparing
   console.log(fromText("Lucid"));
   console.log(Data.to(fromText("Lucid")));

async function initializeLucid(): Promise<Lucid> {
    const mnemonic = Deno.env.get("MNEMONIC");
    const blockfrostId = Deno.env.get("BLOCKFROST_ID");
    const blockfrostNetwork = Deno.env.get("BLOCKFROST_NETWORK");
  
    if (!mnemonic || !blockfrostId || !blockfrostNetwork) {
      throw new Error("Missing required environment variables (MNEMONIC, BLOCKFROST_ID, BLOCKFROST_NETWORK)");
    }
  
    const lucid = new Lucid({
      provider: new Blockfrost(blockfrostNetwork, blockfrostId),
    });
  
    await lucid.selectWalletFromSeed(mnemonic);
    return lucid;
  }
  