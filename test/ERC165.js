const { expect } = require('chai');

const { ethers } = require('hardhat');
const hardhat = require('hardhat');

const shuffleArray = (array) => {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const temp = array[i];
        array[i] = array[j];
        array[j] = temp;
    }
};

async function callRightChallenge(
    _interface,
    metamorphicAddress,
    victim,
    attacker
) {
    let tx;
    if (_interface == '0x4e2312e0') {
        tx = await victim.connect(attacker).challenge1(metamorphicAddress);
    } else if (_interface == '0x88a7ca5c') {
        tx = await victim.connect(attacker).challenge2(metamorphicAddress);
    } else if (_interface == '0x13371337') {
        tx = await victim.connect(attacker).challenge3(metamorphicAddress);
    } else if (_interface == '0xdecafc0f') {
        tx = await victim.connect(attacker).challenge4(metamorphicAddress);
    }
    await tx.wait();
}

function getInitCode(_interface) {
    return `0x6066600c60003960666000f33660041460305759357f01ffc9a7${_interface.slice(
        2
    )}0000000000000000000000000000000000000000000000001434525934f35b33ff`;
}

async function doOneChallenge(
    _interface,
    metamorphicFactory,
    attacker,
    victim
) {
    const salt = attacker.address + '000000000000000000000000';
    const Factory = await ethers.getContractFactory(`ERC165Attacker1`);
    let tx = await attacker.sendTransaction({
        value: ethers.utils.parseEther('0'),
        data: getInitCode(_interface),
    });
    const implementationAddr = (await tx.wait()).contractAddress;
    const erc165Attacker = await Factory.deploy();
    await erc165Attacker.deployed();
    tx = await metamorphicFactory
        .connect(attacker)
        .deployMetamorphicContractFromExistingImplementation(
            salt,
            implementationAddr,
            '0x'
        );

    const metamorphicAddress =
        await metamorphicFactory.findMetamorphicContractAddress(salt);
    await callRightChallenge(_interface, metamorphicAddress, victim, attacker);
    const metamorphicContract = new ethers.Contract(
        metamorphicAddress,
        erc165Attacker.interface
    );

    tx = await metamorphicContract.connect(attacker).kill();
    await tx.wait();
}

// RULES
// - You may only use the attacker account
// - Multiple transactions allowed, but fewer makes you cooler
// - You may not modify the victim contract or anything it inherits from
// - You may not modify NFT or the parent contracts
// - You may not modify the tests, you may only write code in the specified block
// - You may not tamper with the javascript random number generator
// - You pass the challenge if you pass the test, but if you can
//   lower the GAS_LIMIT below 46, that makes you cooler

describe('ERC165Challenge', function () {
    this.beforeEach(async function () {
        await ethers.provider.send('hardhat_reset');
        [owner, attacker] = await ethers.getSigners();
        const AwardFactory = await ethers.getContractFactory('Award');
        const award = await AwardFactory.deploy();

        const order = [4, 3, 2, 1];
        this.challenges = [
            '0x4e2312e0',
            '0x88a7ca5c',
            '0x13371337',
            '0xdecafc0f',
        ];
        shuffleArray(order);

        const Factory = await ethers.getContractFactory('NFTGiver');
        this.order = order;
        const victim = await Factory.deploy(award.address, this.order);

        this.victim = victim;
        this.attacker = attacker;
        this.award = award;
        award.transferFrom(owner.address, victim.address, 1337);
    });

    [1, 2, 3, 4, 5, 6, 7].forEach(function (round) {
        it(`Hack Round ${round}`, async function () {
            const FactoryFactory = await ethers.getContractFactory(
                'MetamorphicContractFactory'
            );

            const metamorphicFactory = await FactoryFactory.deploy('0x');

            for (let i = 3; i >= 0; i--) {
                await doOneChallenge(
                    this.challenges[this.order[i] - 1],
                    metamorphicFactory,
                    this.attacker,
                    this.victim
                );
            }
            const salt = this.attacker.address + '000000000000000000000000';
            const erc165AttackerAddress =
                await metamorphicFactory.findMetamorphicContractAddress(salt);
            await this.victim
                .connect(this.attacker)
                .success(erc165AttackerAddress);
        });
    });

    this.afterEach(async function () {
        expect(await this.award.ownerOf(1337)).to.be.equal(
            this.attacker.address
        );
    });

    this.afterAll(async function () {
        const limitUsed = await this.victim.GAS_LIMIT();
        const numTxns = await ethers.provider.getTransactionCount(
            attacker.address
        );
        console.log(`\nGas limit used: ${limitUsed}`);
        console.log(`Number of Transactions: ${numTxns}`);
    });
});

// Optimized version:
// 3660041460305759357f83a1c22e4e2312e00000000000000000000000000000000000000000000000001434525934f35b33ff000000000000000000

// the strategy is to use a metamorphic contract to adapt the bytecode to the challenge.
// Final gas: 44

// DEPLOYMENT:
// deployment:
//    -- init code  --                                     -- execution code --
// 6066600c60003960666000 f33660041460305759357f01ffc9a74e2312e00000000000000000000000000000000000000000000000001434525934f35b33ff

// execution code explanation:
// CALLDATASIZE
// PUSH1 0x04
// EQ // Here we are checking if the calldatasize is for byte long. If so it means we want to destruct the contract, thus we will jump to byte 30
// PUSH1 0x30
// JUMPI
// MSIZE // if we are not trying to kill the contract, then the function supportsInterface is called.
// CALLDATALOAD
// PUSH32 0x01ffc9a74e2312e0000000000000000000000000000000000000000000000000
// EQ //We now have to make sure we answer the right response. We compare the calldata to our desired interface and we return the result of the comparison.
// CALLVALUE
// MSTORE
// MSIZE
// CALLVALUE
// RETURN
// JUMPDEST
// CALLER
// SELFDESTRUCT

// Not working version:
// 3660008037366009 f33660041460305759357f83a1c22e4e2312e00000000000000000000000000000000000000000000000001434525934f35b33ff
