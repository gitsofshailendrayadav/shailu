"use client";

import { useWallet } from "@/hooks/useWallet";

export default function Navbar() {
  const { address, isConnected, isConnecting, error, connect } = useWallet();

  return (
    <nav className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
      <div className="flex items-center gap-2">
        <span className="text-xl font-bold">NFT Platform</span>
      </div>

      <div className="flex items-center gap-4">
        {isConnected && address ? (
          <div className="flex items-center gap-3">
            <span className="text-sm text-zinc-500 dark:text-zinc-400">
              {address.slice(0, 6)}...{address.slice(-4)}
            </span>
            <span className="inline-block w-2 h-2 rounded-full bg-green-500" />
          </div>
        ) : (
          <button
            onClick={connect}
            disabled={isConnecting}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isConnecting ? "Connecting..." : "Connect Wallet"}
          </button>
        )}
        {error && (
          <span className="text-sm text-red-500">{error}</span>
        )}
      </div>
    </nav>
  );
}
