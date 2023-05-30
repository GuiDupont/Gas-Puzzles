const { expect, use } = require('chai');
const { ethers } = require('hardhat');
const { BigNumber } = ethers;
const helpers = require('@nomicfoundation/hardhat-network-helpers');

use(require('chai-as-promised'));

const TARGET_GAS_PRICE = 136_508;
const PROPOSAL_NAME = 'EXAMPLE';
const PROPOSAL_NAME_BYTES32 = ethers.utils.formatBytes32String(PROPOSAL_NAME);
const PROPOSAL_INDEX = 0;

const logGasUsage = (currentGasUsage) => {
    const diff = TARGET_GAS_PRICE - currentGasUsage;
    console.log(`           Current gas use:   ${currentGasUsage}`);
    console.log(`           The gas target is: ${TARGET_GAS_PRICE}`);
    if (diff < 0) {
        console.log(
            `           You are \x1b[31m${diff * -1}\x1b[0m above the target`
        );
    }
};

describe('Vote', async function () {
    let instance;

    beforeEach(async () => {
        const ContractFactory = await ethers.getContractFactory(
            'OptimizedVote'
        );
        instance = await ContractFactory.deploy();

        await instance.deployed();
    });

    describe('Payable', function () {
        it('The functions MUST remain non-payable', async function () {
            let error;
            try {
                await instance.createProposal(PROPOSAL_NAME_BYTES32, {
                    value: ethers.utils.parseEther('1.00'),
                });
            } catch (e) {
                error = e;
            }
            expect(error.reason).to.equal(
                'non-payable method cannot override value'
            );
            expect(error.code).to.equal('UNSUPPORTED_OPERATION');
            expect(instance.createProposal(PROPOSAL_NAME_BYTES32)).to.not.be
                .rejected;

            try {
                await instance.vote(PROPOSAL_NAME_BYTES32, {
                    value: ethers.utils.parseEther('1.00'),
                });
            } catch (e) {
                error = e;
            }

            expect(error.reason).to.equal(
                'non-payable method cannot override value'
            );
            expect(error.code).to.equal('UNSUPPORTED_OPERATION');
            expect(instance.vote(PROPOSAL_INDEX)).to.not.be.rejected;
        });
    });

    describe('Gas target', function () {
        it('The functions MUST meet the expected gas efficiency', async function () {
            const tx1 = await instance.createProposal(PROPOSAL_NAME_BYTES32);
            const receipt1 = await tx1.wait();
            const gasEstimateTx1 = receipt1.gasUsed;

            const tx2 = await instance.vote(PROPOSAL_NAME_BYTES32);
            const receipt2 = await tx2.wait();
            const gasEstimateTx2 = receipt2.gasUsed;

            const totalGasEstimate = gasEstimateTx1.add(gasEstimateTx2);

            logGasUsage(totalGasEstimate);

            expect(totalGasEstimate).lte(TARGET_GAS_PRICE);
        });
    });

    describe('Business logic', function () {
        it('The functions MUST perform as expected', async function () {
            await instance.createProposal(PROPOSAL_NAME_BYTES32);
            let voteCount = await instance.getVoteCount(PROPOSAL_NAME_BYTES32);
            expect(voteCount).equal(0);

            await instance.vote(PROPOSAL_NAME_BYTES32);
            voteCount = await instance.getVoteCount(PROPOSAL_NAME_BYTES32);
            expect(voteCount).to.equal(1);

            await expect(
                instance.vote(PROPOSAL_NAME_BYTES32)
            ).to.be.revertedWith('already voted');
        });
    });
});
