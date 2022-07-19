const { network, ethers } = require('hardhat')
const { developmentChains } = require('../helper-hardhat-config')

const BASE_FEE = ethers.utils.parseEther('0.25')
const GAS_PRICE_LINK = 1e9

module.exports = async ({ getNamedAccounts, deployments }) => {
  const { deploy, log } = deployments
  const { deployer } = await getNamedAccounts()

  //   Check if we are on the local network then allow to deploy the vrf V2 contract
  if (developmentChains.includes(network.name)) {
    log('Local network detected!')
    log('Deploying mocks.........')

    await deploy('VRFCoordinatorV2Mock', {
      from: deployer,
      args: [BASE_FEE, GAS_PRICE_LINK],
      log: true,
    })

    log('Mocks deployed successfully......')
    log(
      '------------------------------------------------------------------------'
    )
  }
}

module.exports.tags = ['all', 'mocks']
