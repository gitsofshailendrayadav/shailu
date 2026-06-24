"use client";

import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import MintNFT from "@/components/MintNFT";
import NFTGallery from "@/components/NFTGallery";
import { useWallet } from "@/hooks/useWallet";
import { init, totalSupply } from "@/hooks/contract";

export default function Home() {
  const { address, isConnected } = useWallet();
  const [reloadKey, setReloadKey] = useState(0);
  const [initializing, setInitializing] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [initDone, setInitDone] = useState(false);

  // Check if contract needs init on first load
  useEffect(() => {
    if (isConnected && address) {
      totalSupply()
        .then(() => setInitDone(true))
        .catch(() => setInitDone(false));
    }
  }, [isConnected, address]);

  const handleInit = async () => {
    if (!address) return;
    setInitializing(true);
    setInitError(null);
    try {
      await init(address);
      setInitDone(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Init failed";
      setInitError(msg);
    } finally {
      setInitializing(false);
    }
  };

  return (
    <>
      <Navbar />
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 py-8">
        {/* Hero */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold">NFT Platform</h1>
          <p className="text-zinc-500 mt-2">
            Mint and manage NFTs on Stellar Soroban
          </p>
        </div>

        {!isConnected ? (
          <div className="text-center py-20 text-zinc-500">
            <p className="text-lg">Connect your Freighter wallet to get started</p>
          </div>
        ) : !initDone ? (
          /* Init section */
          <div className="max-w-md mx-auto text-center py-16">
            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6">
              <h2 className="text-lg font-semibold mb-2">
                Initialize Contract
              </h2>
              <p className="text-sm text-zinc-500 mb-4">
                This contract needs one-time initialization. Click below to get started.
              </p>
              <button
                onClick={handleInit}
                disabled={initializing}
                className="px-6 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {initializing ? "Initializing..." : "Initialize Contract"}
              </button>
              {initError && (
                <p className="text-sm text-red-500 mt-3">{initError}</p>
              )}
            </div>
          </div>
        ) : address ? (
          /* Main content */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1">
              <MintNFT address={address} onMinted={() => setReloadKey((k) => k + 1)} />
            </div>
            <div className="lg:col-span-2">
              <NFTGallery address={address} reloadKey={reloadKey} />
            </div>
          </div>
        ) : null}
      </main>
    </>
  );
}
