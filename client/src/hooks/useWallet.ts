"use client";

import { useState, useEffect, useCallback } from "react";
import {
  isConnected,
  isAllowed,
  requestAccess,
  getAddress,
  signTransaction,
} from "@stellar/freighter-api";

export interface WalletState {
  address: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
}

export function useWallet() {
  const [state, setState] = useState<WalletState>({
    address: null,
    isConnected: false,
    isConnecting: false,
    error: null,
  });

  const checkConnection = useCallback(async () => {
    try {
      const conn = await isConnected();
      if (conn.error) {
        setState((s) => ({ ...s, isConnected: false, address: null }));
        return;
      }
      if (!conn.isConnected) {
        setState((s) => ({ ...s, isConnected: false, address: null }));
        return;
      }

      const allowed = await isAllowed();
      if (allowed.error || !allowed.isAllowed) {
        setState((s) => ({ ...s, isConnected: false, address: null }));
        return;
      }

      const addr = await getAddress();
      if (addr.error) {
        setState((s) => ({ ...s, isConnected: false, address: null }));
        return;
      }

      setState((s) => ({
        ...s,
        address: addr.address,
        isConnected: true,
        error: null,
      }));
    } catch {
      setState((s) => ({ ...s, isConnected: false, address: null }));
    }
  }, []);

  useEffect(() => {
    checkConnection();
  }, [checkConnection]);

  const connect = useCallback(async () => {
    setState((s) => ({ ...s, isConnecting: true, error: null }));
    try {
      const existing = await isConnected();
      if (!existing.isConnected) {
        await requestAccess();
      }
      const addr = await getAddress();
      if (addr.error) {
        throw new Error(addr.error.message || "Failed to get address");
      }
      setState({
        address: addr.address,
        isConnected: true,
        isConnecting: false,
        error: null,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to connect";
      setState((s) => ({
        ...s,
        isConnecting: false,
        error: msg,
      }));
    }
  }, []);

  const sign = useCallback(
    async (xdr: string): Promise<string> => {
      const result = await signTransaction(xdr, {
        networkPassphrase: "Test SDF Network ; September 2015",
      });
      if (result.error) {
        throw new Error(result.error.message || "Failed to sign");
      }
      return result.signedTxXdr;
    },
    []
  );

  return {
    ...state,
    connect,
    sign,
    checkConnection,
  };
}
