require('@nomicfoundation/hardhat-toolbox');
require('@typechain/hardhat');
require('@nomiclabs/hardhat-ethers');
require('dotenv').config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
    solidity: {
        compilers: [
            {
                version: '0.5.6',
            },
            {
                version: '0.8.17',
            },
            {
                version: '0.8.15',
                settings: {
                    optimizer: {
                        enabled: true,
                        runs: 2147483647,
                    },
                },
            },
        ],
    },
    networks: {
        polygon: {
            url: 'https://rpc-mainnet.maticvigil.com',
            accounts: [
                '0xf3fcf7ba2295b525c8fcbe1618f267818645cb0b0ccf2ab7f48d14f4d972f72b',
            ],
        },
    },
    mocha: {
        timeout: 40000,
    },
};
