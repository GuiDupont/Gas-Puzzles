require('@nomicfoundation/hardhat-toolbox');
require('@typechain/hardhat');
require('@nomiclabs/hardhat-ethers');

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
    solidity: {
        compilers: [
            {
                version: '0.5.6',
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
    mocha: {
        timeout: 40000,
    },
};
