"use client";

import {
  nativeToScVal,
  scValToNative,
  Contract,
  rpc,
  Account,
  TransactionBuilder,
  xdr,
} from "@stellar/stellar-sdk";
import { signTransaction } from "@stellar/freighter-api";

// ⚠️ UPDATE THIS with your deployed contract address
export const CONTRACT_ADDRESS = "CDML6NE2OUZRXGWKXRGLBMEWHZITKPPTMBRZGBJD7KHPM4FONVS2ZEYE";

const RPC_URL = "https://soroban-testnet.stellar.org";
const NETWORK_PASSPHRASE = "Test SDF Network ; September 2015";

function createServer() {
  return new rpc.Server(RPC_URL);
}

function createContract() {
  return new Contract(CONTRACT_ADDRESS);
}

// ─── ScVal helpers ──────────────────────────────────────────────────

const str = (v: string): xdr.ScVal => nativeToScVal(v, { type: "string" });
const addr = (v: string): xdr.ScVal => nativeToScVal(v, { type: "address" });
const u64 = (v: bigint | number): xdr.ScVal => nativeToScVal(v, { type: "u64" });

// ─── Read-only helpers ──────────────────────────────────────────────

async function simulate(
  method: string,
  scvalArgs: xdr.ScVal[],
  source?: string
): Promise<xdr.ScVal> {
  const server = createServer();
  const contract = createContract();

  const tx = contract.call(method, ...scvalArgs);

  const account = source
    ? await server.getAccount(source)
    : new Account(
        "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF",
        "0"
      );

  const builder = new TransactionBuilder(account, {
    fee: "100",
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(tx)
    .build();

  const sim = await server.simulateTransaction(builder);

  if (!rpc.Api.isSimulationSuccess(sim) || !sim.result) {
    throw new Error(
      `Simulation failed: ${JSON.stringify(sim)}`
    );
  }

  return sim.result.retval;
}

async function readContract<T>(
  method: string,
  scvalArgs: xdr.ScVal[],
  source?: string
): Promise<T> {
  const retval = await simulate(method, scvalArgs, source);
  return scValToNative(retval) as T;
}

// ─── State-changing helpers ─────────────────────────────────────────

async function prepareTx(
  method: string,
  scvalArgs: xdr.ScVal[],
  source: string
): Promise<string> {
  const server = createServer();
  const contract = createContract();

  const operation = contract.call(method, ...scvalArgs);

  const account = await server.getAccount(source);

  const builder = new TransactionBuilder(account, {
    fee: "100",
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(operation)
    .build();

  const sim = await server.simulateTransaction(builder);

  if (!rpc.Api.isSimulationSuccess(sim) || !sim.result) {
    throw new Error(
      `Simulation failed: ${JSON.stringify(sim)}`
    );
  }

  const assembled = rpc.assembleTransaction(builder, sim);
  return assembled.build().toXDR();
}

async function signAndSend(txXdr: string): Promise<string> {
  const server = createServer();

  const { signedTxXdr } = await signTransaction(txXdr, {
    networkPassphrase: NETWORK_PASSPHRASE,
  });

  const signedTx = TransactionBuilder.fromXDR(
    signedTxXdr,
    NETWORK_PASSPHRASE
  );

  const sendResponse = await server.sendTransaction(signedTx);

  if (sendResponse.status === "PENDING") {
    const hash = sendResponse.hash;
    for (let i = 0; i < 60; i++) {
      await new Promise((r) => setTimeout(r, 1000));
      const getResponse = await server.getTransaction(hash);
      if (getResponse.status === "SUCCESS") {
        return hash;
      }
      if (getResponse.status === "FAILED") {
        throw new Error(`Transaction failed: ${getResponse.resultXdr}`);
      }
    }
    throw new Error("Transaction timed out");
  }

  throw new Error(
    `Send failed: ${
      (
        sendResponse as rpc.Api.SendTransactionResponse & {
          errorResult?: { message?: string };
        }
      ).errorResult?.message ?? "unknown"
    }`
  );
}

// ─── Contract API ───────────────────────────────────────────────────

/** Initialize the contract (call once after deploy) */
export async function init(source: string): Promise<string> {
  const txXdr = await prepareTx("init", [], source);
  return signAndSend(txXdr);
}

/** Mint a new NFT */
export async function mint(
  to: string,
  name: string,
  description: string,
  uri: string
): Promise<string> {
  const txXdr = await prepareTx(
    "mint",
    [addr(to), str(name), str(description), str(uri)],
    to
  );
  return signAndSend(txXdr);
}

/** Transfer an NFT */
export async function transfer(
  from: string,
  to: string,
  id: bigint
): Promise<string> {
  const txXdr = await prepareTx(
    "transfer",
    [addr(from), addr(to), u64(id)],
    from
  );
  return signAndSend(txXdr);
}

/** Get the balance of an owner */
export async function balanceOf(owner: string): Promise<number> {
  return readContract<number>("balance_of", [addr(owner)], owner);
}

/** Get the owner of a token */
export async function ownerOf(id: bigint): Promise<string> {
  return readContract<string>("owner_of", [u64(id)]);
}

/** Get the token URI */
export async function tokenUri(id: bigint): Promise<string> {
  return readContract<string>("token_uri", [u64(id)]);
}

/** Get total supply */
export async function totalSupply(): Promise<bigint> {
  return readContract<bigint>("total_supply", []);
}

/** Get all token IDs owned by an address */
export async function tokensOf(owner: string): Promise<bigint[]> {
  return readContract<bigint[]>("tokens_of", [addr(owner)], owner);
}

/** Interface for NFT metadata returned from contract */
export interface NFTInfo {
  id: bigint;
  name: string;
  description: string;
  uri: string;
  owner: string;
}

/** Fetch all NFTs owned by an address — convenience function */
export async function getNFTsForOwner(owner: string): Promise<NFTInfo[]> {
  const ids = await tokensOf(owner);
  const nfts: NFTInfo[] = [];

  for (const id of ids) {
    try {
      const uri = await tokenUri(id);
      const ownerAddr = await ownerOf(id);

      let name = `NFT #${id}`;
      let description = "";
      try {
        const resp = await fetch(uri);
        const json = await resp.json();
        name = json.name || name;
        description = json.description || description;
      } catch {
        // Fall back to defaults
      }

      nfts.push({ id, name, description, uri, owner: ownerAddr });
    } catch {
      // Skip tokens that fail to load
    }
  }

  return nfts;
}
