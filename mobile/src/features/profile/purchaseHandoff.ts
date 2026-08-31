export type PurchaseHandoff = {
  status: 'unsupported';
  reason: 'store_activation_deferred';
};

/** Platform-neutral boundary. Billing SDKs and store activation are intentionally deferred. */
export function requestPurchaseHandoff(): PurchaseHandoff {
  return {status: 'unsupported', reason: 'store_activation_deferred'};
}
