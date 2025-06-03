

// export const PROJECT = "lootbox-service";

export const PREDICTION_CREDITS_ADDRESS =
  "0x5E43470EA6d946F31920b09904A51a53A4557Eb5";

export const MINTER_ROLE =
  "0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6";

export const CG_PC_DECIMAL_VALUE = 6;  

export const CGPC_ABI = [
  {
    inputs: [
      {
        internalType: "struct PCToken.SupportedToken[]",
        name: "tokens",
        type: "tuple[]",
        components: [
          { internalType: "address", name: "token", type: "address" },
          { internalType: "uint256", name: "rate", type: "uint256" },
        ],
      },
      {
        internalType: "contract IProxyFactory",
        name: "factory",
        type: "address",
      },
      { internalType: "uint256", name: "minWithdraw", type: "uint256" },
      {
        internalType: "uint256",
        name: "configuredFeeBps",
        type: "uint256",
      },
      {
        internalType: "address",
        name: "configuredFeeReceiver",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "configuredDepositLimit",
        type: "uint256",
      },
    ],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    inputs: [
      { internalType: "uint256", name: "passed", type: "uint256" },
      { internalType: "uint256", name: "max", type: "uint256" },
    ],
    type: "error",
    name: "ConfiguredFeeTooHigh",
  },
  {
    inputs: [
      { internalType: "uint256", name: "totalDeposit", type: "uint256" },
      { internalType: "uint256", name: "max", type: "uint256" },
    ],
    type: "error",
    name: "DepositLimitReached",
  },
  {
    inputs: [
      { internalType: "uint256", name: "current", type: "uint256" },
      { internalType: "uint256", name: "needed", type: "uint256" },
    ],
    type: "error",
    name: "InsufficientAllowance",
  },
  {
    inputs: [
      { internalType: "uint256", name: "current", type: "uint256" },
      { internalType: "uint256", name: "needed", type: "uint256" },
    ],
    type: "error",
    name: "InsufficientBalanceForWithdraw",
  },
  {
    inputs: [
      { internalType: "uint256", name: "current", type: "uint256" },
      { internalType: "uint256", name: "needed", type: "uint256" },
    ],
    type: "error",
    name: "InsufficientCollateralForDeposit",
  },
  {
    inputs: [
      { internalType: "address", name: "token", type: "address" },
      { internalType: "uint256", name: "current", type: "uint256" },
      { internalType: "uint256", name: "needed", type: "uint256" },
    ],
    type: "error",
    name: "InsufficientCollateralForWithdraw",
  },
  { inputs: [], type: "error", name: "InvalidDepositAmount" },
  { inputs: [], type: "error", name: "InvalidMinterAddress" },
  { inputs: [], type: "error", name: "InvalidSupportedTokenAddress" },
  { inputs: [], type: "error", name: "InvalidSupportedTokenRate" },
  {
    inputs: [
      { internalType: "uint256", name: "amount", type: "uint256" },
      { internalType: "uint256", name: "minimumWithdraw", type: "uint256" },
    ],
    type: "error",
    name: "InvalidWithdrawAmount",
  },
  {
    inputs: [
      { internalType: "bytes32", name: "msgHash", type: "bytes32" },
      {
        internalType: "uint256",
        name: "executedTimestamp",
        type: "uint256",
      },
    ],
    type: "error",
    name: "MsgAlreadyExecuted",
  },
  {
    inputs: [{ internalType: "address", name: "account", type: "address" }],
    type: "error",
    name: "NotTheFeeOperator",
  },
  { inputs: [], type: "error", name: "NullFeeReceiver" },
  {
    inputs: [{ internalType: "uint256", name: "percent", type: "uint256" }],
    type: "error",
    name: "ReductionPercentExceedMaximum",
  },
  {
    inputs: [{ internalType: "address", name: "token", type: "address" }],
    type: "error",
    name: "TokenAlreadySupported",
  },
  {
    inputs: [
      { internalType: "address", name: "from", type: "address" },
      { internalType: "address", name: "to", type: "address" },
    ],
    type: "error",
    name: "TransferNotAllowed",
  },
  {
    inputs: [{ internalType: "address", name: "token", type: "address" }],
    type: "error",
    name: "UnsupportedToken",
  },
  {
    inputs: [{ internalType: "address", name: "account", type: "address" }],
    type: "error",
    name: "WithdrawNotApproved",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "owner",
        type: "address",
        indexed: true,
      },
      {
        internalType: "address",
        name: "spender",
        type: "address",
        indexed: true,
      },
      {
        internalType: "uint256",
        name: "value",
        type: "uint256",
        indexed: false,
      },
    ],
    type: "event",
    name: "Approval",
    anonymous: false,
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "oldVal",
        type: "uint256",
        indexed: false,
      },
      {
        internalType: "uint256",
        name: "newVal",
        type: "uint256",
        indexed: false,
      },
    ],
    type: "event",
    name: "DepositLimitUpdated",
    anonymous: false,
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "user",
        type: "address",
        indexed: true,
      },
      {
        internalType: "address",
        name: "token",
        type: "address",
        indexed: true,
      },
      {
        internalType: "uint256",
        name: "amount",
        type: "uint256",
        indexed: false,
      },
      {
        internalType: "uint256",
        name: "collateralAmount",
        type: "uint256",
        indexed: false,
      },
    ],
    type: "event",
    name: "Deposited",
    anonymous: false,
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "oldFeeBps",
        type: "uint256",
        indexed: false,
      },
      {
        internalType: "uint256",
        name: "newFeeBps",
        type: "uint256",
        indexed: false,
      },
    ],
    type: "event",
    name: "FeeBpsUpdated",
    anonymous: false,
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "oldFeeReceiver",
        type: "address",
        indexed: false,
      },
      {
        internalType: "address",
        name: "newFeeReceiver",
        type: "address",
        indexed: false,
      },
    ],
    type: "event",
    name: "FeeReceiverUpdated",
    anonymous: false,
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "operator",
        type: "address",
        indexed: true,
      },
      {
        internalType: "address",
        name: "account",
        type: "address",
        indexed: true,
      },
      {
        internalType: "uint256",
        name: "bps",
        type: "uint256",
        indexed: false,
      },
      {
        internalType: "uint256",
        name: "expiration",
        type: "uint256",
        indexed: false,
      },
    ],
    type: "event",
    name: "FeeReductionConfigured",
    anonymous: false,
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "oldVal",
        type: "uint256",
        indexed: false,
      },
      {
        internalType: "uint256",
        name: "newVal",
        type: "uint256",
        indexed: false,
      },
    ],
    type: "event",
    name: "MinimumWithdrawUpdated",
    anonymous: false,
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "minter",
        type: "address",
        indexed: true,
      },
      {
        internalType: "address",
        name: "recipient",
        type: "address",
        indexed: true,
      },
      {
        internalType: "uint256",
        name: "amount",
        type: "uint256",
        indexed: false,
      },
    ],
    type: "event",
    name: "Minted",
    anonymous: false,
  },
  {
    inputs: [
      {
        internalType: "bytes32",
        name: "role",
        type: "bytes32",
        indexed: true,
      },
      {
        internalType: "bytes32",
        name: "previousAdminRole",
        type: "bytes32",
        indexed: true,
      },
      {
        internalType: "bytes32",
        name: "newAdminRole",
        type: "bytes32",
        indexed: true,
      },
    ],
    type: "event",
    name: "RoleAdminChanged",
    anonymous: false,
  },
  {
    inputs: [
      {
        internalType: "bytes32",
        name: "role",
        type: "bytes32",
        indexed: true,
      },
      {
        internalType: "address",
        name: "account",
        type: "address",
        indexed: true,
      },
      {
        internalType: "address",
        name: "sender",
        type: "address",
        indexed: true,
      },
    ],
    type: "event",
    name: "RoleGranted",
    anonymous: false,
  },
  {
    inputs: [
      {
        internalType: "bytes32",
        name: "role",
        type: "bytes32",
        indexed: true,
      },
      {
        internalType: "address",
        name: "account",
        type: "address",
        indexed: true,
      },
      {
        internalType: "address",
        name: "sender",
        type: "address",
        indexed: true,
      },
    ],
    type: "event",
    name: "RoleRevoked",
    anonymous: false,
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "token",
        type: "address",
        indexed: true,
      },
      {
        internalType: "uint256",
        name: "rate",
        type: "uint256",
        indexed: false,
      },
    ],
    type: "event",
    name: "SupportedTokenAdded",
    anonymous: false,
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "token",
        type: "address",
        indexed: true,
      },
    ],
    type: "event",
    name: "SupportedTokenRemoved",
    anonymous: false,
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "from",
        type: "address",
        indexed: true,
      },
      {
        internalType: "address",
        name: "to",
        type: "address",
        indexed: true,
      },
      {
        internalType: "uint256",
        name: "value",
        type: "uint256",
        indexed: false,
      },
    ],
    type: "event",
    name: "Transfer",
    anonymous: false,
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "account",
        type: "address",
        indexed: true,
      },
      {
        internalType: "address",
        name: "operator",
        type: "address",
        indexed: true,
      },
    ],
    type: "event",
    name: "WithdrawApproved",
    anonymous: false,
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "account",
        type: "address",
        indexed: true,
      },
      {
        internalType: "address",
        name: "operator",
        type: "address",
        indexed: true,
      },
    ],
    type: "event",
    name: "WithdrawRevoked",
    anonymous: false,
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "user",
        type: "address",
        indexed: true,
      },
      {
        internalType: "address",
        name: "token",
        type: "address",
        indexed: true,
      },
      {
        internalType: "address",
        name: "recipient",
        type: "address",
        indexed: true,
      },
      {
        internalType: "uint256",
        name: "amount",
        type: "uint256",
        indexed: false,
      },
      {
        internalType: "uint256",
        name: "collateralAmount",
        type: "uint256",
        indexed: false,
      },
      {
        internalType: "uint256",
        name: "fee",
        type: "uint256",
        indexed: false,
      },
    ],
    type: "event",
    name: "Withdrawn",
    anonymous: false,
  },
  {
    inputs: [],
    stateMutability: "view",
    type: "function",
    name: "ADMIN_ROLE",
    outputs: [{ internalType: "bytes32", name: "", type: "bytes32" }],
  },
  {
    inputs: [],
    stateMutability: "view",
    type: "function",
    name: "DEFAULT_ADMIN_ROLE",
    outputs: [{ internalType: "bytes32", name: "", type: "bytes32" }],
  },
  {
    inputs: [],
    stateMutability: "view",
    type: "function",
    name: "MINTER_ROLE",
    outputs: [{ internalType: "bytes32", name: "", type: "bytes32" }],
  },
  {
    inputs: [],
    stateMutability: "view",
    type: "function",
    name: "OPERATOR_ROLE",
    outputs: [{ internalType: "bytes32", name: "", type: "bytes32" }],
  },
  {
    inputs: [],
    stateMutability: "view",
    type: "function",
    name: "TOKEN_NAME",
    outputs: [{ internalType: "string", name: "", type: "string" }],
  },
  {
    inputs: [],
    stateMutability: "view",
    type: "function",
    name: "TOKEN_SYMBOL",
    outputs: [{ internalType: "string", name: "", type: "string" }],
  },
  {
    inputs: [],
    stateMutability: "view",
    type: "function",
    name: "WHITELIST_ROLE",
    outputs: [{ internalType: "bytes32", name: "", type: "bytes32" }],
  },
  {
    inputs: [
      { internalType: "address", name: "token", type: "address" },
      { internalType: "uint256", name: "rate", type: "uint256" },
    ],
    stateMutability: "nonpayable",
    type: "function",
    name: "addSupportedToken",
  },
  {
    inputs: [
      { internalType: "address", name: "owner", type: "address" },
      { internalType: "address", name: "spender", type: "address" },
    ],
    stateMutability: "view",
    type: "function",
    name: "allowance",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
  },
  {
    inputs: [
      { internalType: "address", name: "spender", type: "address" },
      { internalType: "uint256", name: "amount", type: "uint256" },
    ],
    stateMutability: "nonpayable",
    type: "function",
    name: "approve",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
  },
  {
    inputs: [{ internalType: "address", name: "account", type: "address" }],
    stateMutability: "nonpayable",
    type: "function",
    name: "approveWithdraw",
  },
  {
    inputs: [
      {
        internalType: "struct IPCToken.ApprovalMsg",
        name: "approvalMsg",
        type: "tuple",
        components: [
          { internalType: "address", name: "account", type: "address" },
          { internalType: "uint256", name: "nonce", type: "uint256" },
        ],
      },
      { internalType: "bytes", name: "operatorSig", type: "bytes" },
    ],
    stateMutability: "nonpayable",
    type: "function",
    name: "approveWithdrawWithSig",
  },
  {
    inputs: [{ internalType: "address", name: "account", type: "address" }],
    stateMutability: "view",
    type: "function",
    name: "balanceOf",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
  },
  {
    inputs: [
      { internalType: "uint256", name: "amount", type: "uint256" },
      { internalType: "uint256", name: "rate", type: "uint256" },
    ],
    stateMutability: "pure",
    type: "function",
    name: "calculateNeededToken",
    outputs: [
      {
        internalType: "uint256",
        name: "collateralAmount",
        type: "uint256",
      },
    ],
  },
  {
    inputs: [{ internalType: "uint256", name: "newLimit", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
    name: "configureDepositLimit",
  },
  {
    inputs: [{ internalType: "uint256", name: "newFeeBps", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
    name: "configureFeeBps",
  },
  {
    inputs: [{ internalType: "address", name: "newReceiver", type: "address" }],
    stateMutability: "nonpayable",
    type: "function",
    name: "configureFeeReceiver",
  },
  {
    inputs: [
      { internalType: "address", name: "account", type: "address" },
      { internalType: "uint256", name: "percent", type: "uint256" },
      { internalType: "uint256", name: "expiration", type: "uint256" },
    ],
    stateMutability: "nonpayable",
    type: "function",
    name: "configureFeeReduction",
  },
  {
    inputs: [
      {
        internalType: "struct FeeManager.FeeReductionMsg",
        name: "reductionMsg",
        type: "tuple",
        components: [
          { internalType: "address", name: "account", type: "address" },
          { internalType: "uint256", name: "percent", type: "uint256" },
          { internalType: "uint256", name: "expiration", type: "uint256" },
        ],
      },
      { internalType: "bytes", name: "signature", type: "bytes" },
    ],
    stateMutability: "nonpayable",
    type: "function",
    name: "configureFeeReductionWithSig",
  },
  {
    inputs: [{ internalType: "uint256", name: "updatedVal", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
    name: "configureMinimumWithdraw",
  },
  {
    inputs: [],
    stateMutability: "view",
    type: "function",
    name: "decimals",
    outputs: [{ internalType: "uint8", name: "", type: "uint8" }],
  },
  {
    inputs: [
      { internalType: "address", name: "spender", type: "address" },
      { internalType: "uint256", name: "subtractedValue", type: "uint256" },
    ],
    stateMutability: "nonpayable",
    type: "function",
    name: "decreaseAllowance",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
  },
  {
    inputs: [
      { internalType: "address", name: "token", type: "address" },
      { internalType: "uint256", name: "amount", type: "uint256" },
    ],
    stateMutability: "nonpayable",
    type: "function",
    name: "deposit",
  },
  {
    inputs: [],
    stateMutability: "view",
    type: "function",
    name: "depositLimit",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
  },
  {
    inputs: [{ internalType: "bytes32", name: "", type: "bytes32" }],
    stateMutability: "view",
    type: "function",
    name: "executedMsgs",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
  },
  {
    inputs: [],
    stateMutability: "view",
    type: "function",
    name: "feeBps",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
  },
  {
    inputs: [],
    stateMutability: "view",
    type: "function",
    name: "feeReceiver",
    outputs: [{ internalType: "address", name: "", type: "address" }],
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
    name: "feeReductions",
    outputs: [
      { internalType: "uint256", name: "percent", type: "uint256" },
      { internalType: "uint256", name: "expiration", type: "uint256" },
    ],
  },
  {
    inputs: [{ internalType: "bytes32", name: "role", type: "bytes32" }],
    stateMutability: "view",
    type: "function",
    name: "getRoleAdmin",
    outputs: [{ internalType: "bytes32", name: "", type: "bytes32" }],
  },
  {
    inputs: [{ internalType: "address", name: "newAdmin", type: "address" }],
    stateMutability: "nonpayable",
    type: "function",
    name: "grantAdmin",
  },
  {
    inputs: [{ internalType: "address", name: "newMinter", type: "address" }],
    stateMutability: "nonpayable",
    type: "function",
    name: "grantMinter",
  },
  {
    inputs: [{ internalType: "address", name: "newOperator", type: "address" }],
    stateMutability: "nonpayable",
    type: "function",
    name: "grantOperator",
  },
  {
    inputs: [
      { internalType: "bytes32", name: "role", type: "bytes32" },
      { internalType: "address", name: "account", type: "address" },
    ],
    stateMutability: "nonpayable",
    type: "function",
    name: "grantRole",
  },
  {
    inputs: [{ internalType: "address", name: "_whitelist", type: "address" }],
    stateMutability: "nonpayable",
    type: "function",
    name: "grantWhitelist",
  },
  {
    inputs: [
      { internalType: "bytes32", name: "role", type: "bytes32" },
      { internalType: "address", name: "account", type: "address" },
    ],
    stateMutability: "view",
    type: "function",
    name: "hasRole",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
  },
  {
    inputs: [
      {
        internalType: "struct IPCToken.ApprovalMsg",
        name: "approvalMsg",
        type: "tuple",
        components: [
          { internalType: "address", name: "account", type: "address" },
          { internalType: "uint256", name: "nonce", type: "uint256" },
        ],
      },
    ],
    stateMutability: "view",
    type: "function",
    name: "hashApprovalMsg",
    outputs: [{ internalType: "bytes32", name: "", type: "bytes32" }],
  },
  {
    inputs: [
      {
        internalType: "struct FeeManager.FeeReductionMsg",
        name: "reductionMsg",
        type: "tuple",
        components: [
          { internalType: "address", name: "account", type: "address" },
          { internalType: "uint256", name: "percent", type: "uint256" },
          { internalType: "uint256", name: "expiration", type: "uint256" },
        ],
      },
    ],
    stateMutability: "view",
    type: "function",
    name: "hashReductionMsg",
    outputs: [{ internalType: "bytes32", name: "", type: "bytes32" }],
  },
  {
    inputs: [
      { internalType: "address", name: "spender", type: "address" },
      { internalType: "uint256", name: "addedValue", type: "uint256" },
    ],
    stateMutability: "nonpayable",
    type: "function",
    name: "increaseAllowance",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
  },
  {
    inputs: [{ internalType: "address", name: "admin", type: "address" }],
    stateMutability: "view",
    type: "function",
    name: "isAdmin",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
  },
  {
    inputs: [{ internalType: "address", name: "minter", type: "address" }],
    stateMutability: "view",
    type: "function",
    name: "isMinter",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
  },
  {
    inputs: [{ internalType: "address", name: "guardian", type: "address" }],
    stateMutability: "view",
    type: "function",
    name: "isOperator",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
  },
  {
    inputs: [
      { internalType: "address", name: "sender", type: "address" },
      { internalType: "address", name: "recipient", type: "address" },
    ],
    stateMutability: "view",
    type: "function",
    name: "isTransferAllowed",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
  },
  {
    inputs: [{ internalType: "address", name: "whitelist", type: "address" }],
    stateMutability: "view",
    type: "function",
    name: "isWhitelist",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
  },
  {
    inputs: [],
    stateMutability: "view",
    type: "function",
    name: "minimumWithdraw",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
  },
  {
    inputs: [
      { internalType: "address", name: "recipient", type: "address" },
      { internalType: "uint256", name: "amount", type: "uint256" },
    ],
    stateMutability: "nonpayable",
    type: "function",
    name: "mint",
  },
  {
    inputs: [],
    stateMutability: "view",
    type: "function",
    name: "name",
    outputs: [{ internalType: "string", name: "", type: "string" }],
  },
  {
    inputs: [{ internalType: "address", name: "token", type: "address" }],
    stateMutability: "nonpayable",
    type: "function",
    name: "removeSupportedToken",
  },
  {
    inputs: [
      { internalType: "bytes32", name: "role", type: "bytes32" },
      { internalType: "address", name: "account", type: "address" },
    ],
    stateMutability: "nonpayable",
    type: "function",
    name: "renounceRole",
  },
  {
    inputs: [
      { internalType: "bytes32", name: "role", type: "bytes32" },
      { internalType: "address", name: "account", type: "address" },
    ],
    stateMutability: "nonpayable",
    type: "function",
    name: "revokeRole",
  },
  {
    inputs: [{ internalType: "address", name: "account", type: "address" }],
    stateMutability: "nonpayable",
    type: "function",
    name: "revokeWithdraw",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
    name: "supportedTokens",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
  },
  {
    inputs: [{ internalType: "bytes4", name: "interfaceId", type: "bytes4" }],
    stateMutability: "view",
    type: "function",
    name: "supportsInterface",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
  },
  {
    inputs: [],
    stateMutability: "view",
    type: "function",
    name: "symbol",
    outputs: [{ internalType: "string", name: "", type: "string" }],
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
    name: "totalDeposits",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
  },
  {
    inputs: [],
    stateMutability: "view",
    type: "function",
    name: "totalSupply",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
  },
  {
    inputs: [
      { internalType: "address", name: "recipient", type: "address" },
      { internalType: "uint256", name: "amount", type: "uint256" },
    ],
    stateMutability: "nonpayable",
    type: "function",
    name: "transfer",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
  },
  {
    inputs: [
      { internalType: "address", name: "sender", type: "address" },
      { internalType: "address", name: "recipient", type: "address" },
      { internalType: "uint256", name: "amount", type: "uint256" },
    ],
    stateMutability: "nonpayable",
    type: "function",
    name: "transferFrom",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
  },
  {
    inputs: [],
    stateMutability: "view",
    type: "function",
    name: "userWalletFactory",
    outputs: [
      { internalType: "contract IProxyFactory", name: "", type: "address" },
    ],
  },
  {
    inputs: [
      { internalType: "address", name: "token", type: "address" },
      { internalType: "uint256", name: "amount", type: "uint256" },
      { internalType: "address", name: "recipient", type: "address" },
    ],
    stateMutability: "nonpayable",
    type: "function",
    name: "withdraw",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
    name: "withdrawApproval",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
  },
];
