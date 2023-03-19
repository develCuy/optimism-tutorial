// Plugins
require('@nomiclabs/hardhat-ethers')

// Load environment variables from .env
require('dotenv').config();


const words = process.env.MNEMONIC.match(/[a-zA-Z]+/g).length
validLength = [12, 15, 18, 24]
if (!validLength.includes(words)) {
   console.log(`The mnemonic (${process.env.MNEMONIC}) is the wrong number of words`)
   process.exit(-1)
}

module.exports = {
  networks: {
    'optimism-testnet': {
      chainId: 57000,
      url: `${process.env.L2_TESTNET_API_URL}/${process.env.L2_API_KEY}`,
      accounts: { mnemonic: process.env.MNEMONIC }
    },
    'optimism-mainnet': {
      chainId: 10,
      url: `${process.env.L2_MAINNET_API_URL}/${process.env.L2_API_KEY}`,
      accounts: { mnemonic: process.env.MNEMONIC }
    }
  },
  solidity: {
    compilers: [
      {
        version: '0.8.13',
      },
      {
        version: '0.8.0',
      },
    ],
  },
}
