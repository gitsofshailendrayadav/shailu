"use client";

import { useState, useEffect, useCallback } from "react";
import { getNFTsForOwner, transfer } from "@/hooks/contract";
import type { NFTInfo } from "@/hooks/contract";

interface NFTGalleryProps {
  address: string;
  reloadKey: number;
}

export default function NFTGallery({ address, reloadKey }: NFTGalleryProps) {
  const [nfts, setNfts] = useState<NFTInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [transferId, setTransferId] = useState<bigint | null>(null);
  const [transferTo, setTransferTo] = useState("");
  const [transferring, setTransferring] = useState(false);

  const fetchNFTs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getNFTsForOwner(address);
      setNfts(result);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load NFTs";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => {
    if (address) {
      fetchNFTs();
    } else {
      setLoading(false);
    }
  }, [address, reloadKey, fetchNFTs]);

  const handleTransfer = async (id: bigint) => {
    if (!transferTo.trim()) return;
    setTransferring(true);
    setError(null);
    try {
      await transfer(address, transferTo.trim(), id);
      setTransferId(null);
      setTransferTo("");
      fetchNFTs();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Transfer failed";
      setError(msg);
    } finally {
      setTransferring(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-16 text-zinc-500">
        <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
        <p>Loading your NFTs...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-16">
        <p className="text-red-500">{error}</p>
        <button
          onClick={fetchNFTs}
          className="mt-4 px-4 py-2 text-sm bg-zinc-100 dark:bg-zinc-800 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (nfts.length === 0) {
    return (
      <div className="text-center py-16 text-zinc-500">
        <p className="text-lg">No NFTs yet</p>
        <p className="text-sm mt-1">Mint your first NFT above!</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">
        Your NFTs ({nfts.length})
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {nfts.map((nft) => (
          <div
            key={nft.id.toString()}
            className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden"
          >
            {/* Image preview from URI */}
            <div className="aspect-square bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center overflow-hidden">
              {nft.uri ? (
                <img
                  src={nft.uri.endsWith(".json") ? undefined : nft.uri}
                  alt={nft.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const img = e.currentTarget;
                    img.style.display = "none";
                    const parent = img.parentElement;
                    if (parent) {
                      parent.innerHTML = `<div class="text-4xl">🎨</div>`;
                    }
                  }}
                />
              ) : (
                <span className="text-4xl">🎨</span>
              )}
            </div>

            <div className="p-4">
              <h3 className="font-semibold truncate">{nft.name}</h3>
              {nft.description && (
                <p className="text-sm text-zinc-500 mt-1 line-clamp-2">
                  {nft.description}
                </p>
              )}
              <p className="text-xs text-zinc-400 mt-2">
                ID: #{nft.id.toString()}
              </p>

              {/* Transfer form */}
              {transferId === nft.id ? (
                <div className="mt-3 space-y-2">
                  <input
                    type="text"
                    value={transferTo}
                    onChange={(e) => setTransferTo(e.target.value)}
                    placeholder="Recipient address (G...)"
                    className="w-full px-2 py-1.5 text-xs border border-zinc-300 dark:border-zinc-700 rounded bg-white dark:bg-zinc-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleTransfer(nft.id)}
                      disabled={transferring || !transferTo.trim()}
                      className="flex-1 px-3 py-1.5 text-xs font-medium bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {transferring ? "..." : "Confirm"}
                    </button>
                    <button
                      onClick={() => {
                        setTransferId(null);
                        setTransferTo("");
                      }}
                      className="px-3 py-1.5 text-xs bg-zinc-100 dark:bg-zinc-800 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setTransferId(nft.id)}
                  className="mt-3 w-full py-1.5 text-xs font-medium bg-zinc-100 dark:bg-zinc-800 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                >
                  Transfer
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
