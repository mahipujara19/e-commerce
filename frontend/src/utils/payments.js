// Payment methods this storefront can take customers through. The API may list others (for example Razorpay,
// still kept on the server for older orders), but the checkout only offers the ones it can complete.
export const SUPPORTED_PAYMENT_METHODS = ['cod', 'stripe']

// The methods from /api/orders/config that customers may choose, in the store's order.
export const customerPaymentMethods = (methods = []) =>
  methods.filter((method) => SUPPORTED_PAYMENT_METHODS.includes(method?.id))

// Online methods send the customer to a secure payment page; cash on delivery does not.
export const isOnlinePayment = (methodId) => methodId === 'stripe'
