const { getNamedAccounts, deployments, ethers } = require('hardhat')
const { assert, expect } = require('chai')

describe('Raffle', function () {
  let raffle, deployer
  beforeEach(async function () {
    deployer = (await getNamedAccounts()).deployer
    const contract = await deployments.fixture(['all'])
    // raffle = await contract.address;
    raffle = await ethers.getContract('Raffle')
  })

  describe('Constructor', function () {
    it('Should set the entrance fee to 0.10', async function () {
      const fee = await raffle.getEntranceFee()
      const expectedFee = ethers.utils.parseEther('0.10')
      assert.equal(fee.toString(), expectedFee)
    })
  })

  describe('enterRaffle', function () {
    it('Should revert when not enouth ETH is entered', async function () {
      let littleEth = ethers.utils.parseEther('0.00005')

      await expect(
        raffle.enterRaffle({
          value: littleEth,
          from: deployer,
        })
      ).to.be.revertedWith('Raffle__NotEnoughETHEntered')
    })

    it('Should successfully add a user', async function () {
      let enoughEth = ethers.utils.parseEther('0.10')
      const { deployer } = await getNamedAccounts()
      const tx = await raffle.enterRaffle({
        value: enoughEth,
        from: deployer,
      })
      await tx.wait(1)

      const enteredUser = await raffle.getPlayer(0)

      assert.equal(enteredUser, deployer)
    })
  })
})
