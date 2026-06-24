"use client";

import { useState } from "react";
import { mint } from "@/hooks/contract";

interface MintNFTProps {
  address: string;
  onMinted: () => void;
}

export default function MintNFT({ address, onMinted }: MintNFTProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [uri, setUri] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleMint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !uri.trim()) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const hash = await mint(address, name.trim(), description.trim(), uri.trim());
      setSuccess(`Minted! Tx: ${hash.slice(0, 16)}...`);
      setName("");
      setDescription("");
      setUri("");
      onMinted();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Minting failed";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6">
      <h2 className="text-lg font-semibold mb-4">Mint New NFT</h2>

      <form onSubmit={handleMint} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
            Name *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="My NFT"
            required
            className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="A description of your NFT"
            rows={3}
            className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
            Metadata URI *
          </label>
          <input
            type="url"
            value={uri}
            onChange={(e) => setUri(e.target.value)}
            placeholder="https://example.com/metadata.json"
            required
            className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {error && (
          <div className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
            {error}
          </div>
        )}

        {success && (
          <div className="text-sm text-green-600 bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
            {success}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !name.trim() || !uri.trim()}
          className="w-full py-2.5 px-4 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? "Minting..." : "Mint NFT"}
        </button>
      </form>
    </div>
  );
}
