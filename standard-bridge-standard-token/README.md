# Bridging your Standard ERC20 token to Optimism using the Standard Bridge

[![Discord](https://img.shields.io/discord/667044843901681675.svg?color=768AD4&label=discord&logo=https%3A%2F%2Fdiscordapp.com%2Fassets%2F8c9701b98ad4372b58f13fd9f65f966e.svg)](https://discord-gateway.optimism.io)
[![Twitter Follow](https://img.shields.io/twitter/follow/optimismFND.svg?label=optimismFND&style=social)](https://twitter.com/optimismFND)


For an L1/L2 token pair to work on the Standard Bridge the L2 token contract must implement
[`IL2StandardERC20`](https://github.com/ethereum-optimism/optimism/blob/develop/packages/contracts/contracts/standards/IL2StandardERC20.sol) interface. 

If you do not need any special processing on L2, just the ability to deposit, transfer, and withdraw tokens, you can use [`OptimismMintableERC20Factory`](https://github.com/ethereum-optimism/optimism/blob/develop/packages/contracts-bedrock/contracts/universal/OptimismMintableERC20Factory.sol).


**Note:** This tutorial is for the Bedrock release, which is currently running on the Optimism Testnet test network, but not on the production network. Here is the [pre-Bedrock tutorial](https://github.com/ethereum-optimism/optimism-tutorial/tree/01e4f94fa2671cfed0c6c82257345f77b3b858ef/standard-bridge-standard-token).

**Warning:** The standard bridge does *not* support certain ERC-20 configurations:

- [Fee on transfer tokens](https://github.com/d-xo/weird-erc20#fee-on-transfer)
- [Tokens that modify balances without emitting a Transfer event](https://github.com/d-xo/weird-erc20#balance-modifications-outside-of-transfers-rebasingairdrops)


## Deploying the token

1. Download the necessary packages.

   ```sh
   yarn
   ```

1. Copy `.env.example` to `.env`.

   ```sh
   cp .env.example .env
   ```

1. Edit `.env` to set the deployment parameters:

   - `MNEMONIC`, the mnemonic for an account that has enough SYS for the deployment.
   - `L1_API_KEY`, the key for the RPC API application for a Layer 1 Testnet endpoint.
   - `L2_API_KEY`, the key for the RPC API application for a Layer 2 Testnet endpoint.
   - `L1_TOKEN_ADDRESS`, the address of the L1 ERC20 which you want to bridge.

1. Open the hardhat console.

   ```sh
   yarn hardhat console --network optimism-testnet
   ```

1. Connect to `OptimismMintableERC20Factory`. 

   ```js
   fname = "node_modules/@eth-optimism/contracts-bedrock/artifacts/contracts/universal/OptimismMintableERC20Factory.sol/OptimismMintableERC20Factory.json"
   ftext = fs.readFileSync(fname).toString().replace(/\n/g, "")
   optimismMintableERC20FactoryData = JSON.parse(ftext)
   optimismMintableERC20Factory = new ethers.Contract(
      "0x4200000000000000000000000000000000000012", 
      optimismMintableERC20FactoryData.abi, 
      await ethers.getSigner())
   ```


1. Deploy the contract.

   ```js
   deployTx = await optimismMintableERC20Factory.createOptimismMintableERC20(
      process.env.L1_TOKEN_ADDRESS,
      "Token Name on L2",
      "L2-SYMBOL"
   )
   deployRcpt = await deployTx.wait()
   ```

## Transferring tokens 

1. Get the token addresses.

   ```js
   l1Addr = process.env.L1_TOKEN_ADDRESS
   event = deployRcpt.events.filter(x => x.event == "OptimismMintableERC20Created")[0]
   l2Addr = event.args.localToken
   ```

1. Get the data for `OptimismMintableERC20`:

   ```js
   fname = "node_modules/@eth-optimism/contracts-bedrock/artifacts/contracts/universal/OptimismMintableERC20.sol/OptimismMintableERC20.json"
   ftext = fs.readFileSync(fname).toString().replace(/\n/g, "")
   optimismMintableERC20Data = JSON.parse(ftext)
   ```

1. Get the L2 contract.

   ```js
   l2Contract = new ethers.Contract(l2Addr, optimismMintableERC20Data.abi, await ethers.getSigner())
   ```

### Get setup for L1 (provider, wallet, tokens, etc)

1. Get the L1 wallet.

   ```js
   l1Url = `${process.env.L1_TESTNET_API_URL}/${process.env.L1_API_KEY}`
   l1RpcProvider = new ethers.providers.JsonRpcProvider(l1Url)
   l1HdNode = ethers.utils.HDNode.fromMnemonic(process.env.MNEMONIC)
   l1PrivateKey = l1HdNode.derivePath(ethers.utils.defaultPath).privateKey
   l1Wallet = new ethers.Wallet(l1PrivateKey, l1RpcProvider)
   ```

1. Get the L1 contract.

   ```js
   l1Factory = await ethers.getContractFactory("SyscoinUselessToken")
   l1Contract = new ethers.Contract(process.env.L1_TOKEN_ADDRESS, l1Factory.interface, l1Wallet)
   ```

1. Get tokens on L1 (and verify the balance)

   ```js
   faucetTx = await l1Contract.faucet()
   faucetRcpt = await faucetTx.wait()
   await l1Contract.balanceOf(l1Wallet.address)
   ```


### Transfer tokens

Create and use [`CrossDomainMessenger`](https://sdk.optimism.io/classes/crosschainmessenger) (the Optimism SDK object used to bridge assets).

1. Import the Optimism SDK.

   ```js
   optimismSDK = require("@eth-optimism/sdk")
   ```

1. Import the Syscoin Networks.

   ```js
   syscoinNetworks = require('syscoin-networks')
   ```

1. Get the L2 wallet.

   ```js
   l2Url = `${process.env.L2_TESTNET_API_URL}/${process.env.L2_API_KEY}`
   l2RpcProvider = new ethers.providers.JsonRpcProvider(l2Url)
   l2HdNode = ethers.utils.HDNode.fromMnemonic(process.env.MNEMONIC)
   l2PrivateKey = l2HdNode.derivePath(ethers.utils.defaultPath).privateKey
   l2Wallet = new ethers.Wallet(l2PrivateKey, l2RpcProvider)
   ```

1. Create the cross domain messenger.

   ```js
   l1ChainId = (await l1RpcProvider.getNetwork()).chainId
   l1Network = syscoinNetworks.getNetworkByChainId(l1ChainId, syscoinNetworks.networks)
   l2ChainId = (await ethers.provider.getNetwork()).chainId
   l2Network = syscoinNetworks.getNetworkByChainId(l2ChainId, syscoinNetworks.networks)
   crossChainMessenger = new optimismSDK.CrossChainMessenger({
     l1SignerOrProvider: l1Wallet,
     l2SignerOrProvider: l2Wallet,
     l1ChainId: l1ChainId,
     l2ChainId: l2ChainId,
     bedrock: true,
     contracts: { l1: l1Network.contracts, l2: l2Network.contracts },
     bridges: {
         ETH: {
             Adapter: optimismSDK.ETHBridgeAdapter,
             l1Bridge: l1Network.contracts.L1StandardBridge,
             l2Bridge: l2Network.contracts.L2StandardBridge,
         },
         Standard: {
             Adapter: optimismSDK.StandardBridgeAdapter,
             l1Bridge:
                 l1Network.contracts.L1StandardBridge,
             l2Bridge: l2Network.contracts.L2StandardBridge,
         }
     }
   })
   ```

#### Deposit (from L1 to Optimism)

1. Give the L1 bridge an allowance to use the user's token.
   The L2 address is necessary to know which bridge is responsible and needs the allowance.

   ```js
   depositTx1 = await crossChainMessenger.approveERC20(l1Contract.address, l2Addr, 1e15)
   await depositTx1.wait()
   ```
   NOTE: Syscoin NEVM L1 has a block time of 2.5 minutes. Please be patient while waiting for block confirmations on the network.

1. Check your balances on L1 and L2.
   Note that `l1Wallet` and `l2Wallet` have the same address, so it doesn't matter which one we use.

   ```js
   await l1Contract.balanceOf(l1Wallet.address)
   await l2Contract.balanceOf(l2Wallet.address)
   ```   

1. Do the actual deposit

   ```js
   depositTx2 = await crossChainMessenger.depositERC20(l1Addr, l2Addr, 1e15)
   await depositTx2.wait()
   ```
   NOTE: Syscoin NEVM L1 has a block time of 2.5 minutes. Please be patient while waiting for block confirmations on the network.

1. Wait for the deposit to be relayed.

   ```js
   await crossChainMessenger.waitForMessageStatus(depositTx2.hash, optimismSDK.MessageStatus.RELAYED)
   ```

1. Check your balances on L1 and L2.

   ```js
   await l1Contract.balanceOf(l1Wallet.address)
   await l2Contract.balanceOf(l2Wallet.address)
   ```

#### Withdrawal (from Optimism to L1)

1. Initiate the withdrawal on L2

   ```js
   withdrawalTx1 = await crossChainMessenger.withdrawERC20(l1Addr, l2Addr, 1e15)
   await withdrawalTx1.wait()
   ```

1. Wait until the root state is published on L1, and then prove the withdrawal.
   This is likely to take about 2 hours.

   ```js
   await crossChainMessenger.waitForMessageStatus(withdrawalTx1.hash, optimismSDK.MessageStatus.READY_TO_PROVE)
   withdrawalTx2 = await crossChainMessenger.proveMessage(withdrawalTx1.hash)
   await withdrawalTx2.wait()
   ```

1. Wait the fault challenge period (about one hour on Testnet, seven days on the production network) and then finish the withdrawal.

   ```js
   await crossChainMessenger.waitForMessageStatus(withdrawalTx1.hash, optimismSDK.MessageStatus.READY_FOR_RELAY)
   withdrawalTx3 = await crossChainMessenger.finalizeMessage(withdrawalTx1.hash)
   await withdrawalTx3.wait()
   ```


1. Check your balances on L1 and L2.
   The balance on L2 should be back to zero.

   ```js
   await l1Contract.balanceOf(l1Wallet.address)
   await l2Contract.balanceOf(l1Wallet.address)
   ```
