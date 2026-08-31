import {requestPurchaseHandoff} from './purchaseHandoff';

describe('platform-neutral purchase boundary', () => {
  it('stays explicitly deferred without activating billing', () => {
    expect(requestPurchaseHandoff()).toEqual({status: 'unsupported', reason: 'store_activation_deferred'});
  });
});
