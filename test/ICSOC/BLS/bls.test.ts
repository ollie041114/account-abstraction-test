import { aggregate, BlsSignerFactory, BlsVerifier } from '@thehubbleproject/bls/dist/signer'
import { arrayify, defaultAbiCoder, hexConcat } from 'ethers/lib/utils';

import {
    CustomBLS,
    CustomBLS__factory,
    
} from '../../../typechain-types' // Replace with the correct import path for CustomBLSSignatureAggregator and CustomBLSSignatureAggregator__factory
import {    BLSOpen__factory } from "../../../typechain";
import { ethers } from 'hardhat'
import { createAddress, fund, ONE_ETH } from '../../testutils' // Assume these utils functions are available in the testutils file
import { expect } from 'chai'
import { keccak256 } from 'ethereumjs-util'
import { hashToPoint } from '@thehubbleproject/bls/dist/mcl'
import { BigNumber } from 'ethers';

describe('CustomBLS Signature Aggregator', function () {
  this.timeout(20000)
  const BLS_DOMAIN = arrayify(keccak256(Buffer.from('eip4337.bls.domain')))
  const etherSigner = ethers.provider.getSigner()
  let fact: BlsSignerFactory
  let signer1: any
  let signer2: any
  let customBlsAgg: CustomBLS

  before(async () => {
    const BLSOpenLib = await new BLSOpen__factory(ethers.provider.getSigner()).deploy()
    const customBLSAggregatorFactory = new CustomBLS__factory({
        'contracts/samples/bls/lib/BLSOpen.sol:BLSOpen': BLSOpenLib.address
      }, ethers.provider.getSigner())

    customBlsAgg = await customBLSAggregatorFactory.deploy()

    fact = await BlsSignerFactory.new()
    signer1 = fact.getSigner(arrayify(BLS_DOMAIN), '0x01')
    signer2 = fact.getSigner(arrayify(BLS_DOMAIN), '0x02')
  })

  it('#aggregateSignatures', async () => {
    const sig1 = signer1.sign('0x1234')
    const sig2 = signer2.sign('0x5678')
    const offChainSigResult = hexConcat(aggregate([sig1, sig2]))

    const solidityAggResult = await customBlsAgg.aggregateSignatures([hexConcat(sig1), hexConcat(sig2)])
    expect(solidityAggResult).to.equal(offChainSigResult)
  })

  it('validateSignatures', async function () {
    this.timeout(30000)
    const requestHash1 = '0x1234';
    const sig1 = signer1.sign(requestHash1)
    const requestHash2 = '0x5678';
    const sig2 = signer2.sign(requestHash2)

    const aggSig = aggregate([sig1, sig2])
    const aggregatedSig = await customBlsAgg.aggregateSignatures([hexConcat(sig1), hexConcat(sig2)])
    expect(hexConcat(aggSig)).to.equal(aggregatedSig)

    const pubkeys = [
      signer1.pubkey,
      signer2.pubkey
    ]

    const verifier = new BlsVerifier(BLS_DOMAIN)
    // off-chain check
    const now = Date.now()
    console.log(verifier.verifyMultiple(aggSig, pubkeys, [requestHash1, requestHash2]));
    expect(verifier.verifyMultiple(aggSig, pubkeys, [requestHash1, requestHash2])).to.equal(true)
    console.log('verifyMultiple (mcl code)', Date.now() - now, 'ms')
    const now2 = Date.now()

    const messagesArray = [
      requestHash1,
      requestHash2
    ].map(hash => {
      const point = hashToPoint(hash, BLS_DOMAIN)
      return [(point.getX().getStr()), (point.getY().getStr())]
    });

    console.log('validateSignatures gas= ', await customBlsAgg.estimateGas.validateSignatures(pubkeys, messagesArray, aggregatedSig))
    console.log('validateSignatures (on-chain)', Date.now() - now2, 'ms')
  })

  it('validateSignatures for 10 signatures and 10 hashes', async function () {
    this.timeout(6000000) // You may need to increase the timeout since the test might take longer to run
    const number = 20;
    const signers = Array.from({ length: number }, (_, i) => fact.getSigner(arrayify(BLS_DOMAIN), `0x0${i + 1}`));
    const pubkeys = signers.map(signer => signer.pubkey);
    const hashes = Array.from({ length: number }, (_, i) => `0x${Math.min((i + 1), 9)}000`);
  
    const sigs = signers.map((signer, i) => signer.sign(hashes[i]));
  
    const messagesArray = hashes.map(hash => {
      const point = hashToPoint(hash, BLS_DOMAIN);
      return [BigNumber.from(point.getX().getStr()), BigNumber.from(point.getY().getStr())];
    });
  
    const aggregator = aggregate(sigs);
    const aggregatedSig = await customBlsAgg.aggregateSignatures(sigs.map(sig => hexConcat(sig)));
    expect(hexConcat(aggregator)).to.equal(aggregatedSig);
  
    // const verifier = new BlsVerifier(BLS_DOMAIN);
  
    // const now = Date.now();
    // expect(verifier.verifyMultiple(aggregator, pubkeys, messagesArray)).to.equal(true);
    // console.log('verifyMultiple (mcl code) for 10 signatures and 10 hashes', Date.now() - now, 'ms');
  
    const now2 = Date.now();
    console.log('validateSignatures gas= ', await customBlsAgg.estimateGas.validateSignatures(pubkeys, messagesArray, aggregatedSig)/number);
    console.log('validateSignatures (on-chain) for 10 signatures and 10 hashes', Date.now() - now2, 'ms');
  })
})