const { network, run, ethers } = require('hardhat')
const { networkConfig, developmentChains } = require('../helper-hardhat-config')

const callbackGasLimit = '500000'

module.exports = async ({ getNamedAccounts, deployments }) => {
  const { deploy, log } = deployments
  const { deployer } = await getNamedAccounts()
  const chainID = network.config.chainId
  const entranceFee = networkConfig[chainID]['entranceFee']
  const gasLane = networkConfig[chainID]['gasLane']
  const keepersUpdateInterval = networkConfig[chainID]['keepersUpdateInterval']

  console.log('Deploying raffle-----------------------')

  // Check to see if your on the local network. -> If so get the VRV2 address that you deployed or get the one from the test net
  let vrfV2CoordinatorAddress, subscriptionId

  if (developmentChains.includes(network.name)) {
    const vrfV2CoordinatorMock = await ethers.getContract(
      'VRFCoordinatorV2Mock',
      deployer
    )
    vrfV2CoordinatorAddress = vrfV2CoordinatorMock.address
    // Create a subscription ID for the local newtwork
    const txRequest = await vrfV2CoordinatorMock.createSubscription()
    const txRecipt = await txRequest.wait(1)
    subscriptionId = txRecipt.events[0].args.subId
  } else {
    vrfV2CoordinatorAddress = networkConfig[chainID]['vrfV2CoordinatorAddress']
    subscriptionId = networkConfig[chainID]['subscriptionId']
  }

  const args = [
    entranceFee,
    vrfV2CoordinatorAddress,
    gasLane,
    subscriptionId,
    callbackGasLimit,
    keepersUpdateInterval,
  ]

  const raffle = await deploy('Raffle', {
    from: deployer,
    args: args,
    log: true,
    waitConfirmations: network.config.blockConfirmations || 6
  })

  log('------------------------------------------------')

  // verify on etherscan if not on local chain
  if (network.config.chainId !== 31337) {
    await verify(raffle.address)
  }
}

async function verify(contractAddress, args) {
  try {
    console.log('Verifying contract on etherscan.....................')
    await run('verify:verify', {
      address: contractAddress,
      arguments: args,
    })
  } catch (error) {
    if (error.message.includes('already verified')) {
      console.log('Contract was already verified')
    } else {
      console.log(error)
    }
  }
}

module.exports.tags = ['all', 'deploy']
